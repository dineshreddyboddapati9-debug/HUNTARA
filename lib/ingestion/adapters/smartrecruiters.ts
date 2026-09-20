export interface SmartRecruitersPostingSummary {
  id: string;
  name: string;
  releasedDate?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    fullLocation?: string;
    remote?: boolean;
  };
  typeOfEmployment?: {
    label?: string;
  };
  refNumber?: string;
  uuid?: string;
}

export interface SmartRecruitersPostingDetails
  extends SmartRecruitersPostingSummary {
  postingUrl?: string;
  applyUrl?: string;
  active?: boolean;
  visibility?: string;
  language?: {
    code?: string;
    label?: string;
  };
  jobAd?: {
    sections?: {
      companyDescription?: {
        title?: string;
        text?: string;
      };
      jobDescription?: {
        title?: string;
        text?: string;
      };
      qualifications?: {
        title?: string;
        text?: string;
      };
      additionalInformation?: {
        title?: string;
        text?: string;
      };
    };
  };
}

interface SmartRecruitersPostingsResponse {
  content?: SmartRecruitersPostingSummary[];
  totalFound?: number;
  offset?: number;
  limit?: number;
}

const API_BASE_URL = "https://api.smartrecruiters.com/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `SmartRecruiters API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchSmartRecruitersPostings(
  companyIdentifier: string
): Promise<SmartRecruitersPostingSummary[]> {
  const limit = 100;
  let offset = 0;
  const allPostings: SmartRecruitersPostingSummary[] = [];

  while (true) {
    const url =
      `${API_BASE_URL}/companies/${encodeURIComponent(companyIdentifier)}/postings` +
      `?limit=${limit}&offset=${offset}`;

    const data = await fetchJson<SmartRecruitersPostingsResponse>(url);

    const postings = data.content || [];

    allPostings.push(...postings);

    if (postings.length < limit) {
      break;
    }

    offset += limit;
  }

  return allPostings;
}

export async function fetchSmartRecruitersPosting(
  companyIdentifier: string,
  postingId: string
): Promise<SmartRecruitersPostingDetails> {
  const url =
    `${API_BASE_URL}/companies/${encodeURIComponent(companyIdentifier)}` +
    `/postings/${encodeURIComponent(postingId)}`;

  return fetchJson<SmartRecruitersPostingDetails>(url);
}