import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  country: string | null;
  city: string | null;
  language: string | null;
  is_remote: boolean;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  apply_url: string;
  published_at: string | null;
}

function cleanJobDescription(description: string): string {
  return description
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(
      /<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<(p|div|li|h[1-6])\b[^>]*>/gi,
      ""
    )
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createSeoDescription(
  description: string,
  title: string,
  companyName: string
): string {
  const cleaned = cleanJobDescription(description)
    .replace(/\s+/g, " ")
    .trim();

  const base = cleaned
    ? `${title} at ${companyName}. ${cleaned}`
    : `${title} at ${companyName}. Find job details, location, employment information and apply through the original application page.`;

  return base.length > 155
    ? `${base.slice(0, 152).trim()}...`
    : base;
}

async function getJob(id: string) {
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      `
        id,
        company_id,
        title,
        description,
        location,
        country,
        city,
        language,
        is_remote,
        employment_type,
        salary_min,
        salary_max,
        salary_currency,
        apply_url,
        published_at
      `
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !job) {
    return null;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", job.company_id)
    .maybeSingle();

  return {
    job: job as Job,
    companyName:
      company?.name || "Company not specified",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const result = await getJob(id);

  if (!result) {
    return {
      title: "Job Not Found | HUNTARA",
      description:
        "This job is no longer available on HUNTARA.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { job, companyName } = result;

  const locationText =
    job.location ||
    job.city ||
    job.country ||
    "Location not specified";

  const seoDescription = createSeoDescription(
    job.description,
    job.title,
    companyName
  );

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://huntara.vercel.app";

  const canonicalUrl =
    `${siteUrl}/jobs/${job.id}`;

  return {
    title: `${job.title} at ${companyName} | HUNTARA`,
    description: seoDescription,

    keywords: [
      job.title,
      companyName,
      "jobs",
      "job openings",
      "careers",
      locationText,
      job.is_remote ? "remote jobs" : "",
    ].filter(Boolean),

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },

    openGraph: {
      title: `${job.title} at ${companyName}`,
      description: seoDescription,
      url: canonicalUrl,
      siteName: "HUNTARA",
      type: "website",
    },

    twitter: {
      card: "summary",
      title: `${job.title} at ${companyName}`,
      description: seoDescription,
    },
  };
}

function formatDate(date: string | null): string {
  if (!date) {
    return "Date unavailable";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSalary(job: Job): string | null {
  if (
    job.salary_min === null &&
    job.salary_max === null
  ) {
    return null;
  }

  const currency = job.salary_currency || "";

  if (
    job.salary_min !== null &&
    job.salary_max !== null
  ) {
    return `${currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`;
  }

  if (job.salary_min !== null) {
    return `${currency} ${job.salary_min.toLocaleString()}+`;
  }

  if (job.salary_max !== null) {
    return `Up to ${currency} ${job.salary_max.toLocaleString()}`;
  }

  return null;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getJob(id);

  if (!result) {
    notFound();
  }

  const { job: typedJob, companyName } =
    result;

  const description = cleanJobDescription(
    typedJob.description
  );

  const salary = formatSalary(typedJob);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Job Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <a
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Jobs
          </a>

          <div className="mt-8">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {typedJob.title}
              </h1>

              {typedJob.is_remote && (
                <span className="mt-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Remote
                </span>
              )}
            </div>

            <p className="mt-3 text-lg font-semibold text-slate-700">
              {companyName}
            </p>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              {typedJob.location && (
                <span>
                  📍 {typedJob.location}
                </span>
              )}

              {typedJob.employment_type && (
                <span>
                  💼 {typedJob.employment_type}
                </span>
              )}

              {typedJob.language && (
                <span>
                  🌐 {typedJob.language}
                </span>
              )}

              {salary && (
                <span>💰 {salary}</span>
              )}

              <span>
                Published{" "}
                {formatDate(
                  typedJob.published_at
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Job Content */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Description */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Job Description
            </h2>

            <div className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
              {description ||
                "Job description not available."}
            </div>
          </article>

          {/* Apply */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-bold text-slate-900">
              Interested in this job?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Apply through the original job
              application page.
            </p>

            <a
              href={typedJob.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
            >
              Apply Now
              <span>↗</span>
            </a>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              You will be redirected to the
              original application destination.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}