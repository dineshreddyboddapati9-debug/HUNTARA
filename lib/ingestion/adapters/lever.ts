const LEVER_API_BASE = "https://api.lever.co/v0/postings";

export interface LeverJob {
  id: string;
  text: string;
  createdAt?: number;
  updatedAt?: number;

  categories?: {
    commitment?: string;
    department?: string;
    level?: string;
    location?: string;
    team?: string;
  };

  descriptionPlain?: string;
  description?: string;
  lists?: Array<{
    text?: string;
    content?: string;
  }>;

  hostedUrl?: string;
  applyUrl?: string;

  workplaceType?: string;

  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
  };
}

export async function fetchLeverJobs(
  site: string
): Promise<LeverJob[]> {
  const normalizedSite = site.trim();

  if (!normalizedSite) {
    throw new Error("Lever site is required.");
  }

  const url =
    `${LEVER_API_BASE}/` +
    `${encodeURIComponent(normalizedSite)}?mode=json`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },

    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Lever API request failed: ` +
        `${response.status} ${response.statusText}`
    );
  }

  const json = await response.json();

  if (!Array.isArray(json)) {
    throw new Error(
      "Unexpected Lever API response: expected an array of jobs."
    );
  }

  return json as LeverJob[];
}