const path = require('path');
const dotenv = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/dotenv');
dotenv.config({ path: '/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/.env' });

const { PrismaClient } = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/@prisma/client');
const { PrismaPg } = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/@prisma/adapter-pg');
const { Pool } = require('/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App/server/node_modules/pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Connecting to:", connectionString);
  
  // Since server uses adapter-pg/PrismaPg, we can just connect using standard pg or prisma client
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  
  try {
    const resPatients = await client.query("SELECT * FROM \"Patient\" WHERE \"fullName\" ILIKE '%nikunj%'");
    console.log("--- Patients ---");
    console.log(JSON.stringify(resPatients.rows, null, 2));
    
    if (resPatients.rows.length > 0) {
      const patientId = resPatients.rows[0].id;
      const resVisits = await client.query("SELECT * FROM \"Visit\" WHERE \"patientId\" = $1", [patientId]);
      console.log("--- Visits ---");
      console.log(JSON.stringify(resVisits.rows, null, 2));
      
      for (const visit of resVisits.rows) {
        const resVitals = await client.query("SELECT * FROM \"VitalRecord\" WHERE \"visitId\" = $1", [visit.id]);
        console.log(`--- Vitals for Visit ${visit.id} ---`);
        console.log(JSON.stringify(resVitals.rows, null, 2));
        
        const resNotes = await client.query("SELECT * FROM \"ConsultationNote\" WHERE \"visitId\" = $1", [visit.id]);
        console.log(`--- Notes for Visit ${visit.id} ---`);
        console.log(JSON.stringify(resNotes.rows, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
