import { NextRequest, NextResponse } from "next/server";
import { runRemoteOkIngestion } from "@/lib/ingestion/pipeline-remoteok";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingestion-secret");
  const expectedSecret = process.env.INGESTION_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await runRemoteOkIngestion();

    return NextResponse.json({
      success: true,
      source: "Remote OK",
      result,
    });
  } catch (error) {
    console.error("Remote OK ingestion failed:", error);

    return NextResponse.json(
      {
        success: false,
        source: "Remote OK",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ingestion error",
      },
      { status: 500 }
    );
  }
}