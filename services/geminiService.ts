import { GoogleGenAI } from "@google/genai";
import { WorkoutSession } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeWorkoutProgress = async (history: WorkoutSession[]): Promise<string> => {
  const ai = getAIClient();
  if (!ai) {
    return "API Key no configurada. Por favor configura tu API Key para recibir consejos.";
  }

  // Filter last 10 workouts to keep context manageable but relevant
  const recentHistory = history
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const prompt = `
    Actúa como un entrenador personal experto de alto nivel.
    Analiza mi historial reciente de entrenamientos en el gimnasio.
    
    Aquí están mis últimos registros (en formato JSON):
    ${JSON.stringify(recentHistory)}

    Proporciona un análisis breve pero perspicaz (máximo 2 párrafos) sobre mi progreso.
    1. Identifica si estoy aplicando sobrecarga progresiva (subiendo peso o repeticiones).
    2. Si ves estancamiento, sugiere un cambio específico (ej. dropsets, cambio de rango de reps).
    3. Mantén un tono motivador pero técnico.
    
    Responde en Español y usa formato Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No se pudo generar un análisis en este momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Hubo un error al conectar con el entrenador IA. Inténtalo más tarde.";
  }
};
