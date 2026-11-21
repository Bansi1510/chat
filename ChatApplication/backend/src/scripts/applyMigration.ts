import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { env } from '../config/env';

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected successfully!');

  const sqlPath = path.resolve(__dirname, '../../prisma/migrations/0_init/migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '');

  console.log('Executing database migration schema...');
  await client.query(sql);
  console.log('Migration executed successfully! All tables, enums, and foreign keys created.');

  // Check tables
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Created tables in Neon PostgreSQL:');
  res.rows.forEach((r) => console.log(' - ' + r.table_name));

  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
