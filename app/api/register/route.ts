import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Check if user exists
        const existing = await db.select().from(users).where(eq(users.email, email));
        if (existing.length > 0) {
            return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
        }

        // Insert user
        const [user] = await db.insert(users).values({
            id: uuidv4(),
            name,
            email,
            password, // Plain text for demonstration
        }).returning();

        return NextResponse.json({ success: true, user: { id: user.id, name: user.name } });
    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Error al registrar usuario en la base de datos local' }, { status: 500 });
    }
}
