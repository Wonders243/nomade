export function getCanonicalProductSlug(
  product?: { slug?: string | number | null; id?: number | string | null } | null
): string {
  const rawSlug = product?.slug;
  const normalizedSlug =
    typeof rawSlug === "string"
      ? rawSlug.trim()
      : rawSlug != null
        ? String(rawSlug).trim()
        : "";

  if (normalizedSlug) {
    return normalizedSlug;
  }

  return product?.id != null ? String(product.id) : "";
}

export function getProductRoute(
  product?: { slug?: string | number | null; id?: number | string | null } | null
): string {
  const slug = getCanonicalProductSlug(product);
  return slug ? `/boutique/${slug}` : "/boutique";
}
