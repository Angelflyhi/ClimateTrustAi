import { NextResponse } from "next/server";

import { getMlServiceUrl } from "@/lib/config";

export async function GET() {
  try {
    const response = await fetch(`${getMlServiceUrl()}/demos`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { detail: "ML service unavailable. Start it with: uvicorn main:app --reload --port 8000" },
      { status: 503 },
    );
  }
}
