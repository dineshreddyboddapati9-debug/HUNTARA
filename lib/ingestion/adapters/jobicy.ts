export interface JobicyJob {
  id?: number;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  jobExcerpt?: string;
  jobGeo?: string;
  jobIndustry?: string[];
  jobType?: string[];
  pubDate?: string;
  url?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  jobLevel?: string;
}

interface JobicyApiResponse {
  jobs?: JobicyJob[];
}

export async function fetchJobicyJobs(): Promise<JobicyJob[]> {
  const url = "https://jobicy.com/api/v2/remote-jobs";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Jobicy API failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as JobicyApiResponse;

  return Array.isArray(data.jobs) ? data.jobs : [];
}