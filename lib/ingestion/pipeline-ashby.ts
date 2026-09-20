import { supabaseAdmin } from "@/lib/supabase/admin";
import { ASHBY_COMPANIES } from "./ashby-companies";
import { fetchAshbyJobs } from "./adapters/ashby";
import { normalizeAshbyJob } from "./normalize-ashby";
import { findOrCreateCompany } from "./companies";
import { findDuplicateJob } from "./duplicates";
import { expireMissingJobs } from "./expire-missing-jobs";

const BATCH_SIZE = 25;

export interface AshbyIngestionResult {
  companiesProcessed: number;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  deactivated: number;
}

export async function runAshbyIngestion(): Promise<AshbyIngestionResult> {
  const supabase = supabaseAdmin;

  const result: AshbyIngestionResult = {
    companiesProcessed: 0,
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
    .eq("name", "Ashby")
    .maybeSingle();

  if (sourceError) {
    throw new Error(`Failed to load Ashby source: ${sourceError.message}`);
  }

  if (!source) {
    throw new Error(
      "Ashby source is missing from job_sources. Add it before running ingestion."
    );
  }

  for (const config of ASHBY_COMPANIES) {
    result.companiesProcessed++;

    let companyId: string;

    try {
      companyId = await findOrCreateCompany(
        supabase,
        config.companyName
      );
    } catch (error) {
      result.errors++;

      console.error(
        `Ashby company creation failed for ${config.companyName}:`,
        error
      );

      continue;
    }

    let jobs;

    try {
      jobs = await fetchAshbyJobs(config.jobBoardName);
    } catch (error) {
      result.errors++;

      console.error(
        `Ashby fetch failed for ${config.companyName}:`,
        error
      );

      continue;
    }

    result.fetched += jobs.length;

    const seenExternalIds = new Set<string>();

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (rawJob) => {
          try {
            const normalized = normalizeAshbyJob(rawJob);

            if (!normalized) {
              result.skipped++;
              return;
            }

            if (seenExternalIds.has(normalized.sourceJobId)) {
              result.skipped++;
              return;
            }

            seenExternalIds.add(normalized.sourceJobId);

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
              `Ashby job processing failed for ${config.companyName}:`,
              error
            );
          }
        })
      );
    }

    try {
      const expiryResult = await expireMissingJobs(
        source.id,
        companyId
      );

      result.deactivated += expiryResult.deactivated;
    } catch (error) {
      result.errors++;

      console.error(
        `Ashby expiry failed for ${config.companyName}:`,
        error
      );
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
        `Ashby source sync update failed:`,
        syncError
      );
    }
  }

  return result;
}