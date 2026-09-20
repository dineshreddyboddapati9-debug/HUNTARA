import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchJobicyJobs } from "./adapters/jobicy";
import { normalizeJobicyJob } from "./normalize-jobicy";
import { findOrCreateCompany } from "./companies";
import { findDuplicateJob } from "./duplicates";
import { expireMissingJobs } from "./expire-missing-jobs";

const BATCH_SIZE = 10;

export interface JobicyIngestionResult {
  companiesProcessed: number;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  deactivated: number;
}

export async function runJobicyIngestion(): Promise<JobicyIngestionResult> {
  const supabase = supabaseAdmin;

  const result: JobicyIngestionResult = {
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
    .eq("name", "Jobicy")
    .maybeSingle();

  if (sourceError) {
    throw new Error(
      `Failed to load Jobicy source: ${sourceError.message}`
    );
  }

  if (!source) {
    throw new Error(
      "Jobicy source is missing from job_sources. Add it before running ingestion."
    );
  }

  let jobs;

  try {
    jobs = await fetchJobicyJobs();
  } catch (error) {
    result.errors++;

    console.error("Jobicy fetch failed:", error);

    return result;
  }

  result.fetched = jobs.length;

  const seenExternalIds = new Set<string>();
  const companyIds = new Map<string, string>();

  for (let start = 0; start < jobs.length; start += BATCH_SIZE) {
    const batch = jobs.slice(start, start + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (rawJob) => {
        try {
          const normalized = normalizeJobicyJob(rawJob);

          if (!normalized) {
            return {
              skipped: 1,
              created: 0,
              updated: 0,
              errors: 0,
              companyId: null,
            };
          }

          if (seenExternalIds.has(normalized.sourceJobId)) {
            return {
              skipped: 1,
              created: 0,
              updated: 0,
              errors: 0,
              companyId: null,
            };
          }

          seenExternalIds.add(normalized.sourceJobId);

          const companyName =
            rawJob.companyName?.trim() || "Unknown Company";

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
          let created = 0;
          let updated = 0;

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
            updated = 1;
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
            created = 1;
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

          return {
            skipped: 0,
            created,
            updated,
            errors: 0,
            companyId,
          };
        } catch (error) {
          console.error(
            `Jobicy job processing failed for ${
              rawJob.jobTitle ?? "unknown job"
            }:`,
            error
          );

          return {
            skipped: 0,
            created: 0,
            updated: 0,
            errors: 1,
            companyId: null,
          };
        }
      })
    );

    for (const batchResult of batchResults) {
      result.skipped += batchResult.skipped;
      result.created += batchResult.created;
      result.updated += batchResult.updated;
      result.errors += batchResult.errors;
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
        `Jobicy expiry failed for company ${companyId}:`,
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
      "Jobicy source sync update failed:",
      syncError
    );
  }

  return result;
}