import { NextResponse } from "next/server";

export async function GET(request) {
  // Check authorization header if Vercel Cron Secret is configured
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  const qdrantApiKey = process.env.QDRANT_API_KEY || "";
  const qdrantHeaders = { "Content-Type": "application/json" };
  if (qdrantApiKey) {
    qdrantHeaders["api-key"] = qdrantApiKey;
  }

  try {
    const res = await fetch(`${qdrantUrl}/collections`, {
      method: "GET",
      headers: qdrantHeaders,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Qdrant collections endpoint returned status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      message: "Qdrant pinged successfully",
      collections: data.result?.collections?.map(c => c.name) || [],
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e.message,
    }, { status: 500 });
  }
}
