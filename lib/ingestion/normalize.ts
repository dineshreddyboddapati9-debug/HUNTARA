import type { ArbeitnowJob } from "./adapters/arbeitnow";

export interface NormalizedJob {
  title: string;
  slug: string;
  description: string;
  companyName: string;
  location: string | null;
  country: string | null;
  city: string | null;
  isRemote: boolean;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  applyUrl: string;
  sourceJobId: string;
  publishedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  sourceId: string;
  rawData: ArbeitnowJob;
}

function mapEmploymentType(
  jobTypes: string[]
): string | null {
  const text = jobTypes.join(" ").toLowerCase();

  if (text.includes("full")) {
    return "full-time";
  }

  if (text.includes("part")) {
    return "part-time";
  }

  if (text.includes("intern")) {
    return "internship";
  }

  if (text.includes("contract")) {
    return "contract";
  }

  return null;
}

function createSlug(title: string, sourceSlug: string): string {
  const titleSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = sourceSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${titleSlug}-${suffix}`;
}

function cleanLocation(location: string): string | null {
  const cleaned = location.trim();

  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeArbeitnowJob(
  job: ArbeitnowJob,
  sourceId: string
): NormalizedJob {
  return {
    title: job.title.trim(),

    slug: createSlug(job.title, job.slug),

    description: job.description,

    companyName: job.company_name.trim(),

    location: cleanLocation(job.location),

    country: null,

    city: null,

    isRemote: Boolean(job.remote),

    employmentType: mapEmploymentType(job.job_types),

    salaryMin: null,

    salaryMax: null,

    salaryCurrency: null,

    applyUrl: job.url.trim(),

    sourceJobId: job.slug,

    publishedAt: Number.isFinite(job.created_at)
      ? new Date(job.created_at * 1000).toISOString()
      : null,

    expiresAt: null,

    isActive: true,

    sourceId,

    rawData: job,
  };
}