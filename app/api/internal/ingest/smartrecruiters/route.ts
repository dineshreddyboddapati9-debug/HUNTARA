import { NextRequest, NextResponse } from "next/server";
import { runSmartRecruitersIngestion } from "@/lib/ingestion/pipeline-smartrecruiters";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.INGESTION_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error: "INGESTION_SECRET is not configured.",
      },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get("x-ingestion-secret");

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const result = await runSmartRecruitersIngestion();

    return NextResponse.json({
      success: true,
      source: "SmartRecruiters",
      result,
    });
  } catch (error) {
    console.error("SmartRecruiters ingestion failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}