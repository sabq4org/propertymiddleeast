import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { servicesData } from "@/lib/services-data";

// The original selections from Ahmad Bedaewi's submission - post-launch services
const postLaunchServiceNames = new Set([
  "متابعة الكُتّاب والمراسلين",
  "نظام التعليقات على الأخبار",
  "بيان إمكانية الوصول",
  "صفحة المطورين",
  "طلبات المراسلين — مراجعة وقبول/رفض",
  "طلبات كُتّاب الرأي — فحص واعتماد",
  "إدارة الناشرين الخارجيين",
  "فحص التعليقات لكشف المحتوى المسيء",
  "تصفية تلقائية مع مراجعة يدوية",
]);

// Services not selected at all
const notSelectedNames = new Set([
  "المساعد الصوتي",
  "الروابط الذكية",
]);

export async function POST() {
  try {
    // Create tables
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

    // Check if already seeded
    const existing = await query("SELECT COUNT(*)::int as count FROM pme_tasks");
    const existingCount = Number(existing[0].count);
    if (existingCount > 0) {
      return NextResponse.json({ message: `البيانات موجودة مسبقاً (${existingCount} مهمة)`, count: existingCount });
    }

    let sortOrder = 0;

    for (const section of servicesData) {
      for (const sub of section.subsections) {
        for (const service of sub.services) {
          if (notSelectedNames.has(service.name)) continue;

          const phase = postLaunchServiceNames.has(service.name) ? "post_launch" : "launch";
          const sectionTitle = `${section.title} — ${sub.title}`;

          await query(
            "INSERT INTO pme_tasks (service_id, title, section, phase, status, sort_order) VALUES ($1, $2, $3, $4, $5, $6)",
            [service.id, service.name, sectionTitle, phase, "pending", sortOrder]
          );
          sortOrder++;
        }
      }
    }

    return NextResponse.json({ success: true, count: sortOrder, message: `تم إدخال ${sortOrder} مهمة بنجاح` });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Seed error:", errMsg);
    return NextResponse.json({ error: "حدث خطأ أثناء إدخال البيانات", detail: errMsg }, { status: 500 });
  }
}
