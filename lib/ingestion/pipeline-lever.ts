import { fetchLeverJobs } from "./adapters/lever";
import { findOrCreateCompany } from "./companies";
import { findDuplicateJob } from "./duplicates";
import { normalizeLeverJob } from "./normalize-lever";
import { supabaseAdmin } from "../supabase/admin";

const BATCH_SIZE = 10;

export async function runLeverIngestion(
  site: string,
  companyName: string
) {
  const { data: source, error: sourceError } =
    await supabaseAdmin
      .from("job_sources")
      .select("id, name")
      .eq("name", "Lever")
      .maybeSingle();

  if (sourceError) {
    throw new Error(
      `Failed to find Lever source: ${sourceError.message}`
    );
  }

  if (!source) {
    throw new Error(
      "Lever source is not configured."
    );
  }

  const jobs = await fetchLeverJobs(site);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (
    let start = 0;
    start < jobs.length;
    start += BATCH_SIZE
  ) {
    const batch = jobs.slice(
      start,
      start + BATCH_SIZE
    );

    const batchResults = await Promise.all(
      batch.map(async (rawJob) => {
        try {
          const normalizedJob =
            normalizeLeverJob(
              rawJob,
              source.id,
              companyName
            );

          if (
            !normalizedJob.title ||
            !normalizedJob.description ||
            !normalizedJob.applyUrl
          ) {
            await supabaseAdmin
              .from("ingestion_errors")
              .insert({
                source_id: source.id,
                error_type: "validation",
                error_message:
                  "Lever job is missing required information.",
                details: rawJob,
              });

            return {
              created: 0,
              updated: 0,
              skipped: 1,
              errors: 0,
            };
          }

          const companyId =
            await findOrCreateCompany(
              supabaseAdmin,
              normalizedJob.companyName
            );

          const duplicate =
            await findDuplicateJob(
              supabaseAdmin,
              normalizedJob,
              companyId
            );

          if (
            duplicate.isExistingSourceRecord
          ) {
            await supabaseAdmin
              .from("job_source_records")
              .update({
                external_url:
                  normalizedJob.applyUrl,
                raw_data:
                  normalizedJob.rawData,
                last_seen_at:
                  new Date().toISOString(),
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                duplicate.sourceRecordId
              );

            return {
              created: 0,
              updated: 1,
              skipped: 0,
              errors: 0,
            };
          }

          let jobId =
            duplicate.existingJobId;

          if (jobId) {
            const { error } =
              await supabaseAdmin
                .from("jobs")
                .update({
                  company_id: companyId,
                  source_id: source.id,
                  title: normalizedJob.title,
                  description:
                    normalizedJob.description,
                  location:
                    normalizedJob.location,
                  country:
                    normalizedJob.country,
                  city:
                    normalizedJob.city,
                  language:
                    normalizedJob.language,
                  is_remote:
                    normalizedJob.isRemote,
                  employment_type:
                    normalizedJob.employmentType,
                  salary_min:
                    normalizedJob.salaryMin,
                  salary_max:
                    normalizedJob.salaryMax,
                  salary_currency:
                    normalizedJob.salaryCurrency,
                  apply_url:
                    normalizedJob.applyUrl,
                  source_job_id:
                    normalizedJob.sourceJobId,
                  published_at:
                    normalizedJob.publishedAt,
                  expires_at:
                    normalizedJob.expiresAt,
                  is_active:
                    normalizedJob.isActive,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq("id", jobId);

            if (error) {
              throw new Error(
                `Failed to update job: ${error.message}`
              );
            }

            return {
              created: 0,
              updated: 1,
              skipped: 0,
              errors: 0,
            };
          }

          const { data: newJob, error } =
            await supabaseAdmin
              .from("jobs")
              .insert({
                company_id: companyId,
                source_id: source.id,
                title: normalizedJob.title,
                slug: normalizedJob.slug,
                description:
                  normalizedJob.description,
                location:
                  normalizedJob.location,
                country:
                  normalizedJob.country,
                city:
                  normalizedJob.city,
                language:
                  normalizedJob.language,
                is_remote:
                  normalizedJob.isRemote,
                employment_type:
                  normalizedJob.employmentType,
                salary_min:
                  normalizedJob.salaryMin,
                salary_max:
                  normalizedJob.salaryMax,
                salary_currency:
                  normalizedJob.salaryCurrency,
                apply_url:
                  normalizedJob.applyUrl,
                source_job_id:
                  normalizedJob.sourceJobId,
                published_at:
                  normalizedJob.publishedAt,
                expires_at:
                  normalizedJob.expiresAt,
                is_active:
                  normalizedJob.isActive,
              })
              .select("id")
              .single();

          if (error || !newJob) {
            throw new Error(
              `Failed to insert job: ${
                error?.message ??
                "Unknown error."
              }`
            );
          }

          jobId = newJob.id;

          const { error: recordError } =
            await supabaseAdmin
              .from("job_source_records")
              .upsert(
                {
                  job_id: jobId,
                  source_id: source.id,
                  external_job_id:
                    normalizedJob.sourceJobId,
                  external_url:
                    normalizedJob.applyUrl,
                  raw_data:
                    normalizedJob.rawData,
                  last_seen_at:
                    new Date().toISOString(),
                  updated_at:
                    new Date().toISOString(),
                },
                {
                  onConflict:
                    "source_id,external_job_id",
                }
              );

          if (recordError) {
            throw new Error(
              `Failed to save source record: ${recordError.message}`
            );
          }

          return {
            created: 1,
            updated: 0,
            skipped: 0,
            errors: 0,
          };
        } catch (error) {
          await supabaseAdmin
            .from("ingestion_errors")
            .insert({
              source_id: source.id,
              error_type: "processing",
              error_message:
                error instanceof Error
                  ? error.message
                  : "Unknown processing error.",
              details: rawJob,
            });

          return {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
          };
        }
      })
    );

    for (const result of batchResults) {
      created += result.created;
      updated += result.updated;
      skipped += result.skipped;
      errors += result.errors;
    }
  }

  const { error: syncError } =
    await supabaseAdmin
      .from("job_sources")
      .update({
        last_synced_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", source.id);

  if (syncError) {
    throw new Error(
      `Failed to update Lever sync time: ${syncError.message}`
    );
  }

  return {
    source: source.name,
    company: companyName,
    fetched: jobs.length,
    created,
    updated,
    skipped,
    errors,
  };
}