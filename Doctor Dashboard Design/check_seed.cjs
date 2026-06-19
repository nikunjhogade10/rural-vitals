const fs = require('fs');
const content = fs.readFileSync('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/prisma/seed.js', 'utf8');
if (content.toLowerCase().includes('nikunj')) {
  console.log("Found nikunj in seed.js!");
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.toLowerCase().includes('nikunj')) {
      console.log(`Line ${idx+1}: ${l}`);
    }
  });
} else {
  console.log("nikunj NOT found in seed.js");
}
