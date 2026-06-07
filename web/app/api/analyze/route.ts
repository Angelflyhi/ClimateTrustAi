import { NextResponse } from "next/server";

import { getMlServiceUrl } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const form = new FormData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
    }

    form.append("file", file);
    form.append("sensor_name", String(incoming.get("sensor_name") ?? "Uploaded Sensor"));
    form.append("latitude", String(incoming.get("latitude") ?? "28.6139"));
    form.append("longitude", String(incoming.get("longitude") ?? "77.2090"));
    form.append("use_open_meteo", String(incoming.get("use_open_meteo") ?? "true"));

    const response = await fetch(`${getMlServiceUrl()}/analyze`, {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ detail: "ML service unavailable" }, { status: 503 });
  }
}
