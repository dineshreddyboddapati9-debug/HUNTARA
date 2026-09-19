import type { NormalizedJob } from "./normalize";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNormalizedJob(
  job: NormalizedJob
): ValidationResult {
  const errors: string[] = [];

  if (!job.title.trim()) {
    errors.push("Job title is missing.");
  }

  if (!job.description.trim()) {
    errors.push("Job description is missing.");
  }

  if (!job.companyName.trim()) {
    errors.push("Company name is missing.");
  }

  if (!job.sourceJobId.trim()) {
    errors.push("Source job ID is missing.");
  }

  if (!job.applyUrl.trim()) {
    errors.push("Apply URL is missing.");
  } else {
    try {
      const url = new URL(job.applyUrl);

      if (url.protocol !== "https:") {
        errors.push("Apply URL must use HTTPS.");
      }
    } catch {
      errors.push("Apply URL is not a valid URL.");
    }
  }

  if (!job.sourceId.trim()) {
    errors.push("Source ID is missing.");
  }

  if (
    job.publishedAt !== null &&
    Number.isNaN(Date.parse(job.publishedAt))
  ) {
    errors.push("Published date is invalid.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}