export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const uniqueSlug = (value: string, used: Set<string>): string => {
  const base = slugify(value) || "phase";
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    const suffix = `-${String(n)}`;
    slug = `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(slug);
  return slug;
};

export const formatProjectPublicId = (sequence: number): string =>
  `PRJ-${String(sequence).padStart(4, "0")}`;

export const formatPhasePublicId = (
  projectPublicId: string,
  slug: string,
  attempt: number,
): string => {
  const phaseSlug = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  if (attempt <= 1) {
    return `${projectPublicId}-${phaseSlug}`;
  }
  return `${projectPublicId}-${phaseSlug}-${String(attempt)}`;
};
