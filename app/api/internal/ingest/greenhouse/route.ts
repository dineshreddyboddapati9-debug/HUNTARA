import { NextRequest, NextResponse } from "next/server";
import { runGreenhouseIngestion } from "@/lib/ingestion/pipeline-greenhouse";
import { GREENHOUSE_COMPANIES } from "@/lib/ingestion/greenhouse-companies";

export async function POST(
  request: NextRequest
) {
  try {
    const configuredSecret =
      process.env.INGESTION_SECRET;

    if (!configuredSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "INGESTION_SECRET is not configured.",
        },
        { status: 500 }
      );
    }

    const requestSecret =
      request.headers.get("x-ingestion-secret");

    if (
      !requestSecret ||
      requestSecret !== configuredSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const results = [];

    for (const company of GREENHOUSE_COMPANIES) {
      try {
        const result =
          await runGreenhouseIngestion(
            company.boardToken,
            company.companyName
          );

        results.push({
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          success: false,
          company: company.companyName,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error.",
        });
      }
    }

    const hasErrors = results.some(
      (result) => result.success === false
    );

    return NextResponse.json(
      {
        success: !hasErrors,
        results,
      },
      {
        status: hasErrors ? 207 : 200,
      }
    );
  } catch (error) {
    console.error(
      "Greenhouse ingestion failed:",
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