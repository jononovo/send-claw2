# Bundle Analysis Report

Generated: January 3, 2026

## Build Output Summary

### Main Chunks (sorted by gzipped size)

| Chunk | Uncompressed | Gzipped |
|-------|-------------|---------|
| index (main bundle) | 1,312 KB | 434 KB |
| company-details | 377 KB | 104 KB |
| home | 210 KB | 53 KB |
| blog-post | 121 KB | 37 KB |
| form | 81 KB | 22 KB |
| Streak | 81 KB | 19 KB |
| index (recharts) | 65 KB | 16 KB |
| popover | 55 KB | 16 KB |
| index (framer) | 36 KB | 14 KB |
| ContactListDetail | 41 KB | 13 KB |
| blog-data | 37 KB | 13 KB |
| prompt-editor | 37 KB | 9 KB |
| CampaignDetail | 36 KB | 8 KB |

### CSS
| File | Uncompressed | Gzipped |
|------|-------------|---------|
| index.css | 182 KB | 27 KB |

### Images (WebP conversions complete)
- 3d_cute_duckling_mascot_edited.webp: 95 KB
- abstract_3d_sales_background.jpg: 59 KB
- deal_flow_v6_transparent.webp: 48 KB
- email-notification-no-bg-crop.webp: 43 KB
- sales_meeting_v9_transparent.webp: 39 KB

## Key Observations

1. **Main bundle (434 KB gzipped)** contains:
   - React + ReactDOM (~45 KB gzipped)
   - Firebase Auth + App (~100 KB gzipped)
   - Framer Motion (~20 KB gzipped)
   - TanStack Query (~15 KB gzipped)
   - All shared components and utilities

2. **Vite is already code-splitting** route-level chunks:
   - Landing pages are lazy-loaded ✓
   - company-details, home, blog-post are separate chunks

3. **Largest dependencies in main bundle:**
   - Firebase (auth + app)
   - Framer Motion
   - Radix UI primitives
   - React Hook Form + Zod

## Recommended Optimizations

### High Impact
1. **Add manual vendor chunks** - Split Firebase, Framer Motion, React into cached vendor bundles
2. **Lazy-load Firebase** in AuthProvider - Marketing visitors don't need it immediately

### Medium Impact
3. **Split Recharts** - Only load for pages with charts (Streak, company-details)
4. **Review company-details chunk** - 104 KB gzipped is large for a single page

### Low Priority (already optimized or minimal impact)
- Landing pages already lazy-loaded ✓
- Images converted to WebP ✓
- Compression enabled ✓
- react-icons removed ✓

## Total Bundle Size

**Initial load (landing page):**
- JS: ~434 KB gzipped (main bundle)
- CSS: ~27 KB gzipped
- Images: ~300 KB (landing page assets)
- **Total: ~760 KB**

With vendor chunking, returning visitors would only need to download app code (~200 KB) while vendor chunks stay cached.
