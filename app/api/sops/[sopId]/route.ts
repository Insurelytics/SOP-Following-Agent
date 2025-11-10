import { NextRequest, NextResponse } from 'next/server';
import { getSOP } from '@/lib/db';

/**
 * GET /api/sops/[sopId] - Get a specific SOP by ID
 * Returns the SOP data if it exists, or null if not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sopId: string } }
) {
  try {
    const sopId = params.sopId;
    
    if (!sopId) {
      return NextResponse.json({ error: 'Invalid SOP ID' }, { status: 400 });
    }

    // Get the SOP
    const sop = getSOP(sopId);
    
    if (!sop) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(sop);
  } catch (error) {
    console.error('Error fetching SOP:', error);
    return NextResponse.json(null, { status: 500 });
  }
}

