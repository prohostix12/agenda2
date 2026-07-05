import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read MONGODB_URI from .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const uriMatch = envContent.match(/^MONGODB_URI=(.+)$/m);
if (!uriMatch) { console.error('MONGODB_URI not found in .env.local'); process.exit(1); }

const MONGODB_URI = uriMatch[1].trim();
const MASTER_DB = 'agenda-master';

function buildUri(dbName) {
  return MONGODB_URI.replace(/\/([^/?]+)(\?|$)/, `/${dbName}$2`);
}

const client = new MongoClient(buildUri('admin'));

async function run() {
  await client.connect();
  console.log('Connected to MongoDB');

  const adminDb = client.db('admin');
  const { databases } = await adminDb.admin().listDatabases();

  // Find all agenda-* databases (company/sub-company data)
  const agendaDbs = databases
    .map(d => d.name)
    .filter(n => n.startsWith('agenda-') || n === 'meeting-manager');

  console.log('\nDatabases to drop:', agendaDbs);

  for (const dbName of agendaDbs) {
    await client.db(dbName).dropDatabase();
    console.log(`  Dropped: ${dbName}`);
  }

  // Clear master DB collections
  const masterDb = client.db(MASTER_DB);
  const collections = await masterDb.listCollections().toArray();
  for (const col of collections) {
    await masterDb.collection(col.name).deleteMany({});
    console.log(`  Cleared master collection: ${col.name}`);
  }

  console.log('\nAll data cleared. Ready for fresh setup.');
  await client.close();
}

run().catch(err => { console.error(err); process.exit(1); });
