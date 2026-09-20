import { NextRequest, NextResponse } from "next/server";
import { runJobicyIngestion } from "@/lib/ingestion/pipeline-jobicy";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingestion-secret");
  const expectedSecret = process.env.INGESTION_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const result = await runJobicyIngestion();

    return NextResponse.json({
      success: true,
      source: "Jobicy",
      result,
    });
  } catch (error) {
    console.error("Jobicy ingestion failed:", error);

    return NextResponse.json(
      {
        success: false,
        source: "Jobicy",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ingestion error",
      },
      {
        status: 500,
      }
    );
  }
}