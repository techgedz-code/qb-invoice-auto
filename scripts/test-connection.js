const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const turso = createClient({ 
    url: process.env.TURSO_DATABASE_URL, 
    authToken: process.env.TURSO_AUTH_TOKEN 
  });
  try {
    const result = await turso.execute('SELECT 1 as test');
    console.log('Connection OK:', JSON.stringify(result.rows));
  } catch (e) {
    console.error('Connection failed:', e.message);
  } finally {
    await turso.close();
  }
}

test();