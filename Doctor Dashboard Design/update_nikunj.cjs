const path = require('path');
const dotenv = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/dotenv');
dotenv.config({ path: '/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/.env' });

const { Pool } = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const res = await client.query("UPDATE \"Patient\" SET village = 'Wagholi', district = 'Pune' WHERE \"fullName\" ILIKE '%nikunj%' RETURNING *");
    console.log("Updated records:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error updating DB:", err);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
