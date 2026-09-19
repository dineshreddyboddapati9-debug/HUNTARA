const ARBEITNOW_API_URL =
  "https://www.arbeitnow.com/api/job-board-api";

const MAX_PAGES = 3;

export interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
  links?: {
    next?: string | null;
  };
}

export async function fetchArbeitnowJobs(): Promise<ArbeitnowJob[]> {
  const jobs: ArbeitnowJob[] = [];

  let nextUrl: string | null = ARBEITNOW_API_URL;
  let pageCount = 0;

  while (nextUrl && pageCount < MAX_PAGES) {
    pageCount++;

    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Arbeitnow API request failed: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as ArbeitnowResponse;

    if (!Array.isArray(json.data)) {
      throw new Error(
        "Unexpected Arbeitnow API response: data is not an array."
      );
    }

    jobs.push(...json.data);

    nextUrl =
      typeof json.links?.next === "string"
        ? json.links.next
        : null;
  }

  return jobs;
}