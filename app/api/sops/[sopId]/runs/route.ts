import { NextRequest, NextResponse } from 'next/server';
import { getSOP, createSOPRun } from '@/lib/db';

interface CreateRunRequest {
  chatId: number;
}

/**
 * POST /api/sops/[sopId]/runs - Create a new SOP run for a chat
 * Request body should include the chatId
 * Returns the newly created SOP run
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sopId: string } }
) {
  try {
    const sopId = params.sopId;
    const body = (await request.json()) as CreateRunRequest;
    const chatId = body.chatId;

    if (!chatId || isNaN(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    // Get the SOP template
    const sop = getSOP(sopId);
    if (!sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 });
    }

    // Get the first step ID
    const firstStep = sop.steps[0];
    if (!firstStep) {
      return NextResponse.json({ error: 'SOP has no steps' }, { status: 400 });
    }

    // Create the SOP run
    const run = createSOPRun(chatId, sopId, firstStep.id);

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error('Error creating SOP run:', error);
    return NextResponse.json({ error: 'Failed to create SOP run' }, { status: 500 });
  }
}

