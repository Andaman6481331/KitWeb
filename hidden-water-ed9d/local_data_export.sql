DROP TABLE IF EXISTS stock_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS products;
PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0.0,
    image_key TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, usage TEXT, use_for TEXT, varieties TEXT, sizes TEXT, colors TEXT, price_1 REAL DEFAULT 0, price_2 REAL DEFAULT 0, price_3 REAL DEFAULT 0, price_4 REAL DEFAULT 0, price_5 REAL DEFAULT 0);
INSERT INTO "products" VALUES(7,'KrownTex Sewing Thread','High-quality, durable sewing thread designed for smooth stitching and strong seams. KrownTex threads offer consistent thickness, minimal lint, and excellent color retention, making them suitable for both hand and machine sewing across a variety of fabrics.',160,'1778089026612-ด้าย40-2_มงกุฎ.jpg','thread',0,'2026-05-06 17:37:06','hand sewing, machine sewing, embroidery, quilting, garment construction, repairs, crafting','cotton fabric, polyester fabric, denim, silk, linen, synthetic materials, mixed fabrics','polyester thread, cotton thread, heavy-duty thread, embroidery thread, all-purpose thread  Size: 100m, 150m, 200m, 300m, 500m','100m, 150m, 200m, 300m, 500m','white, black, red, blue, green, yellow, assorted colors',200,180,160,130,100);
INSERT INTO "products" VALUES(8,'Rainbow Spun Thread','Vibrant multicolor spun thread designed to create eye-catching gradient and color-changing stitch effects. Made with smooth, durable fibers, this thread runs easily on sewing machines and is ideal for decorative stitching and creative projects.',144,'1778089181831-ด้าย40-2_สายรุ้ง.jpg','thread',0,'2026-05-06 17:39:41','decorative stitching, embroidery, quilting, hand sewing, machine sewing, crafting','cotton fabric, polyester fabric, denim, canvas, decorative textiles, DIY crafts, patchwork','multicolor gradient thread, pastel rainbow thread, bold rainbow thread, soft-tone rainbow thread, high-contrast rainbow thread','100m, 150m, 200m, 250m, 300m','rainbow mix, pastel rainbow, bright rainbow, warm-tone rainbow, cool-tone rainbow',180,162,144,117,90);
INSERT INTO "products" VALUES(9,'Venus Superior Quality Cotton Thread','Premium cotton sewing thread crafted for superior strength, smooth performance, and clean stitching. Venus threads are made from high-grade cotton fibers, offering low lint, even texture, and reliable durability—ideal for both everyday sewing and detailed work.',192,'1778089358555-ด้ายค้อตต้อน.jpg','thread',0,'2026-05-06 17:42:38','hand sewing, machine sewing, embroidery, quilting, garment construction, mending, crafting','cotton fabric, linen, lightweight fabric, blended fabric, traditional garments, DIY projects','mercerized cotton thread, soft cotton thread, fine cotton thread, all-purpose cotton thread, embroidery cotton thread','50m, 80m, 100m, small spool size','white, black, red, blue, green, yellow, assorted colors',240,216,192,156,120);
INSERT INTO "products" VALUES(13,'Christmas Theme Beads','Cute decorative beads featuring festive Christmas designs, perfect for holiday-themed crafts and handmade accessories. These lightweight beads come in assorted colors and styles, making them ideal for creative DIY projects and seasonal decorations.',128,'1778142251470-S__27852851.jpg','beads',0,'2026-05-07 08:24:11','jewelry making, bracelet crafting, necklace making, DIY crafts, holiday decoration, keychain making, bead art','handmade accessories, Christmas crafts, festive decorations, gift making, phone charms, scrapbooking, sewing embellishments','heart, bear, bow','6mm, 8mm, 10mm, 12mm, assorted sizes','red, green, white',160,144,128,104,80);
INSERT INTO "products" VALUES(14,'Pastel Variant Beads','Decorative cube-shaped beads featuring delicate patterns and vibrant colors, ideal for adding a stylish and playful touch to handmade crafts and accessories. These beads are lightweight, smooth, and easy to combine with various jewelry-making materials.',144,'1778144439599-S__27852852.jpg','beads',0,'2026-05-07 09:00:39','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, craft projects, decorative designs, scrapbooking, sewing embellishments','flowers beads, rough sphere beads, bow beads, round beads, mixed-pattern beads','6mm, 8mm, 10mm, assorted sizes','pink, blue, yellow, purple, white, green, assorted colors',180,162,144,117,90);
INSERT INTO "products" VALUES(15,'Light White Beads','Elegant half-transparent beads with a soft light white appearance, perfect for creating clean, delicate, and modern accessory designs. These beads feature a smooth glossy finish with subtle translucency that reflects light beautifully for a premium decorative look.',112,'1778145840411-S__27861055.jpg','beads',0,'2026-05-07 09:24:00','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, minimalist accessories, phone charms, decorative crafts, wedding-themed crafts, fashion accessories, sewing embellishments','translucent beads, frosted white flower beads','4mm, 6mm, 8mm, 10mm, assorted sizes','light white, translucent white',140,126,112,91,70);
INSERT INTO "products" VALUES(16,'Blue Mixed Variant Beads','Assorted blue-themed decorative beads featuring multiple shapes, textures, and finishes for creative and stylish craft projects. This mixed bead set offers a variety of designs that can add depth, color, and personality to handmade accessories and decorations.',160,'1778146305005-LINE_ALBUM_20251130 _1_251130_119.jpg','beads',0,'2026-05-07 09:31:45','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, decorative crafts, gift making, scrapbooking, sewing embellishments','','','sky blue, navy blue, pastel blue, aqua blue, transparent blue, mixed blue shades',200,180,160,130,100);
INSERT INTO "products" VALUES(17,'Red Mixed Variant Beads','Assorted red-themed decorative beads featuring multiple shapes, textures, and finishes for creative and stylish craft projects. This mixed bead set offers a variety of designs that can add depth, color, and personality to handmade accessories and decorations.',160,'1778146527760-LINE_ALBUM_20251130 _1_251130_72.jpg','beads',0,'2026-05-07 09:35:27','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, decorative crafts, gift making, scrapbooking, sewing embellishments','','','red, pastel red, transparent red, mixed red shades',200,180,160,130,100);
INSERT INTO "products" VALUES(18,'Brown Mixed Variant Beads','Assorted brown-themed decorative beads featuring multiple shapes, textures, and finishes for creative and stylish craft projects. This mixed bead set offers a variety of designs that can add depth, color, and personality to handmade accessories and decorations.',160,'1778478161410-LINE_ALBUM_20251130_251130_56.jpg','beads',0,'2026-05-07 09:38:45','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, decorative crafts, gift making, scrapbooking, sewing embellishments','','','brown, dark brown, transparent brown',200,180,160,130,100);
INSERT INTO "products" VALUES(19,'Green Mixed Variant Beads','Assorted green-themed decorative beads featuring multiple shapes, textures, and finishes for creative and stylish craft projects. This mixed bead set offers a variety of designs that can add depth, color, and personality to handmade accessories and decorations.',160,'1778477905146-LINE_ALBUM_20251130 _1_251130_130.jpg','beads',8,'2026-05-11 05:38:25','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, decorative crafts, gift making, scrapbooking, sewing embellishments','','','Grass Green, Emerald Green, Military Green, Light Green',200,180,160,130,100);
INSERT INTO "products" VALUES(20,'Orange Mixed Variant Beads','Assorted blue-themed decorative beads featuring multiple shapes, textures, and finishes for creative and stylish craft projects. This mixed bead set offers a variety of designs that can add depth, color, and personality to handmade accessories and decorations.',160,'1778478329936-LINE_ALBUM_20251130 _1_251130_117.jpg','beads',19,'2026-05-11 05:45:30','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, decorative crafts, gift making, scrapbooking, sewing embellishments','','','Tangerine Orange, Marigold Orange, Light Orange, Rust Orange, Honey Orange, Orange',200,180,160,130,100);
INSERT INTO "products" VALUES(21,'Smiley beads','Fun and cheerful yellow smiley face beads designed to add a playful and positive touch to handmade accessories and DIY crafts. These lightweight decorative beads feature bright colors and iconic smiley expressions, making them perfect for trendy and cute creations.',144,'1778478712836-LINE_ALBUM_20251130 _1_251130_164.jpg','beads',7,'2026-05-11 05:51:52','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, friendship bracelets, phone charms, fashion accessories, party crafts, gift making, decorative projects','','','Yellow',180,162,144,117,90);
INSERT INTO "products" VALUES(22,'Cream Mixed Variant Beads','Assorted white and cream-themed decorative beads featuring multiple shapes, textures, and finishes for creative and stylish craft projects. This mixed bead set offers a variety of designs that can add depth, color, and personality to handmade accessories and decorations.',160,'1778483695687-LINE_ALBUM_20251130 _1_251130_105.jpg','beads',12,'2026-05-11 07:14:55','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, decorative crafts, gift making, scrapbooking, sewing embellishments','','','Butter Cream, Pastel Cream, Light Cream, White',200,180,160,130,100);
CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, path TEXT NOT NULL UNIQUE, default_usage TEXT, default_use_for TEXT);
INSERT INTO "categories" VALUES(2,'String','string',NULL,NULL);
INSERT INTO "categories" VALUES(3,'Fabric','fabric',NULL,NULL);
INSERT INTO "categories" VALUES(4,'Zipper','zipper',NULL,NULL);
INSERT INTO "categories" VALUES(5,'Tools','tools',NULL,NULL);
INSERT INTO "categories" VALUES(6,'Thread','thread',NULL,NULL);
INSERT INTO "categories" VALUES(7,'Beads','beads','jewelry making, bracelet crafting, necklace making, DIY crafts, bead art, keychain making, accessory decoration','handmade jewelry, phone charms, fashion accessories, decorative crafts, gift making, scrapbooking, sewing embellishments');
CREATE TABLE product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_key TEXT NOT NULL,
    attribute_type TEXT, 
    attribute_value TEXT, 
    is_main BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
