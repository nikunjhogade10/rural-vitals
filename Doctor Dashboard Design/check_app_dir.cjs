const fs = require('fs');
const path = require('path');

const targetDir = '/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App';
try {
  const files = fs.readdirSync(targetDir);
  console.log("Files in target directory:", files);
  files.forEach(f => {
    const fullPath = path.join(targetDir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(`[Directory] ${f}`);
    } else {
      console.log(`[File] ${f} - ${stat.size} bytes`);
    }
  });
} catch (e) {
  console.error("Error listing directory:", e);
}
