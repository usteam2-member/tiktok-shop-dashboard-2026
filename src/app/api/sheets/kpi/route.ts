import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      message: "KPI API is working!",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
