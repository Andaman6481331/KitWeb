-- The four workshops that were hardcoded in EventPage.vue, plus the "Coming Soon"
-- card, lifted into D1 verbatim — with Thai copy added, which the array never had.
--
-- One change of substance: the NEXTOPIA row is seeded with is_visible = 0. Its
-- media (eventC_tn / eventC_2 / eventC_3 / eventC_0.mp4 / eventC_1.mp4) returns 404
-- from the bucket — it was referenced but never uploaded, so that card has been
-- rendering a broken image on the live site. Upload the files and flip the row
-- visible in the admin panel.
--
-- Re-runnable: each insert is guarded on title.

INSERT INTO events (title, title_th, date_label, date_label_th, cover_image_key, description, description_th,
                    location, location_th, participants, gallery, is_upcoming, is_visible, starts_on)
SELECT
    'KitCraft DIY Workshop | Libi Home Cafe',
    'เวิร์กช็อป KitCraft DIY | Libi Home Cafe',
    'December 13-14, 2025',
    '13-14 ธันวาคม 2568',
    'eventA_tn-large.webp',
    'A fun casual workshop of our DIY beads collection and handcrafted accessories.',
    'เวิร์กช็อปสบาย ๆ กับคอลเลกชันลูกปัด DIY และเครื่องประดับทำมือของเรา',
    'Libi Home Cafe, Bangkok',
    'Libi Home Cafe กรุงเทพฯ',
    '50+',
    '[{"type":"video","src":"eventA_0.mp4","title":"KitCraft Weekend Vibes"},{"type":"image","src":"eventA_1-large.webp","title":""},{"type":"image","src":"eventA_2-large.webp","title":""},{"type":"image","src":"eventA_3-large.webp","title":""},{"type":"image","src":"eventA_4-large.webp","title":""},{"type":"image","src":"eventA_5-large.webp","title":""},{"type":"image","src":"eventA_6-large.webp","title":""},{"type":"image","src":"eventA_7-large.webp","title":""},{"type":"image","src":"eventA_8-large.webp","title":""},{"type":"image","src":"eventA_9-large.webp","title":""}]',
    0, 1, '2025-12-13'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'KitCraft DIY Workshop | Libi Home Cafe');

INSERT INTO events (title, title_th, date_label, date_label_th, cover_image_key, description, description_th,
                    location, location_th, participants, gallery, is_upcoming, is_visible, starts_on)
SELECT
    'KIN KAN CRAFTS | THE LUENRIT STREET CRAFTS',
    'KIN KAN CRAFTS | งานคราฟต์ถนนเลื่อนฤทธิ์',
    'February 7-8, 2026',
    '7-8 กุมภาพันธ์ 2569',
    'eventB_tn-large.webp',
    'An interactive premium showcase of our handcrafted accessories, custom DIY crochet sets, and wholesale yarn creations.',
    'นิทรรศการพรีเมียมแบบมีส่วนร่วม รวมเครื่องประดับทำมือ ชุดโครเชต์ DIY สั่งทำ และงานไหมพรมขายส่งของเรา',
    'The Luenrit, Yaowarat, Bangkok',
    'เลื่อนฤทธิ์ เยาวราช กรุงเทพฯ',
    '80+',
    '[{"type":"image","src":"eventB_2-large.webp","title":"Craft Showcase & Beads"},{"type":"image","src":"eventB_3-large.webp","title":"Premium Yarn Detail"},{"type":"video","src":"eventB_0.mp4","title":"Grand Showcase Walkthrough"},{"type":"video","src":"eventB_1.mp4","title":"Craft Workshop Highlights"}]',
    0, 1, '2026-02-07'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'KIN KAN CRAFTS | THE LUENRIT STREET CRAFTS');

INSERT INTO events (title, title_th, date_label, date_label_th, cover_image_key, description, description_th,
                    location, location_th, participants, gallery, is_upcoming, is_visible, starts_on)
