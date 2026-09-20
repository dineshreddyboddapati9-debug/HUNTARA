import type { JobicyJob } from "./adapters/jobicy";

export interface NormalizedJobicyJob {
  sourceJobId: string;
  title: string;
  description: string;
  location: string | null;
  country: string | null;
  city: string | null;
  isRemote: boolean;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  applyUrl: string;
  externalUrl: string;
  publishedAt: string | null;
  language: string;
}

function detectLocation(jobGeo?: string) {
  const location = jobGeo?.trim() || null;

  if (!location) {
    return {
      location: null,
      country: null,
      city: null,
    };
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    location,
    country: parts.length >= 2 ? parts[parts.length - 1] : null,
    city: parts.length >= 2 ? parts[0] : null,
  };
}

export function normalizeJobicyJob(
  rawJob: JobicyJob
): NormalizedJobicyJob | null {
  const sourceJobId =
    rawJob.id !== undefined
      ? String(rawJob.id)
      : rawJob.url?.trim();

  const title = rawJob.jobTitle?.trim();
  const externalUrl = rawJob.url?.trim();

  if (!sourceJobId || !title || !externalUrl) {
    return null;
  }

  const locationData = detectLocation(rawJob.jobGeo);

  const remoteText = [
    rawJob.jobGeo,
    rawJob.jobTitle,
    rawJob.jobDescription,
    rawJob.jobExcerpt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isRemote =
    remoteText.includes("remote") ||
    remoteText.includes("work from home") ||
    remoteText.includes("wfh") ||
    rawJob.jobGeo?.toLowerCase() === "anywhere";

  return {
    sourceJobId,
    title,
    description:
      rawJob.jobDescription?.trim() ||
      rawJob.jobExcerpt?.trim() ||
      "",
    location: locationData.location,
    country: locationData.country,
    city: locationData.city,
    isRemote,
    employmentType:
      rawJob.jobType && rawJob.jobType.length > 0
        ? rawJob.jobType.join(", ")
        : null,
    salaryMin:
      typeof rawJob.salaryMin === "number"
        ? rawJob.salaryMin
        : null,
    salaryMax:
      typeof rawJob.salaryMax === "number"
        ? rawJob.salaryMax
        : null,
    salaryCurrency:
      rawJob.salaryCurrency?.trim() || null,
    applyUrl: externalUrl,
    externalUrl,
    publishedAt: rawJob.pubDate
      ? new Date(rawJob.pubDate).toISOString()
      : null,
    language: "en",
  };
}