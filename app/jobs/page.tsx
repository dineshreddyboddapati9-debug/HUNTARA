"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Job {
  id: string;
  company_id: string | null;
  title: string;
  description: string;
  location: string | null;
  country: string | null;
  city: string | null;
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

function formatDate(date: string | null) {
  if (!date) return "";

  const published = new Date(date);
  const now = new Date();

  const difference =
    now.getTime() - published.getTime();

  const days = Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);

  if (months === 1) return "1 month ago";

  return `${months} months ago`;
}

function formatSalary(job: Job) {
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

  return `${currency} ${job.salary_max?.toLocaleString()}`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<
    Record<string, string>
  >({});

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  async function fetchJobs() {
    setLoading(true);

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
        is_remote,
        employment_type,
        salary_min,
        salary_max,
        salary_currency,
        apply_url,
        published_at
      `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("published_at", {
        ascending: false,
        nullsFirst: false,
      });

    if (keyword.trim()) {
      const search = keyword.trim();

      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (location.trim()) {
      const searchLocation = location.trim();

      query = query.or(
        `location.ilike.%${searchLocation}%,city.ilike.%${searchLocation}%,country.ilike.%${searchLocation}%`
      );
    }

    if (remoteOnly) {
      query = query.eq("is_remote", true);
    }

    const from = (page - 1) * JOBS_PER_PAGE;
    const to = from + JOBS_PER_PAGE - 1;

    const { data, error, count } =
      await query.range(from, to);

    if (error) {
      console.error("Failed to load jobs:", error);
      setJobs([]);
      setCompanies({});
      setTotalJobs(0);
      setLoading(false);
      return;
    }

    const loadedJobs = (data as Job[]) || [];

    setJobs(loadedJobs);
    setTotalJobs(count || 0);

    // Get company IDs from the jobs on this page.
    const companyIds = [
      ...new Set(
        loadedJobs
          .map((job) => job.company_id)
          .filter(
            (id): id is string => Boolean(id)
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
        .in("id", companyIds);

      if (companyError) {
        console.error(
          "Failed to load companies:",
          companyError
        );
        setCompanies({});
      } else {
        const companyMap: Record<string, string> = {};

        ((companyData as Company[]) || []).forEach(
          (company) => {
            companyMap[company.id] = company.name;
          }
        );

        setCompanies(companyMap);
      }
    } else {
      setCompanies({});
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchJobs();
  }, [page, remoteOnly]);

  function handleSearch(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setPage(1);
    fetchJobs();
  }

  const totalPages = Math.ceil(
    totalJobs / JOBS_PER_PAGE
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* Hero */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-12">

          <div className="max-w-3xl">

            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
              HUNTARA JOB SEARCH
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Find your next opportunity.
            </h1>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              Search thousands of jobs from multiple
              sources, all in one place.
            </p>

          </div>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60"
          >

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">

              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-500 focus-within:bg-white">

                <span className="mr-3 text-lg">
                  🔎
                </span>

                <input
                  type="text"
                  placeholder="Job title, skill or keyword"
                  value={keyword}
                  onChange={(event) =>
                    setKeyword(event.target.value)
                  }
                  className="w-full bg-transparent py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

              </div>

              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-500 focus-within:bg-white">

                <span className="mr-3 text-lg">
                  📍
                </span>

                <input
                  type="text"
                  placeholder="City, country or location"
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                  className="w-full bg-transparent py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

              </div>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Search Jobs
              </button>

            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 px-2 text-sm text-slate-600">

              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(event) => {
                  setRemoteOnly(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-slate-300"
              />

              Show remote jobs only

            </label>

          </form>

        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-7xl px-5 py-8">

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-xl font-bold text-slate-950">
              Latest jobs
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Finding jobs..."
                : `${totalJobs.toLocaleString()} jobs found`}
            </p>

          </div>

          {remoteOnly && (
            <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              Remote only
            </span>
          )}

        </div>

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading jobs...
            </p>

          </div>

        ) : jobs.length === 0 ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="text-4xl">
              🔎
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-950">
              No jobs found
            </h2>

            <p className="mt-2 text-slate-500">
              Try another keyword or location.
            </p>

          </div>

        ) : (

          <div className="space-y-4">

            {jobs.map((job) => {

              const salary = formatSalary(job);

              const companyName = job.company_id
                ? companies[job.company_id]
                : null;

              return (
                <article
                  key={job.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg md:p-6"
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                    <div className="min-w-0">

                      <div className="flex gap-4">

                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-600 sm:flex">

                          {companyName
                            ?.charAt(0)
                            ?.toUpperCase() || "H"}

                        </div>

                        <div className="min-w-0">

                          <h3 className="text-lg font-bold leading-7 text-slate-950 group-hover:text-blue-600">
                            {job.title}
                          </h3>

                          <p className="mt-1 font-medium text-slate-700">
                            {companyName || "Company"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">

                            {job.location && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                📍 {job.location}
                              </span>
                            )}

                            {job.is_remote && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                🌎 Remote
                              </span>
                            )}

                            {job.employment_type && (
                              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium capitalize text-violet-700">
                                {job.employment_type}
                              </span>
                            )}

                          </div>

                        </div>

                      </div>

                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                        {job.description
                          .replace(/<[^>]*>/g, "")
                          .slice(0, 320)}
                        ...
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">

                        {salary && (
                          <span className="font-semibold text-slate-700">
                            💰 {salary}
                          </span>
                        )}

                        {job.published_at && (
                          <span>
                            🕒{" "}
                            {formatDate(
                              job.published_at
                            )}
                          </span>
                        )}

                      </div>

                    </div>

                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      Apply Now →
                    </a>

                  </div>

                </article>
              );
            })}

          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (

          <div className="mt-10 flex items-center justify-center gap-4">

            <button
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              disabled={page === 1}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            <span className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              disabled={page === totalPages}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>

          </div>

        )}

      </section>

    </main>
  );
}