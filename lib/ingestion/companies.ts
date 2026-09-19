import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,'"]/g, "")
    .replace(
      /\b(gmbh|inc|ltd|llc|corp|corporation|limited)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function createCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function findOrCreateCompany(
  supabase: SupabaseClient,
  companyName: string
): Promise<string> {
  const originalName = companyName.trim();

  if (!originalName) {
    throw new Error("Company name cannot be empty.");
  }

  const normalizedIncoming =
    normalizeCompanyName(originalName);

  const { data: companies, error: searchError } =
    await supabase
      .from("companies")
      .select("id, name, slug")
      .limit(500);

  if (searchError) {
    throw new Error(
      `Failed to search companies: ${searchError.message}`
    );
  }

  const existingCompany = companies?.find(
    (company) =>
      normalizeCompanyName(company.name) ===
      normalizedIncoming
  );

  if (existingCompany) {
    return existingCompany.id;
  }

  const baseSlug =
    createCompanySlug(originalName) || "company";

  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const { data: existingSlug, error: slugError } =
      await supabase
        .from("companies")
        .select("id, name")
        .eq("slug", slug)
        .maybeSingle();

    if (slugError) {
      throw new Error(
        `Failed to check company slug: ${slugError.message}`
      );
    }

    if (!existingSlug) {
      break;
    }

    if (
      normalizeCompanyName(existingSlug.name) ===
      normalizedIncoming
    ) {
      return existingSlug.id;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const { data: newCompany, error: insertError } =
    await supabase
      .from("companies")
      .upsert(
        {
          name: originalName,
          slug,
        },
        {
          onConflict: "slug",
          ignoreDuplicates: true,
        }
      )
      .select("id")
      .maybeSingle();

  if (insertError) {
    throw new Error(
      `Failed to create company: ${insertError.message}`
    );
  }

  if (newCompany) {
    return newCompany.id;
  }

  const { data: existingAfterInsert, error: retryError } =
    await supabase
      .from("companies")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

  if (retryError) {
    throw new Error(
      `Failed to find company after insert: ${retryError.message}`
    );
  }

  if (!existingAfterInsert) {
    throw new Error(
      "Company could not be created or found after insert."
    );
  }

  return existingAfterInsert.id;
}