import { NextResponse } from "next/server";

import { getMlServiceUrl } from "@/lib/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const response = await fetch(`${getMlServiceUrl()}/demo/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ detail: "ML service unavailable" }, { status: 503 });
  }
}
