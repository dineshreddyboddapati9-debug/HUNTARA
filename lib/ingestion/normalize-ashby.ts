import type { AshbyJob } from "./adapters/ashby";

export interface NormalizedAshbyJob {
  sourceJobId: string;
  title: string;
  description: string;
  location: string | null;
  country: string | null;
  city: string | null;
  isRemote: boolean;
  employmentType: string | null;
  applyUrl: string;
  externalUrl: string;
  publishedAt: string | null;
  language: string;
}

function detectCountry(location: string | null): string | null {
  if (!location) return null;

  const value = location.toLowerCase();

  if (value.includes("india")) return "India";
  if (value.includes("united states") || value.includes("usa")) {
    return "United States";
  }
  if (value.includes("united kingdom") || value.includes("uk")) {
    return "United Kingdom";
  }
  if (value.includes("canada")) return "Canada";
  if (value.includes("australia")) return "Australia";
  if (value.includes("germany")) return "Germany";
  if (value.includes("singapore")) return "Singapore";

  return null;
}

function detectCity(location: string | null): string | null {
  if (!location) return null;

  const cities = [
    "Bengaluru",
    "Bangalore",
    "Hyderabad",
    "Pune",
    "Mumbai",
    "Chennai",
    "Delhi",
    "Gurugram",
    "Gurgaon",
    "Noida",
    "Kolkata",
    "New Delhi",
    "Singapore",
    "London",
    "Toronto",
    "New York",
    "San Francisco",
    "Seattle",
    "Boston",
    "Austin",
    "Los Angeles",
  ];

  const lowerLocation = location.toLowerCase();

  const matchedCity = cities.find((city) =>
    lowerLocation.includes(city.toLowerCase())
  );

  return matchedCity ?? null;
}

function detectRemote(job: AshbyJob): boolean {
  if (job.isRemote === true) return true;

  const location = job.location?.toLowerCase() ?? "";

  return (
    location.includes("remote") ||
    location.includes("work from home") ||
    location.includes("anywhere")
  );
}

export function normalizeAshbyJob(
  job: AshbyJob
): NormalizedAshbyJob | null {
  if (!job.id || !job.title) {
    return null;
  }

  const location = job.location?.trim() || null;

  const applyUrl =
    job.applyUrl?.trim() ||
    job.jobUrl?.trim() ||
    "";

  const externalUrl =
    job.jobUrl?.trim() ||
    job.applyUrl?.trim() ||
    "";

  if (!applyUrl) {
    return null;
  }

  const description =
    job.descriptionHtml?.trim() ||
    job.descriptionPlain?.trim() ||
    "";

  return {
    sourceJobId: job.id,
    title: job.title.trim(),
    description,
    location,
    country: detectCountry(location),
    city: detectCity(location),
    isRemote: detectRemote(job),
    employmentType: job.employmentType?.trim() || null,
    applyUrl,
    externalUrl,
    publishedAt: job.publishedAt || null,
    language: "en",
  };
}