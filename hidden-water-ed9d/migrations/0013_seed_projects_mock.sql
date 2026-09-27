-- Mock content for the projects table so the new homepage sections have something
-- real to render before staff start writing. Covers point at existing WEB_UTILS
-- assets by full URL; anything uploaded through the admin panel stores a bare
-- IMAGES key instead, and the frontend resolver handles both.
--
-- Safe to re-run: rows are keyed by slug and re-inserted only if absent.

INSERT OR IGNORE INTO projects
    (title, title_th, slug, cover_image_key, excerpt, excerpt_th, body, body_th, video_url, product_ids, is_featured, is_published, published_at)
VALUES
(
    'Crochet a Market Tote in an Afternoon',
    'ถักกระเป๋าตลาดด้วยโครเชต์ในหนึ่งบ่าย',
    'crochet-a-market-tote-in-an-afternoon',
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/banner-yarn-large.webp',
    'A sturdy open-weave tote that works up fast in cotton yarn. Beginner friendly — if you can chain and double crochet, you can make this.',
    'กระเป๋าถักลายโปร่งที่แข็งแรงและทำได้เร็วด้วยไหมพรมคอตตอน เหมาะสำหรับมือใหม่ ถ้าถักโซ่และถักคู่ได้ ก็ทำได้แน่นอน',
    'Cotton yarn holds its shape better than acrylic once the bag is loaded, so it is worth the small extra cost here.

Start with a magic ring and work six double crochet into it. Increase evenly each round until the base measures about 22 cm across — that is roughly nine rounds for most worsted-weight cotton.

Once the base is the size you want, stop increasing and simply work one double crochet into each stitch. The sides will begin to rise on their own. Keep going until the body measures 30 cm from the base.

For the handles, mark two spans of twelve stitches on opposite sides, chain thirty across each gap, then work a final round of single crochet all the way around to firm up the edge.',
    'ไหมพรมคอตตอนจะคงรูปได้ดีกว่าอะคริลิกเมื่อใส่ของ จึงคุ้มค่ากับราคาที่สูงขึ้นเล็กน้อย

เริ่มจากวงมหัศจรรย์แล้วถักคู่หกครั้งลงไป เพิ่มจำนวนอย่างสม่ำเสมอในแต่ละรอบจนฐานกว้างประมาณ 22 ซม. ซึ่งราวๆ เก้ารอบสำหรับไหมพรมคอตตอนขนาดกลาง

เมื่อฐานได้ขนาดที่ต้องการแล้ว หยุดเพิ่มจำนวน แล้วถักคู่ลงในทุกช่อง ด้านข้างจะเริ่มตั้งขึ้นเอง ถักต่อไปจนตัวกระเป๋าสูง 30 ซม. จากฐาน

สำหรับหูหิ้ว ให้ทำเครื่องหมายช่วงละสิบสองช่องสองฝั่งตรงข้ามกัน ถักโซ่สามสิบข้ามช่องว่างแต่ละด้าน แล้วถักเดี่ยวรอบสุดท้ายทั้งใบเพื่อให้ขอบแน่นขึ้น',
    NULL,
    '[77,42]',
    1, 1, '2026-08-03T09:00:00Z'
),
(
    'Seed Bead Bracelets Three Ways',
    'สร้อยข้อมือลูกปัดเมล็ดสามแบบ',
    'seed-bead-bracelets-three-ways',
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/banner-beads-large.webp',
    'One tube of seed beads, three finishes: a single strand, a ladder stitch cuff, and a braided wrap.',
    'ลูกปัดเมล็ดหนึ่งหลอด ทำได้สามแบบ ทั้งแบบเส้นเดี่ยว แบบถักบันได และแบบพันข้อมือ',
    'The single strand is the fastest and the best place to start. Cut elastic cord about 5 cm longer than your wrist, string beads until the run is 1 cm short of your measurement, then knot twice and dab the knot with clear glue before tucking it inside the nearest bead.

The ladder cuff needs two needles working from opposite ends of the same thread. Every time the threads cross inside a bead, the row locks. It looks far harder than it is.

For the braided wrap, string three loose strands, braid them loosely enough that the beads still sit flat, and finish both ends with a crimp and a clasp.',
    'แบบเส้นเดี่ยวทำได้เร็วที่สุดและเหมาะจะเริ่มต้น ตัดเอ็นยืดให้ยาวกว่ารอบข้อมือประมาณ 5 ซม. ร้อยลูกปัดจนสั้นกว่าที่วัดไว้ 1 ซม. แล้วผูกสองครั้ง หยดกาวใสที่ปมก่อนซ่อนเข้าไปในลูกปัดเม็ดที่ใกล้ที่สุด

แบบถักบันไดต้องใช้เข็มสองเล่มทำงานจากปลายทั้งสองข้างของด้ายเส้นเดียวกัน ทุกครั้งที่ด้ายไขว้กันภายในลูกปัด แถวนั้นจะล็อก ดูยากกว่าที่เป็นจริงมาก

สำหรับแบบพันข้อมือ ให้ร้อยสามเส้นแบบหลวมๆ ถักเปียให้หลวมพอที่ลูกปัดยังวางราบ แล้วปิดปลายทั้งสองด้วยตัวบีบและตะขอ',
    NULL,
    '[98,108]',
    0, 1, '2026-07-27T09:00:00Z'
),
(
    'A Ribbon Wreath for Any Season',
    'พวงหรีดริบบิ้นสำหรับทุกฤดูกาล',
    'a-ribbon-wreath-for-any-season',
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/shop-card02-large.webp',
    'Loop, tie, repeat. A full wreath takes about forty strips of ribbon and no glue at all.',
    'ทำห่วง ผูก ทำซ้ำ พวงหรีดหนึ่งวงใช้ริบบิ้นราวสี่สิบเส้น และไม่ต้องใช้กาวเลย',
    'Cut your ribbon into strips roughly 20 cm long. You will need about forty for a 30 cm wire frame, more if your ribbon is narrow.

Tie each strip onto the frame with a simple double knot, pushing each new knot tight against the last. Alternate two or three ribbon colours as you go rather than working in blocks — it reads as much richer that way.

When the frame is full, trim the ends at an angle. Cutting them all to the same length makes it look manufactured; leaving some variation is what makes it look handmade.

Swap the palette and the same technique carries the wreath through every season.',
    'ตัดริบบิ้นเป็นเส้นยาวประมาณ 20 ซม. จะต้องใช้ราวสี่สิบเส้นสำหรับโครงลวดขนาด 30 ซม. และมากกว่านั้นถ้าริบบิ้นแคบ

ผูกริบบิ้นแต่ละเส้นเข้ากับโครงด้วยปมสองชั้นแบบง่ายๆ ดันปมใหม่ให้ชิดกับปมเดิม สลับสีริบบิ้นสองหรือสามสีไปเรื่อยๆ แทนที่จะทำเป็นช่วงๆ จะดูมีมิติกว่ามาก

เมื่อโครงเต็มแล้ว ตัดปลายเป็นมุมเฉียง การตัดให้ยาวเท่ากันหมดจะดูเหมือนของโรงงาน การเหลือความยาวไม่เท่ากันบ้างคือสิ่งที่ทำให้ดูเป็นงานทำมือ

เปลี่ยนโทนสี แล้วเทคนิคเดียวกันนี้ก็ใช้ได้ตลอดทั้งปี',
    NULL,
    '[103,110]',
    0, 1, '2026-07-20T09:00:00Z'
),
(
    'Building a Sewing Kit That Lasts',
    'จัดชุดอุปกรณ์เย็บผ้าที่ใช้ได้ยาวนาน',
    'building-a-sewing-kit-that-lasts',
    'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/utils/banner-tools-large.webp',
    'What actually belongs in a starter kit, what can wait, and where spending a little more pays off.',
    'อะไรที่ควรมีในชุดเริ่มต้นจริงๆ อะไรที่รอได้ และตรงไหนที่จ่ายเพิ่มอีกนิดแล้วคุ้ม',
    'Buy good scissors once. A cheap pair chews fabric instead of cutting it, and no amount of sharpening fixes bad pivot alignment. Keep them for fabric only — cutting paper with fabric shears is the fastest way to ruin them.

Needles are the opposite: buy a mixed pack and treat them as consumable. A blunt needle leaves visible holes and skipped stitches, and you cannot reliably tell a blunt one by looking.

A seam ripper you will use more than you expect. Get one with a fine point.

Thread is worth the upgrade too. Cheap polyester sheds lint into the machine and snaps under tension. Everything else — pins, a tape measure, marking chalk — can be whatever is cheapest.',
    'ซื้อกรรไกรดีๆ ครั้งเดียว กรรไกรราคาถูกจะกัดผ้าแทนที่จะตัด และการลับคมก็แก้ปัญหาแกนหมุนที่ไม่ตรงไม่ได้ เก็บไว้ตัดผ้าอย่างเดียว การตัดกระดาษด้วยกรรไกรตัดผ้าคือวิธีทำให้พังเร็วที่สุด

เข็มตรงกันข้าม ให้ซื้อแบบแพ็กรวมและถือเป็นของสิ้นเปลือง เข็มทื่อจะทิ้งรูให้เห็นและทำให้ฝีเข็มขาดช่วง และเรามองด้วยตาเปล่าไม่ออกว่าเข็มไหนทื่อ

ที่เลาะตะเข็บจะได้ใช้บ่อยกว่าที่คิด เลือกแบบปลายเรียวเล็ก

ด้ายก็คุ้มที่จะอัปเกรด โพลีเอสเตอร์ราคาถูกจะทิ้งขุยในจักรและขาดง่ายเมื่อถูกดึง ส่วนอย่างอื่น ทั้งเข็มหมุด สายวัด ชอล์กขีดผ้า จะเลือกแบบถูกที่สุดก็ได้',
    NULL,
    '[36,52,86]',
    0, 1, '2026-07-13T09:00:00Z'
);
