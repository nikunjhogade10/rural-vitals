const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.claude') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else {
      // only search text files
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.md') || file.endsWith('.sql') || file.endsWith('.html') || file.endsWith('.txt')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes('nikunj')) {
            console.log(`Found "nikunj" in: ${fullPath}`);
            // print matching lines
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes('nikunj')) {
                console.log(`  Line ${idx + 1}: ${line.trim()}`);
              }
            });
          }
        } catch (e) {
          // ignore read errors
        }
      }
    }
  }
}

searchDir('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App');
