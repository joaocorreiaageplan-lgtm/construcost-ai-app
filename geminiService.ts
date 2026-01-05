import { GoogleGenAI, Type } from "@google/genai";

export const hasAiStudioSelector = () => {
  return typeof window !== 'undefined' && (window as any).aistudio;
};

export const openAiStudioKeySelector = async () => {
  if (hasAiStudioSelector()) {
    await (window as any).aistudio.openSelectKey();
    return true;
  }
  return false;
};

export const isKeySelected = async () => {
  if (hasAiStudioSelector()) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};

export const editImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
          { text: `Edite esta imagem seguindo esta instrução: ${prompt}` },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) await openAiStudioKeySelector();
    throw error;
  }
};

export interface ExtractedBudget {
  clientName?: string;
  serviceDescription?: string;
  budgetAmount?: number;
  date?: string;
  discount?: number;
  requester?: string;
  orderNumber?: string;
}

export const extractBudgetDataFromFiles = async (files: { name: string; url: string; mimeType: string }[]): Promise<ExtractedBudget> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const modelId = 'gemini-3-flash-preview';
    const contentParts: any[] = [];
    
    contentParts.push({
      text: `Você é um especialista em orçamentos de engenharia. Analise os documentos fornecidos e extraia os seguintes dados REAIS:
      1. Nome do Cliente (Identifique o contratante principal).
      2. Valor Total do Orçamento (Procure por 'Total', 'Valor Bruto', 'R$'). Retorne apenas o número.
      3. Número do Pedido/PO (Procure por termos como 'PO:', 'Pedido:', 'Ordem de Compra:', 'Compra:').
      4. Descrição resumida do serviço (Ex: Instalação de Drywall, Projeto Elétrico PR0930).
      5. Se encontrar um número de pedido (PO), preencha o campo orderNumber.
      
      IMPORTANTE: Retorne os dados estritamente no formato JSON definido.`
    });

    for (const file of files) {
      const base64Data = file.url.split(',')[1];
      if (base64Data) {
        contentParts.push({
          inlineData: { mimeType: file.mimeType, data: base64Data }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: contentParts },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING },
            serviceDescription: { type: Type.STRING },
            budgetAmount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            discount: { type: Type.NUMBER },
            requester: { type: Type.STRING },
            orderNumber: { type: Type.STRING }
          },
          required: ['clientName', 'budgetAmount']
        }
      }
    });

    const result = JSON.parse(response.text || '{}') as ExtractedBudget;
    return result;
  } catch (error: any) {
    console.error("Erro Gemini Extract:", error);
    if (error.message?.includes("Requested entity was not found")) await openAiStudioKeySelector();
    throw error;
  }
};
