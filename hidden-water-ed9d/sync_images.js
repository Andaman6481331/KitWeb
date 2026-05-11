const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sync() {
  console.log("Fetching image keys from local database...");
  const output = execSync('npx wrangler d1 execute product-db --local --command="SELECT DISTINCT image_key FROM products WHERE image_key IS NOT NULL UNION SELECT DISTINCT image_key FROM product_images WHERE image_key IS NOT NULL;" --json').toString();
  const data = JSON.parse(output);
  const keys = data[0].results.map(r => r.image_key).filter(k => k);

  console.log(`Found ${keys.length} unique images to sync.`);

  if (!fs.existsSync('temp_images')) fs.mkdirSync('temp_images');

  for (const key of keys) {
    try {
      const url = `http://127.0.0.1:8787/images/${encodeURIComponent(key)}`;
      const filePath = path.join('temp_images', key.replace(/[/\\?%*:|"<>]/g, '-'));
      
      console.log(`Downloading ${key}...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      console.log(`Uploading ${key} to remote R2...`);
      execSync(`npx wrangler r2 object put "product-images/${key}" --file="${filePath}" --remote`, { stdio: 'inherit' });
      
      // Cleanup
      fs.unlinkSync(filePath);
      // Small delay to be safe
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`Failed to sync ${key}: ${e.message}`);
    }
  }

  console.log("Sync complete!");
}

sync();
