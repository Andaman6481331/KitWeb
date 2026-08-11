-- Mock color list for Color of the Month.
--
-- Six months of color stories, newest active. Every product_ids entry is a real
-- id from the live catalog, chosen so the rail actually looks like the color it
-- claims. Re-runnable: each insert is guarded on color_name.

INSERT INTO spotlights (color_name, color_name_th, hex, blurb, blurb_th, product_ids, is_active, starts_on)
SELECT
    'Terracotta',
    'สีดินเผา',
    '#C4694E',
    'Warm, earthy and forgiving — terracotta sits happily next to raw cotton, brass and unbleached linen. It is the shade we keep reaching for when a piece needs to feel handmade rather than manufactured.',
    'อบอุ่น เป็นธรรมชาติ และเข้ากับทุกอย่าง สีดินเผาเข้ากันได้ดีกับฝ้ายดิบ ทองเหลือง และผ้าลินินไม่ฟอกสี เป็นเฉดที่เราหยิบมาใช้เสมอเมื่ออยากให้งานดูเหมือนงานทำมือมากกว่างานโรงงาน',
    '[159,157,106,77]',
    1,
    '2026-08-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM spotlights WHERE color_name = 'Terracotta');

INSERT INTO spotlights (color_name, color_name_th, hex, blurb, blurb_th, product_ids, is_active, starts_on)
SELECT
    'Sky Blue',
    'สีฟ้าคราม',
    '#8FB8D8',
    'The color of a Bangkok morning before the heat arrives. Cool enough to calm a busy pattern, bright enough to carry a whole piece on its own.',
    'สีของเช้าวันหนึ่งในกรุงเทพก่อนแดดจะแรง เย็นตาพอจะทำให้ลายที่แน่นดูสงบลง และสดพอจะเป็นสีหลักของงานทั้งชิ้นได้',
    '[156,109,132,84]',
    0,
    '2026-07-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM spotlights WHERE color_name = 'Sky Blue');

INSERT INTO spotlights (color_name, color_name_th, hex, blurb, blurb_th, product_ids, is_active, starts_on)
SELECT
    'Sage Green',
    'สีเขียวเสจ',
    '#8A9A7B',
    'A green with grey in it, which is why it never shouts. Pairs with everything botanical and quietly makes cheap materials look expensive.',
    'เขียวที่มีเทาผสมอยู่ จึงไม่ฉูดฉาด เข้ากับงานสายพฤกษศาสตร์ทุกแบบ และช่วยให้วัสดุราคาไม่แพงดูมีราคาขึ้นมาทันที',
    '[158,107,111,83]',
    0,
    '2026-06-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM spotlights WHERE color_name = 'Sage Green');

INSERT INTO spotlights (color_name, color_name_th, hex, blurb, blurb_th, product_ids, is_active, starts_on)
SELECT
    'Butter Yellow',
    'สีเหลืองเนย',
    '#E8C86A',
    'Softer than gold and warmer than cream. It reads as celebration without tipping into novelty, which is why it turns up in so much festival work.',
    'นุ่มกว่าสีทอง และอุ่นกว่าสีครีม ให้ความรู้สึกของงานฉลองโดยไม่ดูเล่นเกินไป จึงพบได้บ่อยในงานเทศกาล',
    '[161,99,100,110]',
    0,
    '2026-05-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM spotlights WHERE color_name = 'Butter Yellow');

INSERT INTO spotlights (color_name, color_name_th, hex, blurb, blurb_th, product_ids, is_active, starts_on)
SELECT
    'Dusty Rose',
    'สีชมพูกุหลาบหม่น',
    '#D8A0A6',
    'Pink with the sweetness taken out. Works on gifts and garlands alike, and it is far more flattering under warm shop lighting than a clean pink ever is.',
    'ชมพูที่ลดความหวานลง ใช้ได้ทั้งงานของขวัญและงานพวงมาลัย และดูดีกว่าชมพูสดใต้แสงไฟอุ่นในร้านมาก',
    '[157,171,179,104]',
    0,
    '2026-04-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM spotlights WHERE color_name = 'Dusty Rose');

INSERT INTO spotlights (color_name, color_name_th, hex, blurb, blurb_th, product_ids, is_active, starts_on)
SELECT
    'Ivory White',
    'สีขาวงาช้าง',
    '#EFE7DA',
    'Not quite white, which is the whole point — ivory keeps its warmth under photography and stops an all-white piece from looking clinical.',
    'ไม่ใช่ขาวสนิท ซึ่งเป็นข้อดี สีขาวงาช้างยังคงความอบอุ่นเมื่อถ่ายภาพ และทำให้งานสีขาวล้วนไม่ดูแข็งจนเกินไป',
    '[162,141,94,95]',
    0,
    '2026-03-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM spotlights WHERE color_name = 'Ivory White');
