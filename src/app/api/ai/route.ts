import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API with the key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt, context, role = "siswa" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Separate identity from history in context if possible, otherwise treat as one
    const contextParts = context?.split("RIWAYAT PERCAKAPAN:") || ["", ""];
    const identityInfo = contextParts[0].trim();
    const historyInfo = contextParts[1]?.trim() || "";

    // Build a very strong system instruction
    const systemInstruction = `ANDA ADALAH ASISTEN AI ZONAVETSA.
ATURAN ABSOLUT:
1. Jawab secara LANGSUNG dan SINGKAT.
2. JANGAN PERNAH mengatakan "Saya tidak tahu nama Anda" jika ada data di bawah.
3. Jika pengguna meminta file atau contoh kode, berikan dalam format Markdown code block (menggunakan triple backticks \`\`\`) karena sistem kami akan secara otomatis menyediakan tombol DOWNLOAD untuk setiap code block tersebut.
4. DATA PENGGUNA SAAT INI:
${identityInfo || "Nama: Pengguna ZonaVetsa"}

Jika ditanya "siapa saya" atau "siapa nama saya", Anda WAJIB menjawab dengan Nama yang tertera di DATA PENGGUNA di atas.

KONTEKS TAMBAHAN:
${historyInfo}`;

    // ━━ OPTION 1: OPENROUTER (Primary) ━━
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://zonavetsanext.rnet.lt",
            "X-Title": "ZonaVetsa Portal",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openrouter/owl-alpha",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ result: data.choices[0].message.content });
        }
        
        const errorText = await response.text();
        console.error("OpenRouter Failed:", errorText);
      } catch (orError) {
        console.error("OpenRouter Exception:", orError);
      }
    }

    // ━━ OPTION 2: GOOGLE GEMINI (Fallback) ━━
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use gemini-1.5-flash which is widely available
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const fullPrompt = `SYSTEM:\n${systemInstruction}\n\nUSER QUESTION: ${prompt}`;
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return NextResponse.json({ result: response.text() });
      } catch (geminiError: any) {
        console.error("Gemini Fallback Error:", geminiError);
        return NextResponse.json(
          { error: "AI Provider Error", details: geminiError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "No AI Provider Configured" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("AI Global Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan AI", details: error.message },
      { status: 500 }
    );
  }
}
