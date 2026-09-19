const GREENHOUSE_API_BASE =
  "https://boards-api.greenhouse.io/v1/boards";

export interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  language?: string | null;
  requisition_id: string | null;

  location?: {
    name?: string;
  };

  absolute_url: string;

  content?: string;

  metadata?: unknown[];

  departments?: Array<{
    id: number;
    name: string;
  }>;

  offices?: Array<{
    id: number;
    name: string;
    location?: string;
  }>;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];

  meta?: {
    total?: number;
  };
}

export async function fetchGreenhouseJobs(
  boardToken: string
): Promise<GreenhouseJob[]> {
  const token = boardToken.trim();

  if (!token) {
    throw new Error(
      "Greenhouse board token is required."
    );
  }

  const url =
    `${GREENHOUSE_API_BASE}/` +
    `${encodeURIComponent(token)}/jobs?content=true`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },

    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Greenhouse API request failed: ` +
        `${response.status} ${response.statusText}`
    );
  }

  const json =
    (await response.json()) as GreenhouseResponse;

  if (!Array.isArray(json.jobs)) {
    throw new Error(
      "Unexpected Greenhouse API response: jobs is not an array."
    );
  }

  return json.jobs;
}