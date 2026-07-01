// Ordered catalog display groups (one sidebar entry each).
// `slugs` = backend category_path values whose products are merged under this group.
// `key`   = i18n label/desc key (categories.<key>) and the :category route param value.
export const catalogGroups = [
  { key: 'yarn',           slugs: ['yarn'],               icon: 'color-wand-outline' },
  { key: 'threadString',   slugs: ['thread', 'strings'],  icon: 'git-network-outline' },
  { key: 'elastics',       slugs: ['elastics'],           icon: 'ellipse-outline' },
  { key: 'ribbons',        slugs: ['ribbons'],            icon: 'ribbon-outline' },
  { key: 'needles',        slugs: ['needles'],            icon: 'medical-outline' },
  { key: 'scissorsKnifes', slugs: ['scissors', 'knifes'], icon: 'cut-outline' },
  { key: 'tools',          slugs: ['tools'],              icon: 'construct-outline' },
  { key: 'decorative',     slugs: ['decorative'],         icon: 'sparkles-outline' },
  { key: 'colors',         slugs: ['colors'],             icon: 'color-palette-outline' },
  // Appended — not in the primary 9 but kept browsable
  { key: 'beads',          slugs: ['beads'],              icon: 'radio-button-on-outline' },
  { key: 'flora',          slugs: ['flora'],              icon: 'leaf-outline' },
];

// Resolve a :category route value to a group. Falls back to a single-slug group
// so legacy links (e.g. featured-categories using a raw slug) keep working.
export function resolveCategoryGroup(key) {
  if (!key) return null;
  const lower = String(key).toLowerCase().trim();
  return catalogGroups.find(g => g.key.toLowerCase() === lower)
      || { key, slugs: [key], icon: 'grid-outline' };
}

// Map a raw backend category slug (e.g. 'strings') to the display group key it
// belongs to (e.g. 'threadString'), so products can be grouped under the same
// headings used on the retail catalog. Falls back to the slug itself.
export function slugToGroupKey(slug) {
  if (!slug) return 'other';
  const lower = String(slug).toLowerCase().trim();
  const group = catalogGroups.find(g => g.slugs.includes(lower));
  return group ? group.key : lower;
}

// Group a list of items by their display group key, ordered to match
// catalogGroups (unmapped groups are appended in their original order).
// `getSlug` extracts the raw category slug from each item.
export function groupByDisplayGroup(items, getSlug) {
  const grouped = {};
  items.forEach((item) => {
    const key = slugToGroupKey(getSlug(item));
    (grouped[key] = grouped[key] || []).push(item);
  });
  const ordered = {};
  catalogGroups.forEach((g) => { if (grouped[g.key]) ordered[g.key] = grouped[g.key]; });
  Object.keys(grouped).forEach((k) => { if (!ordered[k]) ordered[k] = grouped[k]; });
  return ordered;
}
