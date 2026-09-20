import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-blue-700 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="mx-auto inline-flex items-center rounded-full border border-blue-400/40 bg-blue-600/50 px-4 py-1.5 text-sm font-semibold text-blue-50">
            🔎 Search jobs from multiple sources
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Find Your Next Job
          </h1>

          <p className="mt-4 text-base leading-7 text-blue-100 sm:text-lg">
            HUNTARA brings job opportunities from multiple
            authorized sources into one simple search.
          </p>

          <form
            action="/jobs"
            method="get"
            className="mx-auto mt-8 max-w-4xl rounded-2xl bg-white p-3 shadow-xl sm:mt-10"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="home-keyword"
                  className="sr-only"
                >
                  Job title or keyword
                </label>

                <input
                  id="home-keyword"
                  name="keyword"
                  type="text"
                  placeholder="Job title or keyword"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="flex-1">
                <label
                  htmlFor="home-location"
                  className="sr-only"
                >
                  Location
                </label>

                <input
                  id="home-location"
                  name="location"
                  type="text"
                  placeholder="City or location"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-700 px-7 text-sm font-bold text-white transition hover:bg-blue-800 active:scale-[0.98]"
              >
                Search Jobs
              </button>
            </div>
          </form>

          <p className="mt-3 text-xs text-blue-200">
            Search jobs from HUNTARA&apos;s growing collection
            of authorized sources.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            How HUNTARA works
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Find opportunities from multiple sources without
            checking different websites one by one.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg">
              🔎
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              1. Search
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Search job opportunities from authorized job
              sources and employer feeds in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg">
              ⚙️
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              2. Filter
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Narrow your search by keyword, location,
              language, and remote-work options.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg">
              🚀
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              3. Apply
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open the job and continue your application on
              the original employer or source website.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-slate-900 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Ready to find your next opportunity?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Explore the latest jobs available on HUNTARA.
          </p>

          <Link
            href="/jobs"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
          >
            Browse Jobs →
          </Link>
        </div>
      </section>
    </div>
  );
}