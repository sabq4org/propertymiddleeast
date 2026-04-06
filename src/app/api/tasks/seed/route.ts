import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { servicesData } from "@/lib/services-data";

// The original selections from Ahmad Bedaewi's submission
const postLaunchServiceIds = new Set([
  "s18", // متابعة الكُتّاب والمراسلين
  "s21", // نظام التعليقات على الأخبار
  "s45", // بيان إمكانية الوصول
  "s46", // صفحة المطورين
  "s82", // طلبات المراسلين — مراجعة وقبول/رفض
  "s83", // طلبات كُتّاب الرأي — فحص واعتماد
  "s84", // إدارة الناشرين الخارجيين
  "s101", // فحص التعليقات لكشف المحتوى المسيء
  "s102", // تصفية تلقائية مع مراجعة يدوية
]);

// Services that were NOT selected at all (neither launch nor post-launch)
const notSelectedIds = new Set([
  "s36", "s37", "s38",
]);

export async function POST() {
  try {
    const sql = getDb();

    // Create tables
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

    // Check if already seeded
    const existing = await sql`SELECT COUNT(*) as count FROM pme_tasks`;
    if (parseInt(existing[0].count) > 0) {
      return NextResponse.json({ message: "البيانات موجودة مسبقاً", count: parseInt(existing[0].count) });
    }

    let sortOrder = 0;
    for (const section of servicesData) {
      for (const sub of section.subsections) {
        for (const service of sub.services) {
          if (notSelectedIds.has(service.id)) continue;

          const phase = postLaunchServiceIds.has(service.id) ? "post_launch" : "launch";
          const sectionTitle = `${section.title} — ${sub.title}`;

          await sql`
            INSERT INTO pme_tasks (service_id, title, section, phase, status, sort_order)
            VALUES (${service.id}, ${service.name}, ${sectionTitle}, ${phase}, 'pending', ${sortOrder})
          `;
          sortOrder++;
        }
      }
    }

    return NextResponse.json({ success: true, count: sortOrder });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إدخال البيانات" }, { status: 500 });
  }
}
