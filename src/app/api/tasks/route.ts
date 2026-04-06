import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Ensure tables exist
async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS pme_tasks (
      id SERIAL PRIMARY KEY,
      service_id TEXT NOT NULL,
      title TEXT NOT NULL,
      section TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'launch',
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      completed_at BIGINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pme_task_history (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      from_value TEXT,
      to_value TEXT,
      note TEXT,
      performed_by TEXT DEFAULT 'النظام',
      performed_at BIGINT NOT NULL
    )
  `;
}

// GET: list tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    await ensureTables();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const phase = searchParams.get("phase");
    const section = searchParams.get("section");
    const search = searchParams.get("search");
    const action = searchParams.get("action");

    // Stats endpoint
    if (action === "stats") {
      const tasks = await sql`SELECT * FROM pme_tasks ORDER BY sort_order`;
      const total = tasks.length;
      const pending = tasks.filter((t: any) => t.status === "pending").length;
      const inProgress = tasks.filter((t: any) => t.status === "in_progress").length;
      const completed = tasks.filter((t: any) => t.status === "completed").length;
      const deferred = tasks.filter((t: any) => t.status === "deferred").length;
      const launchTotal = tasks.filter((t: any) => t.phase === "launch").length;
      const postLaunchTotal = tasks.filter((t: any) => t.phase === "post_launch").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const sectionMap = new Map<string, any>();
      for (const t of tasks as any[]) {
        if (!sectionMap.has(t.section)) {
          sectionMap.set(t.section, { total: 0, completed: 0, inProgress: 0, pending: 0, deferred: 0 });
        }
        const s = sectionMap.get(t.section)!;
        s.total++;
        if (t.status === "completed") s.completed++;
        else if (t.status === "in_progress") s.inProgress++;
        else if (t.status === "deferred") s.deferred++;
        else s.pending++;
      }
      const sections = Array.from(sectionMap.entries()).map(([name, stats]) => ({
        name,
        ...stats,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }));

      return NextResponse.json({ total, pending, inProgress, completed, deferred, launchTotal, postLaunchTotal, completionRate, sections });
    }

    // Sections list
    if (action === "sections") {
      const result = await sql`SELECT DISTINCT section FROM pme_tasks ORDER BY section`;
      return NextResponse.json(result.map((r: any) => r.section));
    }

    // Single task detail
    if (action === "detail") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const tasks = await sql`SELECT * FROM pme_tasks WHERE id = ${parseInt(id)}`;
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const history = await sql`SELECT * FROM pme_task_history WHERE task_id = ${parseInt(id)} ORDER BY performed_at DESC`;
      return NextResponse.json({ task: tasks[0], history });
    }

    // Build dynamic query
    let tasks;
    if (status && phase && section && search) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE status = ${status} AND phase = ${phase} AND section = ${section} AND title ILIKE ${'%' + search + '%'} ORDER BY sort_order`;
    } else if (status && phase && section) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE status = ${status} AND phase = ${phase} AND section = ${section} ORDER BY sort_order`;
    } else if (status && phase) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE status = ${status} AND phase = ${phase} ORDER BY sort_order`;
    } else if (status && section) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE status = ${status} AND section = ${section} ORDER BY sort_order`;
    } else if (phase && section) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE phase = ${phase} AND section = ${section} ORDER BY sort_order`;
    } else if (status) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE status = ${status} ORDER BY sort_order`;
    } else if (phase) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE phase = ${phase} ORDER BY sort_order`;
    } else if (section) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE section = ${section} ORDER BY sort_order`;
    } else if (search) {
      tasks = await sql`SELECT * FROM pme_tasks WHERE title ILIKE ${'%' + search + '%'} ORDER BY sort_order`;
    } else {
      tasks = await sql`SELECT * FROM pme_tasks ORDER BY sort_order`;
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks fetch error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

// POST: update task status/phase/note, or seed data
export async function POST(request: NextRequest) {
  try {
    const sql = getDb();
    await ensureTables();

    const body = await request.json();
    const { action } = body;

    if (action === "updateStatus") {
      const { taskId, status } = body;
      const tasks = await sql`SELECT * FROM pme_tasks WHERE id = ${taskId}`;
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const task = tasks[0] as any;
      const oldStatus = task.status;
      const now = Date.now();
      const completedAt = status === "completed" ? now : null;

      await sql`UPDATE pme_tasks SET status = ${status}, completed_at = ${completedAt} WHERE id = ${taskId}`;
      await sql`INSERT INTO pme_task_history (task_id, action, from_value, to_value, performed_by, performed_at) VALUES (${taskId}, 'status_change', ${oldStatus}, ${status}, ${body.performedBy || 'مستخدم'}, ${now})`;

      return NextResponse.json({ ...task, status, completedAt });
    }

    if (action === "updatePhase") {
      const { taskId, phase } = body;
      const tasks = await sql`SELECT * FROM pme_tasks WHERE id = ${taskId}`;
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const task = tasks[0] as any;
      const oldPhase = task.phase;
      const now = Date.now();

      await sql`UPDATE pme_tasks SET phase = ${phase} WHERE id = ${taskId}`;
      await sql`INSERT INTO pme_task_history (task_id, action, from_value, to_value, performed_by, performed_at) VALUES (${taskId}, 'phase_change', ${oldPhase}, ${phase}, ${body.performedBy || 'مستخدم'}, ${now})`;

      return NextResponse.json({ ...task, phase });
    }

    if (action === "addNote") {
      const { taskId, note } = body;
      const tasks = await sql`SELECT * FROM pme_tasks WHERE id = ${taskId}`;
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const task = tasks[0] as any;
      const now = Date.now();

      await sql`UPDATE pme_tasks SET notes = ${note} WHERE id = ${taskId}`;
      await sql`INSERT INTO pme_task_history (task_id, action, from_value, to_value, note, performed_by, performed_at) VALUES (${taskId}, 'note_added', ${null}, ${note.substring(0, 100)}, ${note}, ${body.performedBy || 'مستخدم'}, ${now})`;

      return NextResponse.json({ ...task, notes: note });
    }

    if (action === "undo") {
      const { taskId } = body;
      const history = await sql`SELECT * FROM pme_task_history WHERE task_id = ${taskId} ORDER BY performed_at DESC LIMIT 1`;
      if (history.length === 0) return NextResponse.json({ error: "لا يوجد إجراء للتراجع عنه" }, { status: 400 });

      const lastAction = history[0] as any;
      if (lastAction.action === "status_change" && lastAction.from_value) {
        const completedAt = lastAction.from_value === "completed" ? Date.now() : null;
        await sql`UPDATE pme_tasks SET status = ${lastAction.from_value}, completed_at = ${completedAt} WHERE id = ${taskId}`;
      } else if (lastAction.action === "phase_change" && lastAction.from_value) {
        await sql`UPDATE pme_tasks SET phase = ${lastAction.from_value} WHERE id = ${taskId}`;
      }
      await sql`DELETE FROM pme_task_history WHERE id = ${lastAction.id}`;

      const updated = await sql`SELECT * FROM pme_tasks WHERE id = ${taskId}`;
      return NextResponse.json(updated[0]);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Tasks action error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
