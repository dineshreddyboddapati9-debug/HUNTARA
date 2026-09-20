import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchRemoteOkJobs } from "./adapters/remoteok";
import { normalizeRemoteOkJob } from "./normalize-remoteok";
import { findOrCreateCompany } from "./companies";
import { findDuplicateJob } from "./duplicates";
import { expireMissingJobs } from "./expire-missing-jobs";

export interface RemoteOkIngestionResult {
  companiesProcessed: number;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  deactivated: number;
}

export async function runRemoteOkIngestion(): Promise<RemoteOkIngestionResult> {
  const supabase = supabaseAdmin;

  const result: RemoteOkIngestionResult = {
    companiesProcessed: 1,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    deactivated: 0,
  };

  const { data: source, error: sourceError } = await supabase
    .from("job_sources")
    .select("id")
    .eq("name", "Remote OK")
    .maybeSingle();

  if (sourceError) {
    throw new Error(
      `Failed to load Remote OK source: ${sourceError.message}`
    );
  }

  if (!source) {
    throw new Error(
      "Remote OK source is missing from job_sources. Add it before running ingestion."
    );
  }

  let jobs;

  try {
    jobs = await fetchRemoteOkJobs();
  } catch (error) {
    result.errors++;

    console.error("Remote OK fetch failed:", error);

    return result;
  }

  result.fetched = jobs.length;

  const seenExternalIds = new Set<string>();
  const companyIds = new Map<string, string>();

  for (const rawJob of jobs) {
    try {
      const normalized = normalizeRemoteOkJob(rawJob);

      if (!normalized) {
        result.skipped++;
        continue;
      }

      if (seenExternalIds.has(normalized.sourceJobId)) {
        result.skipped++;
        continue;
      }

      seenExternalIds.add(normalized.sourceJobId);

      const companyName =
        rawJob.company?.trim() || "Unknown Company";

      let companyId = companyIds.get(companyName);

      if (!companyId) {
        companyId = await findOrCreateCompany(
          supabase,
          companyName
        );

        companyIds.set(companyName, companyId);
      }

      const duplicate = await findDuplicateJob(
        supabase,
        {
          sourceId: source.id,
          sourceJobId: normalized.sourceJobId,
          publishedAt: normalized.publishedAt,
          title: normalized.title,
        },
        companyId
      );

      const now = new Date().toISOString();

      const jobPayload = {
        company_id: companyId,
        source_id: source.id,
        title: normalized.title,
        slug: `${normalized.sourceJobId}-${normalized.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80)}`,
        description: normalized.description,
        location: normalized.location,
        country: normalized.country,
        city: normalized.city,
        is_remote: normalized.isRemote,
        employment_type: normalized.employmentType,
        salary_min: normalized.salaryMin,
        salary_max: normalized.salaryMax,
        salary_currency: normalized.salaryCurrency,
        apply_url: normalized.applyUrl,
        source_job_id: normalized.sourceJobId,
        published_at: normalized.publishedAt,
        expires_at: null,
        is_active: true,
        language: normalized.language,
        updated_at: now,
      };

      let jobId: string;

      if (duplicate.existingJobId) {
        const { error: updateError } = await supabase
          .from("jobs")
          .update(jobPayload)
          .eq("id", duplicate.existingJobId);

        if (updateError) {
          throw new Error(
            `Job update failed: ${updateError.message}`
          );
        }

        jobId = duplicate.existingJobId;
        result.updated++;
      } else {
        const { data: insertedJob, error: insertError } =
          await supabase
            .from("jobs")
            .insert(jobPayload)
            .select("id")
            .single();

        if (insertError || !insertedJob) {
          throw new Error(
            `Job insert failed: ${
              insertError?.message ?? "No job returned"
            }`
          );
        }

        jobId = insertedJob.id;
        result.created++;
      }

      const sourceRecordPayload = {
        job_id: jobId,
        source_id: source.id,
        external_job_id: normalized.sourceJobId,
        last_seen_at: now,
        external_url: normalized.externalUrl,
        raw_data: rawJob,
        updated_at: now,
      };

      const { error: sourceRecordError } = await supabase
        .from("job_source_records")
        .upsert(sourceRecordPayload, {
          onConflict: "source_id,external_job_id",
        });

      if (sourceRecordError) {
        throw new Error(
          `Source record upsert failed: ${sourceRecordError.message}`
        );
      }
    } catch (error) {
      result.errors++;

      console.error(
        `Remote OK job processing failed for ${
          rawJob.position ?? "unknown job"
        }:`,
        error
      );
    }
  }

  const companyIdsToExpire = new Set(companyIds.values());

  for (const companyId of companyIdsToExpire) {
    try {
      const expiryResult = await expireMissingJobs(
        source.id,
        companyId
      );

      result.deactivated += expiryResult.deactivated;
    } catch (error) {
      result.errors++;

      console.error(
        `Remote OK expiry failed for company ${companyId}:`,
        error
      );
    }
  }

  const { error: syncError } = await supabase
    .from("job_sources")
    .update({
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", source.id);

  if (syncError) {
    result.errors++;

    console.error(
      "Remote OK source sync update failed:",
      syncError
    );
  }

  return result;
}