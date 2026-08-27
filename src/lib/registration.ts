import { createHash } from "node:crypto";

export function clubSlug(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || `verein-${createHash("sha1").update(value).digest("hex").slice(0, 10)}`;
}

export function uniqueClubSlug(name: string, suffix: number) {
  const base = clubSlug(name);
  return suffix === 0 ? base : `${base}-${suffix}`;
}
