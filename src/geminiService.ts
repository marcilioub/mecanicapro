import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY não definida");
}

const ai = new GoogleGenAI({ apiKey });

export const getMaintenanceAdvice = async (
  problem: string,
  machineType: string
) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      Máquina: ${machineType}
      Problema: ${problem}
      Retorne JSON com causa e passos
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possibleCause: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["possibleCause", "steps"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
