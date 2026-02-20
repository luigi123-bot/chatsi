import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const allUsers = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
        }).from(users);

        return NextResponse.json(allUsers);
    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
    }
}
