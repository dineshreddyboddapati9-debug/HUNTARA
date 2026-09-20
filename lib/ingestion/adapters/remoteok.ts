export interface RemoteOkJob {
  id?: number;
  slug?: string;
  company?: string;
  position?: string;
  description?: string;
  location?: string;
  date?: string;
  url?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  logo?: string;
  apply_url?: string;
}

type RemoteOkApiResponse = RemoteOkJob[] | RemoteOkJob;

export async function fetchRemoteOkJobs(): Promise<RemoteOkJob[]> {
  const response = await fetch("https://remoteok.com/api", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "HUNTARA Job Aggregator",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Remote OK API failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RemoteOkApiResponse;

  if (!Array.isArray(data)) {
    throw new Error("Remote OK API returned an unexpected response format");
  }

  return data.filter(
    (item): item is RemoteOkJob =>
      typeof item === "object" &&
      item !== null &&
      ("position" in item || "company" in item)
  );
}