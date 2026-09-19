import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,'"]/g, "")
    .replace(/\b(gmbh|inc|ltd|llc|corp|corporation|limited)\b/g, "")
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

  const normalizedIncoming = normalizeCompanyName(originalName);

  const { data: companies, error: searchError } = await supabase
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
      normalizeCompanyName(company.name) === normalizedIncoming
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
        .select("id")
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

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const { data: newCompany, error: insertError } =
    await supabase
      .from("companies")
      .insert({
        name: originalName,
        slug,
      })
      .select("id")
      .single();

  if (insertError || !newCompany) {
    throw new Error(
      `Failed to create company: ${
        insertError?.message ?? "Unknown error"
      }`
    );
  }

  return newCompany.id;
}