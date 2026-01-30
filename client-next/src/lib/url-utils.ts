/**
 * URL utilities for generating SEO-friendly search URLs
 */

/**
 * Converts a search query into a URL-friendly slug
 * Example: "Thai restaurants in LA" → "thai-restaurants-in-la"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
    .slice(0, 100);           // Limit length for URL friendliness
}

/**
 * Generates a search URL from query and list ID
 * Example: generateSearchUrl("Thai restaurants in LA", 123) → "/search/thai-restaurants-in-la/123"
 */
export function generateSearchUrl(query: string, listId: number): string {
  const slug = slugify(query);
  return `/search/${slug}/${listId}`;
}
