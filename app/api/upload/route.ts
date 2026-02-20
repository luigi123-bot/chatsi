import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;
        const contentType = file.type;

        const fileUrl = await uploadToR2(buffer, fileName, contentType);

        return NextResponse.json({ success: true, url: fileUrl });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Error al subir el archivo a Cloudflare R2' }, { status: 500 });
    }
}
