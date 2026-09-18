export default function HomePage() {
  return (
    <div>
      <section className="bg-blue-700 py-20 text-center text-white">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-bold sm:text-5xl">HUNTARA</h1>
          <p className="mt-3 text-lg text-blue-100">Find Your Next Job, Every Day.</p>

          {/* Search bar — becomes functional in Phase 5 */}
          <form className="mt-8 flex flex-col gap-3 rounded-lg bg-white p-3 shadow-lg sm:flex-row">
            <input
              type="text"
              placeholder="Job title or keyword"
              disabled
              className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-gray-900"
            />
            <input
              type="text"
              placeholder="Location"
              disabled
              className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-gray-900"
            />
            <button
              type="submit"
              disabled
              className="rounded-md bg-blue-700 px-6 py-3 font-semibold text-white opacity-70"
            >
              Search
            </button>
          </form>
          <p className="mt-2 text-xs text-blue-200">Search becomes active in Phase 5.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">How HUNTARA works</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold">1. Search</h3>
            <p className="mt-2 text-gray-600">
              Search jobs aggregated from authorized job sources and employer feeds in one place.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">2. Compare</h3>
            <p className="mt-2 text-gray-600">
              Filter by location, remote status, salary, and experience level.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">3. Apply</h3>
            <p className="mt-2 text-gray-600">
              Click &quot;Apply Now&quot; and finish your application on the original employer or source
              website.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-semibold">Coming soon</h2>
        <p className="mt-2 text-gray-600">
          Live job listings, filters, saved jobs, and alerts arrive in Phases 4–8. This page is a
          structural placeholder built in Phase 2.
        </p>
      </section>
    </div>
  );
}
