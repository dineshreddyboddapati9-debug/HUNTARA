"use client";

import { useEffect, useState } from "react";
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

interface Company {
  id: string;
  name: string;
}

const JOBS_PER_PAGE = 20;

const LANGUAGE_OPTIONS = [
  "English",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Portuguese",
  "Dutch",
  "Japanese",
  "Korean",
  "Chinese",
];

function cleanJobDescription(
  description: string
): string {
  let cleaned = description;

  for (let i = 0; i < 5; i++) {
    const textarea =
      document.createElement("textarea");

    textarea.innerHTML = cleaned;

    const decoded = textarea.value;

    if (decoded === cleaned) {
      break;
    }

    cleaned = decoded;
  }

  cleaned = cleaned
    .replace(
      /<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi,
      " "
    )
    .replace(
      /<(p|div|li|h[1-6])\b[^>]*>/gi,
      ""
    )
    .replace(/<[^>]*>/g, "");

  const textarea =
    document.createElement("textarea");

  textarea.innerHTML = cleaned;

  return textarea.value
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(
  date: string | null
): string {
  if (!date) {
    return "Date unavailable";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatSalary(
  job: Job
): string | null {
  if (
    job.salary_min === null &&
    job.salary_max === null
  ) {
    return null;
  }

  const currency =
    job.salary_currency || "";

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

export default function JobsPage() {
  const [jobs, setJobs] =
    useState<Job[]>([]);

  const [companies, setCompanies] =
    useState<Record<string, string>>({});

  const [keyword, setKeyword] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [language, setLanguage] =
    useState("");

  const [remoteOnly, setRemoteOnly] =
    useState(false);

  const [page, setPage] =
    useState(1);

  const [totalJobs, setTotalJobs] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError("");

      try {
        let query = supabase
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
            `,
            {
              count: "exact",
            }
          )
          .eq("is_active", true);

        /*
         * Keyword search:
         * Search job title, description,
         * and company name.
         */
        if (keyword.trim()) {
          const searchTerm =
            keyword.trim();

          const safeSearchTerm =
            searchTerm.replace(
              /[%_,()]/g,
              " "
            );

          const searchPattern =
            `%${safeSearchTerm}%`;

          /*
           * First find companies whose
           * names match the keyword.
           */
          const {
            data: matchingCompanies,
            error: companySearchError,
          } = await supabase
            .from("companies")
            .select("id")
            .ilike(
              "name",
              searchPattern
            );

          if (companySearchError) {
            throw companySearchError;
          }

          const companyIds =
            (matchingCompanies || []).map(
              (company) => company.id
            );

          /*
           * Build the OR search.
           *
           * Search:
           * 1. Job title
           * 2. Job description
           * 3. Company ID
           */
          const searchConditions = [
            `title.ilike.${searchPattern}`,
            `description.ilike.${searchPattern}`,
          ];

          if (companyIds.length > 0) {
            searchConditions.push(
              `company_id.in.(${companyIds.join(",")})`
            );
          }

          query = query.or(
            searchConditions.join(",")
          );
        }

        if (location.trim()) {
          query = query.ilike(
            "location",
            `%${location.trim()}%`
          );
        }

        if (language) {
          if (language === "Unknown") {
            query = query.is(
              "language",
              null
            );
          } else {
            query = query.eq(
              "language",
              language
            );
          }
        }

        if (remoteOnly) {
          query = query.eq(
            "is_remote",
            true
          );
        }

        const from =
          (page - 1) *
          JOBS_PER_PAGE;

        const to =
          from +
          JOBS_PER_PAGE -
          1;

        const {
          data,
          error: jobsError,
          count,
        } = await query
          .order(
            "published_at",
            {
              ascending: false,
              nullsFirst: false,
            }
          )
          .range(from, to);

        if (jobsError) {
          throw jobsError;
        }

        const loadedJobs =
          (data as Job[]) || [];

        setJobs(loadedJobs);
        setTotalJobs(count || 0);

        const companyIds = [
          ...new Set(
            loadedJobs.map(
              (job) => job.company_id
            )
          ),
        ];

        if (companyIds.length > 0) {
          const {
            data: companyData,
            error: companyError,
          } = await supabase
            .from("companies")
            .select("id, name")
            .in(
              "id",
              companyIds
            );

          if (companyError) {
            throw companyError;
          }

          const companyMap: Record<
            string,
            string
          > = {};

          (
            (companyData as Company[]) ||
            []
          ).forEach(
            (company) => {
              companyMap[
                company.id
              ] = company.name;
            }
          );

          setCompanies(
            companyMap
          );
        } else {
          setCompanies({});
        }
      } catch (err) {
        console.error(
          "Failed to load jobs:",
          err
        );

        setError(
          "Unable to load jobs right now. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [
    keyword,
    location,
    language,
    remoteOnly,
    page,
  ]);

  function handleKeywordChange(
    value: string
  ) {
    setKeyword(value);
    setPage(1);
  }

  function handleLocationChange(
    value: string
  ) {
    setLocation(value);
    setPage(1);
  }

  function handleLanguageChange(
    value: string
  ) {
    setLanguage(value);
    setPage(1);
  }

  function handleRemoteChange(
    value: boolean
  ) {
    setRemoteOnly(value);
    setPage(1);
  }

  function clearFilters() {
    setKeyword("");
    setLocation("");
    setLanguage("");
    setRemoteOnly(false);
    setPage(1);
  }

  const totalPages =
    Math.ceil(
      totalJobs /
        JOBS_PER_PAGE
    );

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
              🔎 Search jobs from multiple sources
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Find Your Next Job
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Discover relevant opportunities from
              employers and job sources in one simple
              search.
            </p>
          </div>

          {/* Search Box */}
          <div className="mx-auto mt-10 max-w-6xl rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/50">
            <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_0.8fr_auto]">
              {/* Keyword */}
              <div className="relative">
                <label
                  htmlFor="keyword"
                  className="sr-only"
                >
                  Keyword
                </label>

                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  🔍
                </div>

                <input
                  id="keyword"
                  type="text"
                  value={keyword}
                  onChange={(event) =>
                    handleKeywordChange(
                      event.target.value
                    )
                  }
                  placeholder="Job title, skill or keyword"
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* Location */}
              <div className="relative">
                <label
                  htmlFor="location"
                  className="sr-only"
                >
                  Location
                </label>

                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  📍
                </div>

                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(event) =>
                    handleLocationChange(
                      event.target.value
                    )
                  }
                  placeholder="City or location"
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* Language */}
              <div className="relative">
                <label
                  htmlFor="language"
                  className="sr-only"
                >
                  Language
                </label>

                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  🌐
                </div>

                <select
                  id="language"
                  value={language}
                  onChange={(event) =>
                    handleLanguageChange(
                      event.target.value
                    )
                  }
                  className="h-14 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">
                    All Languages
                  </option>

                  {LANGUAGE_OPTIONS.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}

                  <option value="Unknown">
                    Not Specified
                  </option>
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                  ▼
                </div>
              </div>

              {/* Search button */}
              <button
                type="button"
                className="h-14 rounded-xl bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
              >
                Search Jobs
              </button>
            </div>

            {/* Remote */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-2 pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(event) =>
                    handleRemoteChange(
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />

                <span>
                  Remote jobs only
                </span>
              </label>

              {(keyword ||
                location ||
                language ||
                remoteOnly) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Job results */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Latest Job Opportunities
            </h2>

            {!loading && (
              <p className="mt-1 text-sm text-slate-500">
                {totalJobs.toLocaleString()} jobs
                available
              </p>
            )}
          </div>

          {language && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              🌐 {language}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="h-6 w-2/3 rounded bg-slate-200" />

                  <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />

                  <div className="mt-5 h-4 w-full rounded bg-slate-200" />

                  <div className="mt-2 h-4 w-5/6 rounded bg-slate-200" />

                  <div className="mt-6 h-10 w-28 rounded bg-slate-200" />
                </div>
              )
            )}
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          jobs.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                🔎
              </div>

              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                No jobs found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try changing your keyword,
                location, language, or remote
                filter.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          )}

        {/* Jobs */}
        {!loading &&
          !error &&
          jobs.length > 0 && (
            <div className="space-y-4">
              {jobs.map((job) => {
                const description =
                  cleanJobDescription(
                    job.description
                  );

                const salary =
                  formatSalary(job);

                return (
                  <article
                    key={job.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {/* Title */}
                        <div className="flex flex-wrap items-start gap-2">
                          <h3 className="text-xl font-bold leading-7 text-slate-900 transition group-hover:text-blue-700">
                            {job.title}
                          </h3>

                          {job.is_remote && (
                            <span className="mt-0.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Remote
                            </span>
                          )}

                          {job.language && (
                            <span className="mt-0.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              {job.language}
                            </span>
                          )}
                        </div>

                        {/* Company */}
                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {companies[
                            job.company_id
                          ] ||
                            "Company not specified"}
                        </p>

                        {/* Metadata */}
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                          {job.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <span>
                                📍
                              </span>
                              {job.location}
                            </span>
                          )}

                          {job.employment_type && (
                            <span className="inline-flex items-center gap-1.5">
                              <span>
                                💼
                              </span>
                              {
                                job.employment_type
                              }
                            </span>
                          )}

                          {salary && (
                            <span className="inline-flex items-center gap-1.5">
                              <span>
                                💰
                              </span>
                              {salary}
                            </span>
                          )}

                          {job.language && (
                            <span className="inline-flex items-center gap-1.5">
                              <span>
                                🌐
                              </span>
                              {job.language}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-600">
                          {description.slice(
                            0,
                            340
                          )}
                          {description.length >
                          340
                            ? "..."
                            : ""}
                        </p>

                        {/* Published */}
                        <div className="mt-5 text-xs text-slate-400">
                          Published{" "}
                          {formatDate(
                            job.published_at
                          )}
                        </div>
                      </div>

                      {/* Apply */}
                      <div className="flex shrink-0 items-center lg:pt-1">
                        <a
                          href={
                            job.apply_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md lg:w-auto"
                        >
                          Apply Now
                          <span className="transition-transform group-hover:translate-x-0.5">
                            →
                          </span>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        {/* Pagination */}
        {!loading &&
          !error &&
          totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page === 1}
                onClick={() =>
                  setPage(
                    (current) =>
                      current - 1
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>

              <div className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
                Page{" "}
                <span className="font-semibold text-slate-900">
                  {page}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {totalPages}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  page === totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
      </section>
    </main>
  );
}