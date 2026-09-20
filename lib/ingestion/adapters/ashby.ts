export interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  team?: string;
  employmentType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  isRemote?: boolean;
}

interface AshbyApiResponse {
  jobs?: AshbyJob[];
}

export async function fetchAshbyJobs(
  jobBoardName: string
): Promise<AshbyJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${jobBoardName}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Ashby API failed for ${jobBoardName}: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as AshbyApiResponse;

  return Array.isArray(data.jobs) ? data.jobs : [];
}