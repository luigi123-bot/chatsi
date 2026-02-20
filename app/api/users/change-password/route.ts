import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const { userId, newPassword } = await req.json();

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        // Direct update, no old password validation as requested
        await db.update(users)
            .set({ password: newPassword })
            .where(eq(users.id, userId));

        return NextResponse.json({ success: true, message: 'Password updated' });
    } catch (error: any) {
        console.error('Password change error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
