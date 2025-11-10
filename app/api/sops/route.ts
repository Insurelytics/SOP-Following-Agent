import { NextResponse } from 'next/server';
import { getAllSOPs } from '@/lib/db';

/**
 * GET /api/sops - Get all available SOP templates
 * Returns an array of SOP templates that users can choose from
 */
export async function GET() {
  try {
    const sops = getAllSOPs();
    return NextResponse.json(sops);
  } catch (error) {
    console.error('Error fetching SOPs:', error);
    return NextResponse.json([], { status: 500 });
  }
}

