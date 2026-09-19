import { fetchArbeitnowJobs } from "./adapters/arbeitnow";
import { findOrCreateCompany } from "./companies";
import { findDuplicateJob } from "./duplicates";
import { normalizeArbeitnowJob } from "./normalize";
import { validateNormalizedJob } from "./validate";
import { supabaseAdmin } from "../supabase/admin";

export async function runArbeitnowIngestion() {
  const { data: source, error: sourceError } = await supabaseAdmin
    .from("job_sources")
    .select("id, name")
    .eq("name", "Arbeitnow")
    .maybeSingle();

  if (sourceError) {
    throw new Error(
      `Failed to find Arbeitnow source: ${sourceError.message}`
    );
  }

  if (!source) {
    throw new Error("Arbeitnow source is not configured.");
  }

  const jobs = await fetchArbeitnowJobs();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const rawJob of jobs) {
    try {
      const normalizedJob = normalizeArbeitnowJob(
        rawJob,
        source.id
      );

      const validation =
        validateNormalizedJob(normalizedJob);

      if (!validation.valid) {
        skipped++;

        await supabaseAdmin.from("ingestion_errors").insert({
          source_id: source.id,
          error_type: "validation",
          error_message: validation.errors.join(" "),
          details: rawJob,
        });

        continue;
      }

      const companyId = await findOrCreateCompany(
        supabaseAdmin,
        normalizedJob.companyName
      );

      const duplicate = await findDuplicateJob(
        supabaseAdmin,
        normalizedJob,
        companyId
      );

      if (duplicate.isExistingSourceRecord) {
        updated++;

        await supabaseAdmin
          .from("job_source_records")
          .update({
            external_url: normalizedJob.applyUrl,
            raw_data: normalizedJob.rawData,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", duplicate.sourceRecordId);

        continue;
      }

      let jobId = duplicate.existingJobId;

      if (jobId) {
        updated++;

        const { error: updateError } =
          await supabaseAdmin
            .from("jobs")
            .update({
              company_id: companyId,
              source_id: source.id,
              title: normalizedJob.title,
              description: normalizedJob.description,
              location: normalizedJob.location,
              country: normalizedJob.country,
              city: normalizedJob.city,
              is_remote: normalizedJob.isRemote,
              employment_type:
                normalizedJob.employmentType,
              salary_min: normalizedJob.salaryMin,
              salary_max: normalizedJob.salaryMax,
              salary_currency:
                normalizedJob.salaryCurrency,
              apply_url: normalizedJob.applyUrl,
              source_job_id: normalizedJob.sourceJobId,
              published_at: normalizedJob.publishedAt,
              expires_at: normalizedJob.expiresAt,
              is_active: normalizedJob.isActive,
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);

        if (updateError) {
          throw new Error(
            `Failed to update job: ${updateError.message}`
          );
        }
      } else {
        const { data: newJob, error: insertError } =
          await supabaseAdmin
            .from("jobs")
            .insert({
              company_id: companyId,
              source_id: source.id,
              title: normalizedJob.title,
              slug: normalizedJob.slug,
              description: normalizedJob.description,
              location: normalizedJob.location,
              country: normalizedJob.country,
              city: normalizedJob.city,
              is_remote: normalizedJob.isRemote,
              employment_type:
                normalizedJob.employmentType,
              salary_min: normalizedJob.salaryMin,
              salary_max: normalizedJob.salaryMax,
              salary_currency:
                normalizedJob.salaryCurrency,
              apply_url: normalizedJob.applyUrl,
              source_job_id: normalizedJob.sourceJobId,
              published_at: normalizedJob.publishedAt,
              expires_at: normalizedJob.expiresAt,
              is_active: normalizedJob.isActive,
            })
            .select("id")
            .single();

        if (insertError || !newJob) {
          throw new Error(
            `Failed to insert job: ${
              insertError?.message ?? "Unknown error"
            }`
          );
        }

        jobId = newJob.id;
        created++;
      }

      const { error: recordError } =
        await supabaseAdmin
          .from("job_source_records")
          .upsert(
            {
              job_id: jobId,
              source_id: source.id,
              external_job_id: normalizedJob.sourceJobId,
              external_url: normalizedJob.applyUrl,
              raw_data: normalizedJob.rawData,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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
    } catch (error) {
      errors++;

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
    }
  }

  const { error: syncError } = await supabaseAdmin
    .from("job_sources")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id);

  if (syncError) {
    throw new Error(
      `Failed to update source sync time: ${syncError.message}`
    );
  }

  return {
    source: source.name,
    fetched: jobs.length,
    created,
    updated,
    skipped,
    errors,
  };
}