import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Ensure tables exist
async function ensureTables() {
  await query(`
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
  `);
  await query(`
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
  `);
}

// GET: list tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    await ensureTables();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const phase = searchParams.get("phase");
    const section = searchParams.get("section");
    const search = searchParams.get("search");
    const action = searchParams.get("action");

    // Stats endpoint
    if (action === "stats") {
      const tasks = await query("SELECT * FROM pme_tasks ORDER BY sort_order");
      const total = tasks.length;
      const pending = tasks.filter((t) => t.status === "pending").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const completed = tasks.filter((t) => t.status === "completed").length;
      const deferred = tasks.filter((t) => t.status === "deferred").length;
      const launchTotal = tasks.filter((t) => t.phase === "launch").length;
      const postLaunchTotal = tasks.filter((t) => t.phase === "post_launch").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const sectionMap = new Map<string, { total: number; completed: number; inProgress: number; pending: number; deferred: number }>();
      for (const t of tasks) {
        const sec = t.section as string;
        if (!sectionMap.has(sec)) {
          sectionMap.set(sec, { total: 0, completed: 0, inProgress: 0, pending: 0, deferred: 0 });
        }
        const s = sectionMap.get(sec)!;
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
      const result = await query("SELECT DISTINCT section FROM pme_tasks ORDER BY section");
      return NextResponse.json(result.map((r) => r.section));
    }

    // Single task detail
    if (action === "detail") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const tasks = await query("SELECT * FROM pme_tasks WHERE id = $1", [parseInt(id)]);
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const history = await query("SELECT * FROM pme_task_history WHERE task_id = $1 ORDER BY performed_at DESC", [parseInt(id)]);
      return NextResponse.json({ task: tasks[0], history });
    }

    // Build dynamic query with parameterized queries
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (phase) {
      conditions.push(`phase = $${paramIndex++}`);
      params.push(phase);
    }
    if (section) {
      conditions.push(`section = $${paramIndex++}`);
      params.push(section);
    }
    if (search) {
      conditions.push(`title ILIKE $${paramIndex++}`);
      params.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const tasks = await query(`SELECT * FROM pme_tasks ${where} ORDER BY sort_order`, params);

    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Tasks fetch error:", errMsg);
    return NextResponse.json({ error: "حدث خطأ", detail: errMsg }, { status: 500 });
  }
}

// POST: update task status/phase/note
export async function POST(request: NextRequest) {
  try {
    await ensureTables();

    const body = await request.json();
    const { action } = body;

    if (action === "updateStatus") {
      const { taskId, status } = body;
      const tasks = await query("SELECT * FROM pme_tasks WHERE id = $1", [taskId]);
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const task = tasks[0];
      const oldStatus = task.status;
      const now = Date.now();
      const completedAt = status === "completed" ? now : null;

      await query("UPDATE pme_tasks SET status = $1, completed_at = $2 WHERE id = $3", [status, completedAt, taskId]);
      await query("INSERT INTO pme_task_history (task_id, action, from_value, to_value, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5, $6)", [taskId, "status_change", oldStatus, status, body.performedBy || "مستخدم", now]);

      return NextResponse.json({ ...task, status, completed_at: completedAt });
    }

    if (action === "updatePhase") {
      const { taskId, phase } = body;
      const tasks = await query("SELECT * FROM pme_tasks WHERE id = $1", [taskId]);
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const task = tasks[0];
      const oldPhase = task.phase;
      const now = Date.now();

      await query("UPDATE pme_tasks SET phase = $1 WHERE id = $2", [phase, taskId]);
      await query("INSERT INTO pme_task_history (task_id, action, from_value, to_value, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5, $6)", [taskId, "phase_change", oldPhase, phase, body.performedBy || "مستخدم", now]);

      return NextResponse.json({ ...task, phase });
    }

    if (action === "addNote") {
      const { taskId, note } = body;
      const tasks = await query("SELECT * FROM pme_tasks WHERE id = $1", [taskId]);
      if (tasks.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      const task = tasks[0];
      const now = Date.now();

      await query("UPDATE pme_tasks SET notes = $1 WHERE id = $2", [note, taskId]);
      await query("INSERT INTO pme_task_history (task_id, action, from_value, to_value, note, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5, $6, $7)", [taskId, "note_added", null, (note as string).substring(0, 100), note, body.performedBy || "مستخدم", now]);

      return NextResponse.json({ ...task, notes: note });
    }

    if (action === "undo") {
      const { taskId } = body;
      const history = await query("SELECT * FROM pme_task_history WHERE task_id = $1 ORDER BY performed_at DESC LIMIT 1", [taskId]);
      if (history.length === 0) return NextResponse.json({ error: "لا يوجد إجراء للتراجع عنه" }, { status: 400 });

      const lastAction = history[0];
      if (lastAction.action === "status_change" && lastAction.from_value) {
        const completedAt = lastAction.from_value === "completed" ? Date.now() : null;
        await query("UPDATE pme_tasks SET status = $1, completed_at = $2 WHERE id = $3", [lastAction.from_value, completedAt, taskId]);
      } else if (lastAction.action === "phase_change" && lastAction.from_value) {
        await query("UPDATE pme_tasks SET phase = $1 WHERE id = $2", [lastAction.from_value, taskId]);
      }
      await query("DELETE FROM pme_task_history WHERE id = $1", [lastAction.id]);

      const updated = await query("SELECT * FROM pme_tasks WHERE id = $1", [taskId]);
      return NextResponse.json(updated[0]);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Tasks action error:", errMsg);
    return NextResponse.json({ error: "حدث خطأ", detail: errMsg }, { status: 500 });
  }
}
