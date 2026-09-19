import type { LeverJob } from "./adapters/lever";

export interface NormalizedLeverJob {
  title: string;
  slug: string;
  description: string;
  companyName: string;
  location: string | null;
  country: string | null;
  city: string | null;
  language: string | null;
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
  rawData: LeverJob;
}

function createSlug(
  title: string,
  sourceJobId: string
): string {
  const titleSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${titleSlug}-${sourceJobId}`;
}

function cleanLocation(
  location: string | undefined
): string | null {
  if (!location) {
    return null;
  }

  const cleaned = location.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanDescription(
  job: LeverJob
): string {
  const parts: string[] = [];

  if (job.descriptionPlain?.trim()) {
    parts.push(job.descriptionPlain.trim());
  } else if (job.description?.trim()) {
    parts.push(job.description.trim());
  }

  if (Array.isArray(job.lists)) {
    for (const list of job.lists) {
      if (list.text?.trim()) {
        parts.push(list.text.trim());
      }

      if (list.content?.trim()) {
        parts.push(list.content.trim());
      }
    }
  }

  return parts
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

function cleanWorkplaceType(
  workplaceType: string | undefined
): string {
  return workplaceType
    ?.trim()
    .toLowerCase() || "";
}

function cleanEmploymentType(
  commitment: string | undefined
): string | null {
  if (!commitment) {
    return null;
  }

  const cleaned = commitment.trim();

  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeLeverJob(
  job: LeverJob,
  sourceId: string,
  companyName: string
): NormalizedLeverJob {
  const location =
    cleanLocation(
      job.categories?.location
    );

  const workplaceType =
    cleanWorkplaceType(
      job.workplaceType
    );

  const isRemote =
    workplaceType.includes("remote") ||
    location?.toLowerCase().includes("remote") ||
    false;

  const publishedAt =
    job.createdAt
      ? new Date(job.createdAt).toISOString()
      : job.updatedAt
        ? new Date(
            job.updatedAt
          ).toISOString()
        : null;

  return {
    title: job.text.trim(),

    slug: createSlug(
      job.text,
      job.id
    ),

    description:
      cleanDescription(job),

    companyName:
      companyName.trim(),

    location,

    country: null,

    city: null,

    language: "English",

    isRemote,

    employmentType:
      cleanEmploymentType(
        job.categories?.commitment
      ),

    salaryMin:
      job.salaryRange?.min ?? null,

    salaryMax:
      job.salaryRange?.max ?? null,

    salaryCurrency:
      job.salaryRange?.currency ?? null,

    applyUrl:
      job.applyUrl?.trim() ||
      job.hostedUrl?.trim() ||
      "",

    sourceJobId:
      String(job.id),

    publishedAt,

    expiresAt: null,

    isActive: true,

    sourceId,

    rawData: job,
  };
}