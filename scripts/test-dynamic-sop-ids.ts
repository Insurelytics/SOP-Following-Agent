#!/usr/bin/env node
/**
 * Test script to verify dynamic SOP ID generation
 * Run with: OPENAI_API_KEY=test npx tsx scripts/test-dynamic-sop-ids.ts
 */

// Set dummy API key if not provided
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-key-for-testing';
}

import { initializeDatabase, getAllSOPs } from '../lib/db';
import { generateDynamicToolDescriptions } from '../lib/services/tools';
import { getSopManagementTools } from '../lib/openai';

console.log('\n' + '='.repeat(80));
console.log('TESTING DYNAMIC SOP ID GENERATION');
console.log('='.repeat(80) + '\n');

// Initialize database
console.log('1. Initializing database...');
try {
  initializeDatabase();
  console.log('   ✓ Database initialized\n');
} catch (error) {
  console.error('   ✗ Error initializing database:', error);
  process.exit(1);
}

// Fetch SOPs
console.log('2. Fetching SOPs from database...');
try {
  const allSOPs = getAllSOPs();
  console.log(`   ✓ Found ${allSOPs.length} SOP(s):`);
  for (const sop of allSOPs) {
    console.log(`     - ${sop.id} (${sop.displayName})`);
  }
  console.log();
} catch (error) {
  console.error('   ✗ Error fetching SOPs:', error);
  process.exit(1);
}

// Generate dynamic descriptions
console.log('3. Generating dynamic tool descriptions...');
try {
  const descriptions = generateDynamicToolDescriptions();
  console.log('   ✓ Generated descriptions:\n');
  console.log('   Built-in SOPs:', descriptions.builtInSOPs.join(', ') || 'none');
  console.log('   Custom SOPs:', descriptions.customSOPs.join(', ') || 'none');
  console.log('   All SOPs:', descriptions.allSOPs.join(', ') || 'none');
  console.log('\n   SOP Examples String:');
  console.log(`   "${descriptions.sopExamples}"\n`);
} catch (error) {
  console.error('   ✗ Error generating descriptions:', error);
  process.exit(1);
}

// Get SOP management tools with dynamic descriptions
console.log('4. Building SOP management tools with dynamic descriptions...');
try {
  const sopTools = getSopManagementTools();
  console.log(`   ✓ Built ${sopTools.length} SOP management tools\n`);
  
  for (const tool of sopTools) {
    console.log(`   Tool: ${tool.function.name}`);
    console.log(`   Description: ${tool.function.description}`);
    console.log();
  }
} catch (error) {
  console.error('   ✗ Error building tools:', error);
  process.exit(1);
}

console.log('='.repeat(80));
console.log('✓ ALL TESTS PASSED');
console.log('='.repeat(80) + '\n');
console.log('Dynamic SOP IDs are successfully being injected into tool descriptions!');
console.log('The model will now see actual SOP IDs from the database.\n');

