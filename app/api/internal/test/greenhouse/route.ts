import { NextResponse } from "next/server";
import { runGreenhouseIngestion } from "@/lib/ingestion/pipeline-greenhouse";

export async function POST() {
  try {
    const result = await runGreenhouseIngestion(
      "techgrovebybanyansoftware",
      "TechGrove by Banyan Software"
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Greenhouse ingestion test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error.",
      },
      { status: 500 }
    );
  }
}