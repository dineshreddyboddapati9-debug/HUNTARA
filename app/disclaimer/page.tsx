export const metadata = { title: "Disclaimer — HUNTARA" };

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Disclaimer</h1>
      <p className="mt-4 text-sm text-amber-700">
        Draft placeholder — this page must be replaced with reviewed content before HUNTARA goes live.
      </p>
      <p className="mt-4 text-gray-600">
        HUNTARA aggregates job listings from authorized third-party sources and employers. We do not
        independently verify every listing and are not responsible for the accuracy, legality, or
        outcome of any job posting or application. Users should exercise their own judgment before
        applying to or sharing information with any listed employer.
      </p>
    </div>
  );
}
