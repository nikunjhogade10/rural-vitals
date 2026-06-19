const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('/visits') || content.includes('visits')) {
            if (content.includes('router') || content.includes('express')) {
              console.log(`Found visits routing in: ${fullPath}`);
            }
          }
        } catch (e) {}
      }
    }
  }
}
searchDir('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/src');
