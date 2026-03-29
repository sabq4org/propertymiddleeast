import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      submitterName,
      selections,
      launchSuggestions,
      postLaunchSuggestions,
      otherNotes,
    } = body;

    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS sabq_submissions (
        id SERIAL PRIMARY KEY,
        submitter_name TEXT NOT NULL,
        selections JSONB NOT NULL,
        launch_suggestions TEXT,
        post_launch_suggestions TEXT,
        other_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const result = await sql`
      INSERT INTO sabq_submissions (submitter_name, selections, launch_suggestions, post_launch_suggestions, other_notes)
      VALUES (${submitterName}, ${JSON.stringify(selections)}, ${launchSuggestions}, ${postLaunchSuggestions}, ${otherNotes})
      RETURNING id, created_at
    `;

    return NextResponse.json({
      success: true,
      id: result[0].id,
      createdAt: result[0].created_at,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حفظ البيانات" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS sabq_submissions (
        id SERIAL PRIMARY KEY,
        submitter_name TEXT NOT NULL,
        selections JSONB NOT NULL,
        launch_suggestions TEXT,
        post_launch_suggestions TEXT,
        other_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const submissions = await sql`
      SELECT * FROM sabq_submissions ORDER BY created_at DESC
    `;

    return NextResponse.json({ success: true, data: submissions });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    );
  }
}
