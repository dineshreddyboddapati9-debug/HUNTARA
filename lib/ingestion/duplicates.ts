import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedJob } from "./normalize";

export interface DuplicateResult {
  existingJobId: string | null;
  sourceRecordId: string | null;
  isExistingSourceRecord: boolean;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const first = normalizeText(a);
  const second = normalizeText(b);

  if (first === second) {
    return 1;
  }

  const firstWords = new Set(first.split(" "));
  const secondWords = new Set(second.split(" "));

  const intersection = [...firstWords].filter((word) =>
    secondWords.has(word)
  );

  const union = new Set([...firstWords, ...secondWords]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.length / union.size;
}

export async function findDuplicateJob(
  supabase: SupabaseClient,
  job: NormalizedJob,
  companyId: string
): Promise<DuplicateResult> {
  // 1. Check whether this exact source job was already imported.
  const { data: sourceRecord, error: sourceRecordError } =
    await supabase
      .from("job_source_records")
      .select("id, job_id")
      .eq("source_id", job.sourceId)
      .eq("external_job_id", job.sourceJobId)
      .maybeSingle();

  if (sourceRecordError) {
    throw new Error(
      `Failed to check source record: ${sourceRecordError.message}`
    );
  }

  if (sourceRecord) {
    return {
      existingJobId: sourceRecord.job_id,
      sourceRecordId: sourceRecord.id,
      isExistingSourceRecord: true,
    };
  }

  // 2. If there is no publication date, skip cross-source duplicate matching.
  if (!job.publishedAt) {
    return {
      existingJobId: null,
      sourceRecordId: null,
      isExistingSourceRecord: false,
    };
  }

  const publishedTime = new Date(job.publishedAt).getTime();

  // 3. Look for jobs from the same company within +/- 14 days.
  const windowStart = new Date(
    publishedTime - 14 * 24 * 60 * 60 * 1000
  ).toISOString();

  const windowEnd = new Date(
    publishedTime + 14 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: candidates, error: candidateError } =
    await supabase
      .from("jobs")
      .select("id, title, published_at")
      .eq("company_id", companyId)
      .gte("published_at", windowStart)
      .lte("published_at", windowEnd)
      .limit(50);

  if (candidateError) {
    throw new Error(
      `Failed to find duplicate candidates: ${candidateError.message}`
    );
  }

  // 4. Compare titles.
  const matchingCandidate = candidates?.find(
    (candidate) =>
      similarity(job.title, candidate.title) >= 0.75
  );

  return {
    existingJobId: matchingCandidate?.id ?? null,
    sourceRecordId: null,
    isExistingSourceRecord: false,
  };
}