SELECT
    'Vibe ก่อน Craft | Culture Connex Yaowarat Street',
    'Vibe ก่อน Craft | Culture Connex เยาวราช',
    'June 20-21 & 27-28, 2026',
    '20-21 และ 27-28 มิถุนายน 2569',
    'eventB_tn-large.webp',
    'Vibing with our DIY bead sets and handcrafted accessories in a cozy intimate setting. Local artists and crafters gather to share their passion for handmade creations.',
    'มาชิลกับชุดลูกปัด DIY และเครื่องประดับทำมือในบรรยากาศอบอุ่นเป็นกันเอง ศิลปินและช่างฝีมือในย่านมารวมตัวแบ่งปันความชอบในงานทำมือ',
    'Culture Connex, Yaowarat, Bangkok',
    'Culture Connex เยาวราช กรุงเทพฯ',
    '50+',
    '[{"type":"image","src":"eventB_2-large.webp","title":"Craft Showcase & Beads"},{"type":"image","src":"eventB_3-large.webp","title":"Premium Yarn Detail"},{"type":"video","src":"eventB_0.mp4","title":"Grand Showcase Walkthrough"},{"type":"video","src":"eventB_1.mp4","title":"Craft Workshop Highlights"}]',
    0, 1, '2026-06-20'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Vibe ก่อน Craft | Culture Connex Yaowarat Street');

-- Hidden until its photos exist in the bucket. See the note at the top.
INSERT INTO events (title, title_th, date_label, date_label_th, cover_image_key, description, description_th,
                    location, location_th, participants, gallery, is_upcoming, is_visible, starts_on)
SELECT
    'NEXTOPIA ECO & CRAFTS FESTIVAL | SIAM PARAGON',
    'เทศกาล NEXTOPIA ECO & CRAFTS | สยามพารากอน',
    'July 25-31, 2026',
    '25-31 กรกฎาคม 2569',
    'eventC_tn-large.webp',
    'Make your own cute little puppy with eco-friendly crafts in the center of Bangkok! KitCraft joins Nextopia to build an eco-conscious community of people who share your passion for the environment.',
    'มาทำตุ๊กตาน้องหมาตัวน้อยด้วยงานคราฟต์รักษ์โลก ใจกลางกรุงเทพฯ KitCraft ร่วมกับ Nextopia สร้างคอมมูนิตี้ที่ใส่ใจสิ่งแวดล้อมไปด้วยกัน',
    'Siam Paragon, Bangkok',
    'สยามพารากอน กรุงเทพฯ',
    '120+',
    '[{"type":"image","src":"eventC_2-large.webp","title":"Eco-Friendly Crafts"},{"type":"image","src":"eventC_3-large.webp","title":"Sustainable Living Booth"},{"type":"video","src":"eventC_0.mp4","title":"Festival Highlights"},{"type":"video","src":"eventC_1.mp4","title":"Workshop Sessions"}]',
    0, 0, '2026-07-25'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'NEXTOPIA ECO & CRAFTS FESTIVAL | SIAM PARAGON');

-- The teaser card. is_upcoming sorts it last and swaps the media gallery for the
-- notify-me treatment. It was English-only in the array; it is not any more.
INSERT INTO events (title, title_th, date_label, date_label_th, cover_image_key, description, description_th,
                    location, location_th, participants, participants_th, gallery, is_upcoming, is_visible, starts_on)
SELECT
    'Cozy Crochet & Vibing Workshop',
    'เวิร์กช็อปโครเชต์ชิล ๆ',
    'Stay Tuned!',
    'รอติดตาม!',
    -- No cover: the page falls back to its bundled teaser image, which is where
    -- this card's artwork lives today (it was never uploaded to the bucket).
    NULL,
    'We are preparing our next intimate DIY workshop! Learn advanced crochet techniques while enjoying premium teas and sweets.',
    'เรากำลังเตรียมเวิร์กช็อป DIY กลุ่มเล็กครั้งต่อไป มาเรียนเทคนิคโครเชต์ขั้นสูงพร้อมจิบชาและของหวานชั้นดี',
    'Bangkok (Secret Location)',
    'กรุงเทพฯ (สถานที่ลับ)',
    'Limited Seats',
    'ที่นั่งจำกัด',
    '[]',
    1, 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Cozy Crochet & Vibing Workshop');
