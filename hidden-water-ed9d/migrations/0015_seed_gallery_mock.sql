-- Mock creator gallery.
--
-- IMPORTANT: the photos are real (they are the workshop shots already in the
-- web-utils bucket) but every credit name and handle below is INVENTED, exactly
-- like the mock projects and colors. Replace them with real, permitted credits
-- before treating this section as public attribution.
--
-- Images are stored as full URLs so the seed can point at web-utils; rows added
-- through the admin panel store a bare key in the product-images bucket instead.
-- Re-runnable: each insert is guarded on image_key.

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_1-large.webp',
    'Beaded charms from the Libi Home Cafe workshop',
    'พวงกุญแจลูกปัดจากเวิร์กช็อปที่ Libi Home Cafe',
    'Ploy',
    'ploy.makes',
    98, 2, 10
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_1-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_2-large.webp',
    'A first market tote, finished in one afternoon',
    'กระเป๋าตลาดใบแรก ถักเสร็จในบ่ายเดียว',
    'Nan',
    'nan.crochets',
    77, 1, 20
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_2-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_3-large.webp',
    'Colour-matching thread before starting a piece',
    'จับคู่สีด้ายก่อนเริ่มงาน',
    'Mint',
    'mint.stitchwork',
    NULL, NULL, 30
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_3-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_4-large.webp',
    'Seed bead bracelets, three ways',
    'สร้อยข้อมือลูกปัดเมล็ด สามแบบ',
    'Fah',
    'fah.beadstudio',
    108, 2, 40
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_4-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_5-large.webp',
    'Everything laid out before the first stitch',
    'จัดของให้ครบก่อนลงเข็มแรก',
    'Aom',
    'aom.handmade',
    36, 4, 50
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_5-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_6-large.webp',
    'Ribbon wreath in progress',
    'พวงหรีดริบบิ้นระหว่างทำ',
    'Praew',
    'praew.ribbonwork',
    103, 3, 60
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_6-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_7-large.webp',
    'The table halfway through a Saturday session',
    'โต๊ะทำงานกลางคาบวันเสาร์',
    'Bua',
    'bua.craftroom',
    NULL, NULL, 70
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_7-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_8-large.webp',
    'Finished charms, ready to go home',
    'ชิ้นงานที่เสร็จแล้ว พร้อมกลับบ้าน',
    'Ink',
    'ink.tinycrafts',
    110, NULL, 80
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_8-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventA_9-large.webp',
    'Group photo at the end of the workshop',
    'ภาพหมู่ตอนจบเวิร์กช็อป',
    'KitCraft',
    'kit_craft376',
    NULL, NULL, 90
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventA_9-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventB_2-large.webp',
    'Bead trays at the Luenrit street market',
    'ถาดลูกปัดที่ตลาดถนนเลื่อนฤทธิ์',
    'Jaa',
    'jaa.beadsbkk',
    98, NULL, 100
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventB_2-large.webp');

INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle, product_id, project_id, sort_order)
SELECT
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/eventB_3-large.webp',
    'Premium yarn, up close',
    'ไหมพรมเกรดพรีเมียม ระยะใกล้',
    'Som',
    'som.yarnlab',
    42, 1, 110
WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_key LIKE '%eventB_3-large.webp');
