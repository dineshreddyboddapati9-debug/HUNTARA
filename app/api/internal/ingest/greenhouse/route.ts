import { NextRequest, NextResponse } from "next/server";
import { runGreenhouseIngestion } from "@/lib/ingestion/pipeline-greenhouse";
import { GREENHOUSE_COMPANIES } from "@/lib/ingestion/greenhouse-companies";

const COMPANY_BATCH_SIZE = 3;

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.INGESTION_SECRET;

    if (!configuredSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "INGESTION_SECRET is not configured.",
        },
        { status: 500 }
      );
    }

    const requestSecret = request.headers.get("x-ingestion-secret");

    if (!requestSecret || requestSecret !== configuredSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const results = [];

    for (
      let start = 0;
      start < GREENHOUSE_COMPANIES.length;
      start += COMPANY_BATCH_SIZE
    ) {
      const companyBatch = GREENHOUSE_COMPANIES.slice(
        start,
        start + COMPANY_BATCH_SIZE
      );

      const batchResults = await Promise.all(
        companyBatch.map(async (company) => {
          try {
            const result = await runGreenhouseIngestion(
              company.boardToken,
              company.companyName
            );

            return {
              success: true,
              ...result,
            };
          } catch (error) {
            return {
              success: false,
              company: company.companyName,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown error.",
            };
          }
        })
      );

      results.push(...batchResults);
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
    console.error("Greenhouse ingestion failed:", error);

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