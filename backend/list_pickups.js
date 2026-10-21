const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:password@localhost/neondb',
});

async function listPickups() {
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM pickup_requests');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

listPickups();
