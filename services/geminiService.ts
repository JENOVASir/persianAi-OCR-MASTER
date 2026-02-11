import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Initialize Gemini AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Compresses and converts an image File to a Base64 string.
 * Resizing large images significantly reduces RPC/XHR errors.
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Target dimensions: limit max width/height to 1500px to keep payload small
        const MAX_DIMENSION = 1500; 
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
           reject(new Error("Could not get canvas context"));
           return;
        }
        
        // Draw with white background (handles transparent PNGs better for OCR)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.85 quality
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl.split(',')[1]); // Remove "data:image/jpeg;base64,"
      };
      
      img.onerror = (e) => reject(new Error("Image load error"));
    };
    reader.onerror = (e) => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analyzes an image using Gemini to extract Persian text, formulas, and charts.
 */
export const analyzeImage = async (file: File): Promise<AIAnalysisResult> => {
  // Compress image to avoid XHR size limits/timeouts
  const base64Data = await fileToGenerativePart(file);

  // Updated Prompt for OMML compatibility
  const systemInstruction = `
    You are an advanced OCR engine for Persian (Farsi) and Mathematics.
    
    **ARCHITECTURE GOAL**: 
    Produce outputs optimized for conversion to Word OMML (Office Math Markup Language).

    **CRITICAL RULES**:
    1.  **Math Output**: Return standard, linear LaTeX. 
        -   **AVOID** \`aligned\`, \`split\`, or \`gather\` environments if possible. Break complex multi-line equations into separate formula segments if they are distinct steps.
        -   **AVOID** complex layout commands like \`\\text{}\` inside math if simple variables work.
        -   Use standard \\frac, \\sqrt, ^, _.
    2.  **Text Output**: Persian text must be preserved naturally.
    3.  **Inline Math**: Wrap inline math in single $...$.

    **JSON OUTPUT FORMAT**:
    {
      "title": "Document Title",
      "language": "Persian",
      "segments": [
        { "type": "text", "content": "Paragraph text...", "confidence": 100 },
        { "type": "formula", "content": "x = \\frac{-b}{2a}", "confidence": 100 }
      ]
    }
  `;

  let attempt = 0;
  const maxAttempts = 4;

  while (attempt < maxAttempts) {
    try {
      // Note: MIME type is hardcoded to image/jpeg because of compression
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Extract content. Keep formulas clean for OMML conversion." }
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              language: { type: Type.STRING },
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["text", "formula", "chart_description"] },
                    content: { type: Type.STRING },
                    confidence: { type: Type.INTEGER }
                  },
                  required: ["type", "content", "confidence"]
                }
              }
            },
            required: ["title", "segments", "language"]
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) throw new Error("No response from AI");

      return JSON.parse(textResponse) as AIAnalysisResult;

    } catch (error: any) {
      console.error(`Gemini Analysis Attempt ${attempt + 1} Error:`, error);
      
      const errorMsg = error.message || JSON.stringify(error);
      const isRetryable = (
        errorMsg.includes("xhr") || 
        errorMsg.includes("fetch") ||
        errorMsg.includes("500") || 
        errorMsg.includes("503") ||
        errorMsg.includes("code: 6") ||
        errorMsg.includes("Rpc failed")
      );

      attempt++;
      if (attempt >= maxAttempts) throw new Error(`Failed after ${maxAttempts} attempts. Last error: ${errorMsg}`);
      
      // Increased delay for stability
      const delay = isRetryable ? 2000 * Math.pow(1.5, attempt) + (Math.random() * 1000) : 1000;
      await wait(delay);
    }
  }

  throw new Error("Analysis failed");
};