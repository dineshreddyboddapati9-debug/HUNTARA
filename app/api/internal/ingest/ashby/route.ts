import { NextRequest, NextResponse } from "next/server";
import { runAshbyIngestion } from "@/lib/ingestion/pipeline-ashby";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.INGESTION_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "INGESTION_SECRET is not configured",
      },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get("x-ingestion-secret");

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const result = await runAshbyIngestion();

    return NextResponse.json({
      success: true,
      source: "Ashby",
      result,
    });
  } catch (error) {
    console.error("Ashby ingestion failed:", error);

    return NextResponse.json(
      {
        success: false,
        source: "Ashby",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ingestion error",
      },
      { status: 500 }
    );
  }
}