INSERT INTO "product_images" VALUES(1,13,'1778143086816-S__27852850.jpg','gallery','',0,'2026-05-07 08:38:06');
INSERT INTO "product_images" VALUES(2,13,'1778143086852-S__27852860.jpg','gallery','',0,'2026-05-07 08:38:06');
INSERT INTO "product_images" VALUES(3,14,'1778144439627-S__27852853.jpg','gallery','',0,'2026-05-07 09:00:39');
INSERT INTO "product_images" VALUES(4,14,'1778144439646-S__27852854.jpg','gallery','',0,'2026-05-07 09:00:39');
INSERT INTO "product_images" VALUES(5,14,'1778144439663-S__27852855.jpg','gallery','',0,'2026-05-07 09:00:39');
INSERT INTO "product_images" VALUES(6,14,'1778144439687-S__27852857.jpg','gallery','',0,'2026-05-07 09:00:39');
INSERT INTO "product_images" VALUES(7,15,'1778145840580-S__27861052.jpg','gallery','',0,'2026-05-07 09:24:00');
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'PENDING',
    payment_method TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    product_id INTEGER,
    product_name TEXT,
    size TEXT,
    color TEXT,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE TABLE stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    admin_id TEXT, -- user_id of the admin who made the change
    change_amount INTEGER NOT NULL, -- positive for increment, negative for decrement
    new_stock INTEGER NOT NULL,
    reason TEXT, -- e.g., 'MANUAL_ADJUSTMENT', 'ORDER_CHECKOUT'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
