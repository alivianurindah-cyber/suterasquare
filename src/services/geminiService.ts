import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function detectMeterReading(base64Image: string, meterType: 'water' | 'electric'): Promise<number | null> {
  const model = "gemini-3-flash-preview";
  
  const systemPrompt = `You are a specialized meter reading AI. 
  Extremely important for water meters: only read the white digits, ignore red (decimal) digits.
  For electric meters: read the main numerical display.
  Return ONLY the number. No units, no text. If you cannot read it, return "error".`;

  const prompt = `Analyze this ${meterType} meter image and extract the numerical reading.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: systemPrompt },
          { text: prompt }
        ]
      }
    });

    const text = response.text?.trim() || "";
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const value = parseFloat(cleanedText);
    
    return isNaN(value) ? null : value;
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return null;
  }
}
