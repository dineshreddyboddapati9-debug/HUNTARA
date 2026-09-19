import { supabaseAdmin } from "../supabase/admin";

const STALE_AFTER_HOURS = 24;
const PAGE_SIZE = 500;

interface ExpireMissingJobsResult {
  checked: number;
  deactivated: number;
}

export async function expireMissingJobs(
  sourceId: string,
  companyId: string
): Promise<ExpireMissingJobsResult> {
  const cutoff = new Date(
    Date.now() -
      STALE_AFTER_HOURS *
        60 *
        60 *
        1000
  ).toISOString();

  let checked = 0;
  let deactivated = 0;
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const {
      data: records,
      error: recordsError,
    } = await supabaseAdmin
      .from("job_source_records")
      .select("id, job_id, last_seen_at")
      .eq("source_id", sourceId)
      .gte("last_seen_at", "1970-01-01T00:00:00.000Z")
      .range(from, to);

    if (recordsError) {
      throw new Error(
        `Failed to read source records: ${recordsError.message}`
      );
    }

    if (!records || records.length === 0) {
      break;
    }

    checked += records.length;

    const staleRecords = records.filter(
      (record) =>
        record.last_seen_at < cutoff
    );

    for (const record of staleRecords) {
      const {
        data: job,
        error: jobError,
      } = await supabaseAdmin
        .from("jobs")
        .select("id")
        .eq("id", record.job_id)
        .eq("company_id", companyId)
        .eq("source_id", sourceId)
        .maybeSingle();

      if (jobError) {
        throw new Error(
          `Failed to check job ${record.job_id}: ${jobError.message}`
        );
      }

      if (!job) {
        continue;
      }

      const { error: updateError } =
        await supabaseAdmin
          .from("jobs")
          .update({
            is_active: false,
            expires_at: new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", record.job_id)
          .eq("company_id", companyId)
          .eq("source_id", sourceId)
          .eq("is_active", true);

      if (updateError) {
        throw new Error(
          `Failed to deactivate job ${record.job_id}: ${updateError.message}`
        );
      }

      deactivated++;
    }

    if (records.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return {
    checked,
    deactivated,
  };
}