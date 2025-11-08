import { initializeDatabase, getOrCreateUser } from '../lib/db';

console.log('Initializing database...');
initializeDatabase();

// Create the default "dev-test" user
console.log('Creating dev-test user...');
const user = getOrCreateUser('dev-test');
console.log(`User created: ${user.username} (ID: ${user.id})`);

console.log('Database setup complete!');

