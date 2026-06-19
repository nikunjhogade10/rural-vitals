const fs = require('fs');
const path = require('path');

function searchDir(dir, level = 0) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    if (f === 'node_modules' || f === '.git' || f === 'dist') return;
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    const indent = "  ".repeat(level);
    if (stat.isDirectory()) {
      console.log(`${indent}[Dir] ${f}`);
      if (level < 2) {
        searchDir(fullPath, level + 1);
      }
    } else {
      console.log(`${indent}[File] ${f} (${stat.size} bytes)`);
    }
  });
}
searchDir('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/src');
