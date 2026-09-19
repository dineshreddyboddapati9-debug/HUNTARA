import type { GreenhouseJob } from "./adapters/greenhouse";

export interface NormalizedGreenhouseJob {
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
  rawData: GreenhouseJob;
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

function decodeHtmlEntities(
  value: string
): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(
      /&#(\d+);/g,
      (_, code) =>
        String.fromCharCode(Number(code))
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, code) =>
        String.fromCharCode(
          parseInt(code, 16)
        )
    );
}

function fullyDecodeHtml(
  value: string
): string {
  let result = value;

  for (let i = 0; i < 5; i++) {
    const decoded =
      decodeHtmlEntities(result);

    if (decoded === result) {
      break;
    }

    result = decoded;
  }

  return result;
}

function cleanDescription(
  description: string | undefined
): string {
  if (!description) {
    return "";
  }

  let cleaned =
    fullyDecodeHtml(description);

  cleaned = cleaned
    .replace(
      /<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<(p|div|li|h[1-6])\b[^>]*>/gi,
      ""
    );

  cleaned = cleaned.replace(
    /<[^>]*>/g,
    ""
  );

  cleaned = fullyDecodeHtml(cleaned);

  cleaned = cleaned
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(
      /\n\s*\n\s*\n+/g,
      "\n\n"
    )
    .trim();

  return cleaned;
}

function cleanLanguage(
  language: string | null | undefined
): string | null {
  if (!language) {
    return null;
  }

  const cleaned =
    language.trim().toLowerCase();

  if (!cleaned) {
    return null;
  }

  const languageMap: Record<
    string,
    string
  > = {
    en: "English",
    "en-us": "English",
    "en-gb": "English",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
  };

  return (
    languageMap[cleaned] ||
    language.trim()
  );
}

export function normalizeGreenhouseJob(
  job: GreenhouseJob,
  sourceId: string,
  companyName: string
): NormalizedGreenhouseJob {
  return {
    title: job.title.trim(),

    slug: createSlug(
      job.title,
      String(job.id)
    ),

    description: cleanDescription(
      job.content
    ),

    companyName:
      companyName.trim(),

    location: cleanLocation(
      job.location?.name
    ),

    country: null,

    city: null,

    language: cleanLanguage(
      job.language
    ),

    isRemote:
      job.location?.name
        ?.toLowerCase()
        .includes("remote") || false,

    employmentType: null,

    salaryMin: null,

    salaryMax: null,

    salaryCurrency: null,

    applyUrl:
      job.absolute_url.trim(),

    sourceJobId:
      String(job.id),

    publishedAt:
      job.updated_at || null,

    expiresAt: null,

    isActive: true,

    sourceId,

    rawData: job,
  };
}