import { NextRequest, NextResponse } from "next/server";
import { runArbeitnowIngestion } from "@/lib/ingestion/pipeline";

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get("x-ingestion-secret");
  const expectedSecret = process.env.INGESTION_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error: "INGESTION_SECRET is not configured.",
      },
      { status: 500 }
    );
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const result = await runArbeitnowIngestion();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Arbeitnow ingestion failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown ingestion error.",
      },
      { status: 500 }
    );
  }
}