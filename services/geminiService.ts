import { GoogleGenAI, Type } from "@google/genai";
import { EventDetails } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractEventFromImage = async (file: File): Promise<EventDetails> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToGenerativePart(file);

  const prompt = `
    Analyze the provided event image (screenshot, flyer, or photo).
    Extract the following details:
    1. Event Title
    2. Start Date and Time (Convert to strict ISO 8601 format). If the year is missing, assume the next occurrence of that date.
    3. End Date and Time (Convert to strict ISO 8601 format). If only duration is given, calculate end time. If not specified, assume 1 hour after start.
    4. Location (Full address if available, or venue name).
    5. Description (Summarize key details, agenda, or instructions).

    Return a JSON object.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The name of the event" },
          startDate: { type: Type.STRING, description: "ISO 8601 start date time" },
          endDate: { type: Type.STRING, description: "ISO 8601 end date time" },
          location: { type: Type.STRING, description: "Physical location or link" },
          description: { type: Type.STRING, description: "Brief summary of event details" },
        },
        required: ["title", "startDate"],
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No data returned from Gemini.");
  }

  try {
    const data = JSON.parse(text) as EventDetails;
    return data;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    throw new Error("Failed to parse event details from the AI response.");
  }
};