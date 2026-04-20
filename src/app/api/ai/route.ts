import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API with the key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt, context, role = "siswa" } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured", message: "Silakan konfirmasi API KEY dengan Admin." },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build the instruction based on role
    let systemInstruction = "";
    if (role === "guru") {
      systemInstruction = `Anda adalah Asisten Cerdas ZonaVetsa untuk Guru SMK. Gunakan bahasa Indonesia profesional dan edukatif.
Konteks tambahan: ${context || "Tidak ada konteks spesifik."}
`;
    } else {
      systemInstruction = `Anda adalah Tutor Pintar ZonaVetsa untuk Siswa SMK. Jelaskan secara ringkas, jelas, dan memotivasi. 
Jangan langsung memberikan jawaban akhir dari soal, tapi berikan panduan cara berpikir (scaffolding).
Konteks tambahan: ${context || "Tidak ada konteks spesifik."}
`;
    }

    const fullPrompt = `${systemInstruction}\n\nPertanyaan/Permintaan:\n${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ result: text });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan AI", details: error.message },
      { status: 500 }
    );
  }
}
