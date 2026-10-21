const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:password@localhost/neondb'
});

client.connect()
  .then(() => client.query('DELETE FROM waste_detections;'))
  .then((res) => {
    console.log('Deleted rows:', res.rowCount);
    return client.end();
  })
  .catch((err) => {
    console.error('Error:', err);
    client.end();
  });
