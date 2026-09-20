import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  fetchSmartRecruitersPosting,
  fetchSmartRecruitersPostings,
} from "./adapters/smartrecruiters";
import { SMARTRECRUITERS_COMPANIES } from "./smartrecruiters-companies";
import { normalizeSmartRecruitersJob } from "./normalize-smartrecruiters";
import { findOrCreateCompany } from "./companies";
import { findDuplicateJob } from "./duplicates";
import { expireMissingJobs } from "./expire-missing-jobs";

export interface SmartRecruitersIngestionResult {
  companiesProcessed: number;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  deactivated: number;
}

export async function runSmartRecruitersIngestion(): Promise<SmartRecruitersIngestionResult> {
  const result: SmartRecruitersIngestionResult = {
    companiesProcessed: 0,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    deactivated: 0,
  };

  const { data: source, error: sourceError } = await supabaseAdmin
    .from("job_sources")
    .select("id, name")
    .eq("name", "SmartRecruiters")
    .single();

  if (sourceError || !source) {
    throw new Error(
      `SmartRecruiters source not found: ${
        sourceError?.message || "unknown error"
      }`
    );
  }

  for (const companyConfig of SMARTRECRUITERS_COMPANIES) {
    result.companiesProcessed += 1;

    try {
      const postings = await fetchSmartRecruitersPostings(
        companyConfig.identifier
      );

      result.fetched += postings.length;

      const companyId = await findOrCreateCompany(
        supabaseAdmin,
        companyConfig.companyName
      );

      for (const posting of postings) {
        try {
          const details = await fetchSmartRecruitersPosting(
            companyConfig.identifier,
            posting.id
          );

          if (details.active === false) {
            result.skipped += 1;
            continue;
          }

          const normalized = normalizeSmartRecruitersJob(details);

          if (!normalized) {
            result.skipped += 1;
            continue;
          }

          const duplicate = await findDuplicateJob(
            supabaseAdmin,
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
            slug: normalized.slug,
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
            is_active: true,
            updated_at: now,
            language: normalized.language,
          };

          let jobId: string;

          if (duplicate.existingJobId) {
            const { data: updatedJob, error: updateError } =
              await supabaseAdmin
                .from("jobs")
                .update(jobPayload)
                .eq("id", duplicate.existingJobId)
                .select("id")
                .single();

            if (updateError || !updatedJob) {
              throw new Error(
                `Failed to update job: ${
                  updateError?.message || "unknown error"
                }`
              );
            }

            jobId = updatedJob.id;
            result.updated += 1;
          } else {
            const { data: newJob, error: insertError } = await supabaseAdmin
              .from("jobs")
              .insert({
                ...jobPayload,
                created_at: now,
              })
              .select("id")
              .single();

            if (insertError || !newJob) {
              throw new Error(
                `Failed to insert job: ${
                  insertError?.message || "unknown error"
                }`
              );
            }

            jobId = newJob.id;
            result.created += 1;
          }

          const { error: sourceRecordError } = await supabaseAdmin
            .from("job_source_records")
            .upsert(
              {
                job_id: jobId,
                source_id: source.id,
                external_job_id: normalized.sourceJobId,
                last_seen_at: now,
                external_url:
                  details.postingUrl || normalized.applyUrl,
                raw_data: normalized.rawData,
                updated_at: now,
              },
              {
                onConflict: "source_id,external_job_id",
              }
            );

          if (sourceRecordError) {
            throw new Error(
              `Failed to save source record: ${sourceRecordError.message}`
            );
          }
        } catch (error) {
          result.errors += 1;

          console.error(
            `SmartRecruiters job ${posting.id} failed:`,
            error
          );

          await supabaseAdmin.from("ingestion_errors").insert({
            source_id: source.id,
            external_job_id: posting.id,
            error_message:
              error instanceof Error ? error.message : String(error),
            created_at: new Date().toISOString(),
          });
        }
      }

      await supabaseAdmin
        .from("job_sources")
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", source.id);

      const expiryResult = await expireMissingJobs(
        source.id,
        companyId
      );

      result.deactivated += expiryResult.deactivated;
    } catch (error) {
      result.errors += 1;

      console.error(
        `SmartRecruiters company ${companyConfig.identifier} failed:`,
        error
      );
    }
  }

  return result;
}