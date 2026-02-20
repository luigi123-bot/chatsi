import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, participants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: receiverId } = await params;

        // Get current user ID from query params
        const { searchParams } = new URL(req.url);
        const currentUserId = searchParams.get('currentUserId') || 'me';

        // 1. Find the conversation between currentUserId and receiverId
        const userParticipants = await db.select().from(participants).where(eq(participants.userId, currentUserId));
        const targetParticipants = await db.select().from(participants).where(eq(participants.userId, receiverId));

        // Find common conversationId
        const commonConversation = userParticipants.find(up =>
            targetParticipants.some(tp => tp.conversationId === up.conversationId)
        );

        if (!commonConversation) {
            return NextResponse.json([]); // No history yet
        }

        // 2. Fetch all messages for that conversation
        const chatMessages = await db.select()
            .from(messages)
            .where(eq(messages.conversationId, commonConversation.conversationId))
            .orderBy(messages.createdAt);

        return NextResponse.json(chatMessages);
    } catch (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
    }
}