INSERT INTO "stock_history" VALUES(1,22,'admin',1,1,'MANUAL_ADJUSTMENT','2026-05-11 08:47:09');
INSERT INTO "stock_history" VALUES(2,22,'admin',1,2,'MANUAL_ADJUSTMENT','2026-05-11 08:47:09');
INSERT INTO "stock_history" VALUES(3,22,'admin',1,3,'MANUAL_ADJUSTMENT','2026-05-11 08:47:10');
INSERT INTO "stock_history" VALUES(4,22,'admin',-1,2,'MANUAL_ADJUSTMENT','2026-05-11 08:47:11');
INSERT INTO "stock_history" VALUES(5,22,'admin',-1,1,'MANUAL_ADJUSTMENT','2026-05-11 08:47:11');
INSERT INTO "stock_history" VALUES(6,22,'admin',-1,0,'MANUAL_ADJUSTMENT','2026-05-11 08:47:12');
INSERT INTO "stock_history" VALUES(7,22,'admin',1,1,'MANUAL_ADJUSTMENT','2026-05-11 08:47:12');
INSERT INTO "stock_history" VALUES(8,22,'admin',1,2,'MANUAL_ADJUSTMENT','2026-05-11 08:47:13');
INSERT INTO "stock_history" VALUES(9,22,'admin',1,3,'MANUAL_ADJUSTMENT','2026-05-11 08:47:13');
INSERT INTO "stock_history" VALUES(10,22,'admin',1,4,'MANUAL_ADJUSTMENT','2026-05-11 08:47:13');
INSERT INTO "stock_history" VALUES(11,22,'admin',1,5,'MANUAL_ADJUSTMENT','2026-05-11 08:47:13');
INSERT INTO "stock_history" VALUES(12,22,'admin',1,6,'MANUAL_ADJUSTMENT','2026-05-11 08:47:13');
INSERT INTO "stock_history" VALUES(13,22,'admin',1,7,'MANUAL_ADJUSTMENT','2026-05-11 08:47:14');
INSERT INTO "stock_history" VALUES(14,22,'admin',1,8,'MANUAL_ADJUSTMENT','2026-05-11 08:47:14');
INSERT INTO "stock_history" VALUES(15,22,'admin',1,9,'MANUAL_ADJUSTMENT','2026-05-11 08:47:14');
INSERT INTO "stock_history" VALUES(16,22,'admin',1,10,'MANUAL_ADJUSTMENT','2026-05-11 08:47:15');
INSERT INTO "stock_history" VALUES(17,22,'admin',1,11,'MANUAL_ADJUSTMENT','2026-05-11 08:47:15');
INSERT INTO "stock_history" VALUES(18,22,'admin',1,12,'MANUAL_ADJUSTMENT','2026-05-11 08:47:15');
INSERT INTO "stock_history" VALUES(19,21,'admin',1,1,'MANUAL_ADJUSTMENT','2026-05-11 08:47:16');
INSERT INTO "stock_history" VALUES(20,21,'admin',1,2,'MANUAL_ADJUSTMENT','2026-05-11 08:47:16');
INSERT INTO "stock_history" VALUES(21,21,'admin',1,3,'MANUAL_ADJUSTMENT','2026-05-11 08:47:16');
INSERT INTO "stock_history" VALUES(22,21,'admin',1,4,'MANUAL_ADJUSTMENT','2026-05-11 08:47:16');
INSERT INTO "stock_history" VALUES(23,21,'admin',1,5,'MANUAL_ADJUSTMENT','2026-05-11 08:47:17');
INSERT INTO "stock_history" VALUES(24,21,'admin',1,6,'MANUAL_ADJUSTMENT','2026-05-11 08:47:17');
INSERT INTO "stock_history" VALUES(25,20,'admin',1,1,'MANUAL_ADJUSTMENT','2026-05-11 08:50:13');
INSERT INTO "stock_history" VALUES(26,20,'admin',1,2,'MANUAL_ADJUSTMENT','2026-05-11 08:50:13');
INSERT INTO "stock_history" VALUES(27,20,'admin',1,3,'MANUAL_ADJUSTMENT','2026-05-11 08:50:13');
INSERT INTO "stock_history" VALUES(28,20,'admin',1,4,'MANUAL_ADJUSTMENT','2026-05-11 08:50:13');
INSERT INTO "stock_history" VALUES(29,20,'admin',1,5,'MANUAL_ADJUSTMENT','2026-05-11 08:50:13');
INSERT INTO "stock_history" VALUES(30,20,'admin',1,6,'MANUAL_ADJUSTMENT','2026-05-11 08:50:14');
INSERT INTO "stock_history" VALUES(31,20,'admin',1,7,'MANUAL_ADJUSTMENT','2026-05-11 08:50:14');
INSERT INTO "stock_history" VALUES(32,20,'admin',1,8,'MANUAL_ADJUSTMENT','2026-05-11 08:50:14');
INSERT INTO "stock_history" VALUES(33,20,'admin',-1,7,'MANUAL_ADJUSTMENT','2026-05-11 08:50:15');
INSERT INTO "stock_history" VALUES(34,20,'admin',-1,6,'MANUAL_ADJUSTMENT','2026-05-11 08:50:15');
INSERT INTO "stock_history" VALUES(35,20,'admin',-1,5,'MANUAL_ADJUSTMENT','2026-05-11 08:50:15');
INSERT INTO "stock_history" VALUES(36,20,'admin',-1,4,'MANUAL_ADJUSTMENT','2026-05-11 08:50:15');
INSERT INTO "stock_history" VALUES(37,20,'admin',-1,3,'MANUAL_ADJUSTMENT','2026-05-11 08:50:15');
INSERT INTO "stock_history" VALUES(38,20,'admin',-1,2,'MANUAL_ADJUSTMENT','2026-05-11 08:50:16');
INSERT INTO "stock_history" VALUES(39,20,'admin',-1,1,'MANUAL_ADJUSTMENT','2026-05-11 08:50:16');
INSERT INTO "stock_history" VALUES(40,20,'admin',-1,0,'MANUAL_ADJUSTMENT','2026-05-11 08:50:16');
INSERT INTO "stock_history" VALUES(41,20,'admin',-1,-1,'MANUAL_ADJUSTMENT','2026-05-11 08:50:16');
INSERT INTO "stock_history" VALUES(42,20,'admin',-1,-2,'MANUAL_ADJUSTMENT','2026-05-11 08:50:16');
INSERT INTO "stock_history" VALUES(43,20,'admin',-1,-3,'MANUAL_ADJUSTMENT','2026-05-11 08:50:17');
INSERT INTO "stock_history" VALUES(44,20,'admin',-1,-4,'MANUAL_ADJUSTMENT','2026-05-11 08:50:17');
INSERT INTO "stock_history" VALUES(45,20,'admin',-1,-5,'MANUAL_ADJUSTMENT','2026-05-11 08:50:17');
INSERT INTO "stock_history" VALUES(46,20,'admin',1,-4,'MANUAL_ADJUSTMENT','2026-05-11 08:50:18');
INSERT INTO "stock_history" VALUES(47,20,'admin',1,-3,'MANUAL_ADJUSTMENT','2026-05-11 08:50:18');
INSERT INTO "stock_history" VALUES(48,20,'admin',1,-2,'MANUAL_ADJUSTMENT','2026-05-11 08:50:18');
INSERT INTO "stock_history" VALUES(49,20,'admin',1,-1,'MANUAL_ADJUSTMENT','2026-05-11 08:50:18');
INSERT INTO "stock_history" VALUES(50,20,'admin',1,0,'MANUAL_ADJUSTMENT','2026-05-11 08:50:19');
INSERT INTO "stock_history" VALUES(51,20,'admin',1,1,'MANUAL_ADJUSTMENT','2026-05-11 08:50:19');
INSERT INTO "stock_history" VALUES(52,20,'admin',-1,0,'MANUAL_ADJUSTMENT','2026-05-11 08:50:20');
INSERT INTO "stock_history" VALUES(53,21,'admin',1,7,'PRODUCT_UPDATE','2026-05-11 08:57:20');
INSERT INTO "stock_history" VALUES(54,20,'admin',19,19,'PRODUCT_UPDATE','2026-05-11 08:57:47');
INSERT INTO "stock_history" VALUES(55,19,'admin',8,8,'PRODUCT_UPDATE','2026-05-11 09:08:30');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('products',22);
INSERT INTO "sqlite_sequence" VALUES('categories',7);
INSERT INTO "sqlite_sequence" VALUES('product_images',7);
INSERT INTO "sqlite_sequence" VALUES('stock_history',55);