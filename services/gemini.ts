
import { GoogleGenAI, Type } from "@google/genai";

export const generateProductDetails = async (productName: string, customInstruction?: string) => {
  // Use process.env.API_KEY directly according to guidelines
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key missing. AI features disabled.");
    return null;
  }

  try {
    // Correct initialization as per guidelines: new GoogleGenAI({ apiKey: process.env.API_KEY })
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Default instruction if none provided
    const systemInstruction = customInstruction || "Generate a short, appetizing description (max 15 words) and a typical market price (number only) for a cafe product.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Product Name: "${productName}"`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            suggestedPrice: { type: Type.NUMBER },
            category: { type: Type.STRING, enum: ['Beverages', 'Food', 'Snacks', 'Dessert', 'Other'] }
          },
          propertyOrdering: ["description", "suggestedPrice", "category"],
        }
      }
    });

    // Correct extraction: response.text property, not a function
    const text = response.text;
    if (!text) return null;

    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};
