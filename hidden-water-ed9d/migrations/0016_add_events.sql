-- Workshops and market appearances, moved out of the frontend.
--
-- These were a hardcoded array in EventPage.vue, which meant the "Coming Soon"
-- card could only be changed by a developer — and a stale "coming soon" is exactly
-- the credibility problem this round of work is trying to fix. Now staff own it.
--
-- Media keys point at the web-utils bucket (served under /utils/), which is where
-- the existing event photos and clips already live.

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_th TEXT,
    -- Free text, not a date: real entries read "December 13-14, 2025" or
    -- "Stay Tuned!". starts_on below is the sortable one.
    date_label TEXT,
    date_label_th TEXT,
    cover_image_key TEXT,
    description TEXT,
    description_th TEXT,
    location TEXT,
    location_th TEXT,
    -- Also free text: "50+", "Limited Seats".
    participants TEXT,
    participants_th TEXT,
    -- JSON array of {type: 'image'|'video', src, title} — the popup gallery.
    -- Kept as JSON for the same reason as projects.product_ids: small, ordered,
    -- only ever read as a whole.
    gallery TEXT DEFAULT '[]',
    -- Renders the dashed "Coming Soon" treatment and the notify-me teaser instead
    -- of a media gallery.
    is_upcoming INTEGER DEFAULT 0,
    is_visible INTEGER DEFAULT 1,
    -- Sort key. Upcoming events sort last so the grid reads chronologically and
    -- ends on what is next.
    starts_on DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_visible ON events (is_visible, starts_on);
