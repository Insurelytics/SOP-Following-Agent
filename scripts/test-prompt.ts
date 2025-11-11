#!/usr/bin/env node
/**
 * Test script to visualize the system prompt generated for different SOPs
 * Run with: npx tsx scripts/test-prompt.ts
 * 
 * This imports the real templates and prompt functions for quick iteration
 */

import { createSystemPrompt } from '../lib/services/prompt';
import { PDFSummarySOP, ContentPlanSOP } from '../lib/sops/templates';

function printPrompt(title: string, prompt: string) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80) + '\n');
  console.log(prompt);
  console.log('\n');
}

// Test 1: PDF Summary SOP - first step
const pdfPrompt1 = createSystemPrompt('Claude 3.5 Sonnet', PDFSummarySOP, 'get-document');
printPrompt('PDF Summary SOP - Step 1 (Get Document)', pdfPrompt1);

// Test 2: Content Plan SOP - first step (to see multiple formats)
const contentPrompt1 = createSystemPrompt('Claude 3.5 Sonnet', ContentPlanSOP, 'step-1-gather-inputs');
printPrompt('Content Plan SOP - Step 1 (Gather Inputs) with Multiple Formats', contentPrompt1);