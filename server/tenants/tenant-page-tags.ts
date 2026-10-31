import { getTenantConfigFromHost } from "./index";

function escapeAttribute(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * client/index.html holds one set of title, description, share, icon and organization tags. Link
 * previews and many crawlers don't run JavaScript, so the server writes the tenant's own values into
 * the page before sending it. The browser's tenant context sets the same values once it loads.
 */
export function applyTenantPageTags(html: string, hostname: string): string {
  const { branding, meta } = getTenantConfigFromHost(hostname);

  const contentTags: Array<[attribute: "name" | "property", key: string, content: string]> = [
    ["name", "description", meta.description],
    ["property", "og:title", meta.title],
    ["property", "og:description", meta.description],
    ["property", "og:image", meta.ogImage],
    ["property", "og:url", meta.url],
    ["property", "og:site_name", branding.name],
    ["name", "twitter:title", meta.title],
    ["name", "twitter:description", meta.description],
    ["name", "twitter:image", meta.twitterImage],
  ];

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: branding.name,
    url: meta.url,
    logo: { "@type": "ImageObject", url: new URL(branding.logo, meta.url).href },
    description: meta.description,
    sameAs: [],
  };

  let page = html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeAttribute(meta.title)}</title>`)
    .replace(/<link rel="icon" href="[^"]*"\s*\/?>/, () => `<link rel="icon" href="${escapeAttribute(branding.favicon)}" />`)
    // The template's sizes describe a different image, and crawlers read the size from the image itself
    .replace(/\s*<meta property="og:image:(width|height)"[^>]*>/g, "")
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      () => `<script type="application/ld+json">${JSON.stringify(organization).replace(/</g, "\\u003c")}</script>`,
    );

  for (const [attribute, key, content] of contentTags) {
    page = page.replace(
      new RegExp(`<meta ${attribute}="${key}"[^>]*>`),
      () => `<meta ${attribute}="${key}" content="${escapeAttribute(content)}">`,
    );
  }

  return page;
}
