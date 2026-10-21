const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:password@localhost/neondb',
});

async function listUsers() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, email, role FROM users');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

listUsers();
