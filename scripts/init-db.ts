import { initializeDatabase, getOrCreateUser, saveSOP } from '../lib/db';
import { getDefaultSOPs } from '../lib/sops/templates';

console.log('Initializing database...');
initializeDatabase();

// Create the default "dev-test" user
console.log('Creating dev-test user...');
const user = getOrCreateUser('dev-test');
console.log(`User created: ${user.username} (ID: ${user.id})`);

// Load default SOPs
console.log('Loading default SOPs...');
const defaultSOPs = getDefaultSOPs();
for (const sop of defaultSOPs) {
  saveSOP(sop);
  console.log(`  ✓ Loaded SOP: ${sop.displayName}`);
}

console.log('Database setup complete!');

