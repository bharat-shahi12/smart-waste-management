const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:password@localhost/neondb',
});

async function clearHistory() {
  try {
    await client.connect();
    const res = await client.query('DELETE FROM waste_detections');
    console.log(`Deleted ${res.rowCount} rows from waste_detections`);
  } catch (err) {
    console.error('Error clearing history:', err);
  } finally {
    await client.end();
  }
}

clearHistory();
