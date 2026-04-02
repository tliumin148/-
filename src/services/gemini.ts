import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async recognizeQuestion(base64Image: string): Promise<OCRResult> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1],
              },
            },
            {
              text: "识别图片中的题目。提取题目文本、选项（如果有）、标准答案（如果有）。同时判断该题目的核心知识点（如‘一元二次方程’）。请以JSON格式返回。",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "题目正文" },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "选项列表，如果没有则为空数组"
            },
            standardAnswer: { type: Type.STRING, description: "标准答案" },
            knowledgePoint: { type: Type.STRING, description: "核心知识点" },
          },
          required: ["text", "knowledgePoint"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as OCRResult;
  },

  async generateSimilarQuestions(
    originalQuestion: string,
    knowledgePoint: string
  ): Promise<Question[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `基于知识点“${knowledgePoint}”和原题“${originalQuestion}”，生成3道相似的举一反三题目。
      要求：
      1. 覆盖同一知识点的不同角度或变式。
      2. 难度与原题相当或略有梯度。
      3. 每道题附带正确答案。
      4. 每道题附带解析，解析应侧重易错点分析（例如“注意符号变换”、“不要漏掉特殊情况”等）。
      请以JSON格式返回。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "题目文本" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "选项列表"
              },
              answer: { type: Type.STRING, description: "正确答案" },
              explanation: { type: Type.STRING, description: "侧重易错点的解析" },
            },
            required: ["text", "answer", "explanation"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]") as Question[];
  },
};
