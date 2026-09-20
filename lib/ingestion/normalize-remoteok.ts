import type { RemoteOkJob } from "./adapters/remoteok";

export interface NormalizedRemoteOkJob {
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

function detectLocation(locationValue?: string) {
  const location = locationValue?.trim() || "Remote";

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

export function normalizeRemoteOkJob(
  rawJob: RemoteOkJob
): NormalizedRemoteOkJob | null {
  const sourceJobId =
    rawJob.id !== undefined
      ? String(rawJob.id)
      : rawJob.slug?.trim() || rawJob.url?.trim();

  const title = rawJob.position?.trim();
  const externalUrl = rawJob.url?.trim();

  if (!sourceJobId || !title || !externalUrl) {
    return null;
  }

  const locationData = detectLocation(rawJob.location);

  const description = rawJob.description?.trim() || "";

  const employmentType =
    rawJob.tags
      ?.filter((tag) => /full.?time|part.?time|contract|freelance|intern/i.test(tag))
      .join(", ") || null;

  return {
    sourceJobId,
    title,
    description,
    location: locationData.location,
    country: locationData.country,
    city: locationData.city,
    isRemote: true,
    employmentType,
    salaryMin:
      typeof rawJob.salary_min === "number"
        ? rawJob.salary_min
        : null,
    salaryMax:
      typeof rawJob.salary_max === "number"
        ? rawJob.salary_max
        : null,
    salaryCurrency: null,
    applyUrl: externalUrl,
    externalUrl,
    publishedAt: rawJob.date
      ? new Date(rawJob.date).toISOString()
      : null,
    language: "en",
  };
}