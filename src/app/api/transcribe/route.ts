import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert to standard File object if needed, but OpenAI SDK handles standard Fetch API File objects usually.
        // However, sometimes there's an issue with Next.js File vs global File.
        // Let's rely on the SDK.
        const response = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        });

        return NextResponse.json({ text: response.text });
    } catch (error: any) {
        console.error("Transcribe Error:", error);
        return NextResponse.json({ error: error.message || "Transcription failed" }, { status: 500 });
    }
}
