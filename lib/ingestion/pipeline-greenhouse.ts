import { fetchGreenhouseJobs } from "./adapters/greenhouse";
import { findOrCreateCompany } from "./companies";
import { findDuplicateJob } from "./duplicates";
import { normalizeGreenhouseJob } from "./normalize-greenhouse";
import { expireMissingJobs } from "./expire-missing-jobs";
import { supabaseAdmin } from "../supabase/admin";

const BATCH_SIZE = 10;

export async function runGreenhouseIngestion(
  boardToken: string,
  companyName: string
) {
  const { data: source, error: sourceError } =
    await supabaseAdmin
      .from("job_sources")
      .select("id, name")
      .eq("name", "Greenhouse")
      .maybeSingle();

  if (sourceError) {
    throw new Error(
      `Failed to find Greenhouse source: ${sourceError.message}`
    );
  }

  if (!source) {
    throw new Error(
      "Greenhouse source is not configured."
    );
  }

  const jobs = await fetchGreenhouseJobs(
    boardToken
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  let companyId: string | null = null;

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
            normalizeGreenhouseJob(
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
                  "Greenhouse job is missing required information.",
                details: rawJob,
              });

            return {
              created: 0,
              updated: 0,
              skipped: 1,
              errors: 0,
            };
          }

          const currentCompanyId =
            await findOrCreateCompany(
              supabaseAdmin,
              normalizedJob.companyName
            );

          companyId = currentCompanyId;

          const duplicate =
            await findDuplicateJob(
              supabaseAdmin,
              normalizedJob,
              currentCompanyId
            );

          if (
            duplicate.isExistingSourceRecord
          ) {
            const now =
              new Date().toISOString();

            const { error: recordError } =
              await supabaseAdmin
                .from("job_source_records")
                .update({
                  external_url:
                    normalizedJob.applyUrl,
                  raw_data:
                    normalizedJob.rawData,
                  last_seen_at: now,
                  updated_at: now,
                })
                .eq(
                  "id",
                  duplicate.sourceRecordId
                );

            if (recordError) {
              throw new Error(
                `Failed to update source record: ${recordError.message}`
              );
            }

            if (duplicate.existingJobId) {
              const { error: jobError } =
                await supabaseAdmin
                  .from("jobs")
                  .update({
                    is_active: true,
                    expires_at: null,
                    updated_at: now,
                  })
                  .eq(
                    "id",
                    duplicate.existingJobId
                  );

              if (jobError) {
                throw new Error(
                  `Failed to reactivate job: ${jobError.message}`
                );
              }
            }

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
                  company_id: currentCompanyId,
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
                company_id:
                  currentCompanyId,
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

          const now =
            new Date().toISOString();

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
                  last_seen_at: now,
                  updated_at: now,
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

  let deactivated = 0;

  if (jobs.length > 0 && companyId) {
    const expiryResult =
      await expireMissingJobs(
        source.id,
        companyId
      );

    deactivated =
      expiryResult.deactivated;
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
      `Failed to update Greenhouse sync time: ${syncError.message}`
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
    deactivated,
  };
}