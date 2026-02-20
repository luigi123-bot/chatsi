import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Find user by email
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // Check password (plain text for now as per project current state)
        if (user.password !== password) {
            return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
        }

        // Return user info for the session
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                avatarUrl: user.avatarUrl
            }
        });
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
