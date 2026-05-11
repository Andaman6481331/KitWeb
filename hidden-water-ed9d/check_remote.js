const { execSync } = require('child_process');
try {
  console.log("Checking Remote Products...");
  execSync('npx wrangler d1 execute product-db --remote --command="SELECT COUNT(*) as count FROM products;"', { stdio: 'inherit' });
  
  console.log("\nChecking Remote Images...");
  execSync('npx wrangler d1 execute product-db --remote --command="SELECT COUNT(*) as count FROM product_images;"', { stdio: 'inherit' });
} catch (e) {
  console.error(e.message);
}
