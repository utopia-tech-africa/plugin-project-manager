export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const uniqueSlugs = (names: string[]): string[] => {
  const used = new Set<string>();
  return names.map((name) => {
    const base = slugify(name) || "phase";
    let slug = base;
    let n = 2;
    while (used.has(slug)) {
      const suffix = `-${String(n)}`;
      slug = `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
      n += 1;
    }
    used.add(slug);
    return slug;
  });
};
