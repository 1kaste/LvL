// import { GoogleGenAI } from "@google/genai";

// const API_KEY = process.env.API_KEY;

// if (!API_KEY) {
//  // In a real app, you might have a more robust way to handle this,
//  // but for this example, we'll throw an error if the key is missing.
//  console.warn("API_KEY environment variable not set. AI features will not work.");
// }

// const ai = new GoogleGenAI({ apiKey: API_KEY! });
// const model = 'gemini-2.5-flash';

// const systemInstruction = `You are an expert business analyst and consultant for a restaurant and bar owner. 
// Your name is 'Jobi', the AI assistant for Jobiflow.
// The user's inventory consists of 'Stocked' items (with inventory counts), 'Service' items (like game time, with no inventory count), and 'Keg' items which are containers for drinks sold by the serving.
// You can analyze keg consumption rates and sales per server from a keg.
// Provide concise, actionable, and data-driven insights based on the user's request.
// Format your response in clear, easy-to-read markdown. Use headings, bold text, and lists where appropriate.
// Do not start your response with "As an expert business analyst...". Just give the analysis directly.
// Be friendly and encouraging.`;

export const getAIBusinessSuggestion = async (prompt: string): Promise<string> => {
  // if (!API_KEY) {
    return Promise.resolve("AI service is temporarily disabled for maintenance.");
  // }
  
  // try {
  //   const response = await ai.models.generateContent({
  //     model: model,
  //     contents: prompt,
  //     config: {
  //       systemInstruction: systemInstruction,
  //     },
  //   });

  //   return response.text;
  // } catch (error) {
  //   console.error("Error fetching AI suggestion:", error);
  //   if (error instanceof Error) {
  //       return `An error occurred while contacting the AI service: ${error.message}`;
  //   }
  //   return "An unknown error occurred while contacting the AI service.";
  // }
};