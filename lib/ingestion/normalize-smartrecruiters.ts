import type { SmartRecruitersPostingDetails } from "./adapters/smartrecruiters";

function stripHtml(value?: string): string {
  if (!value) return "";

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDescription(
  sections: SmartRecruitersPostingDetails["jobAd"] extends infer T
    ? T
    : never
): string {
  const sectionData = sections?.sections;

  if (!sectionData) {
    return "";
  }

  const parts: string[] = [];

  const addSection = (title: string, text?: string) => {
    const cleaned = stripHtml(text);

    if (cleaned) {
      parts.push(`${title}\n${cleaned}`);
    }
  };

  addSection(
    sectionData.jobDescription?.title || "Job Description",
    sectionData.jobDescription?.text
  );

  addSection(
    sectionData.qualifications?.title || "Qualifications",
    sectionData.qualifications?.text
  );

  addSection(
    sectionData.additionalInformation?.title || "Additional Information",
    sectionData.additionalInformation?.text
  );

  return parts.join("\n\n");
}

export interface NormalizedSmartRecruitersJob {
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
  sourceJobId: string;
  publishedAt: string | null;
  language: string | null;
  slug: string;
  rawData: SmartRecruitersPostingDetails;
}

function createSlug(title: string, sourceJobId: string): string {
  const titleSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${titleSlug}-${sourceJobId}`;
}

export function normalizeSmartRecruitersJob(
  posting: SmartRecruitersPostingDetails
): NormalizedSmartRecruitersJob | null {
  if (!posting.id || !posting.name || !posting.applyUrl) {
    return null;
  }

  const location = posting.location;

  const locationParts = [
    location?.city,
    location?.region,
    location?.country,
  ].filter(Boolean);

  const locationText =
    location?.fullLocation ||
    (locationParts.length > 0 ? locationParts.join(", ") : null);

  const description = buildDescription(posting.jobAd);

  return {
    title: posting.name.trim(),

    description,

    location: locationText,

    country: location?.country || null,

    city: location?.city || null,

    isRemote: Boolean(location?.remote),

    employmentType: posting.typeOfEmployment?.label || null,

    salaryMin: null,

    salaryMax: null,

    salaryCurrency: null,

    applyUrl: posting.applyUrl,

    sourceJobId: String(posting.id),

    publishedAt: posting.releasedDate || null,

    language: posting.language?.label || null,

    slug: createSlug(posting.name, String(posting.id)),

    rawData: posting,
  };
}