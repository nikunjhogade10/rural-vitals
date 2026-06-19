const path = require('path');
const dotenv = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/dotenv');
dotenv.config({ path: '/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/.env' });

const { Pool } = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const res = await client.query("SELECT * FROM \"SyncJob\"");
    console.log("--- Sync Jobs ---");
    res.rows.forEach(r => {
      console.log(`ID: ${r.id}, ClientId: ${r.clientId}, EntityType: ${r.entityType}, Status: ${r.syncStatus}`);
      console.log("Payload:", JSON.stringify(r.payloadSnapshot, null, 2));
    });
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
