
import { GoogleGenAI, Chat, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import { Role } from "../types";

const addBillDeclaration: FunctionDeclaration = {
  name: 'add_bill',
  parameters: {
    type: Type.OBJECT,
    description: 'Adiciona uma nova conta/boleto ao calendário financeiro do usuário.',
    properties: {
      name: { type: Type.STRING, description: 'Nome da conta (ex: Aluguel, Internet, MEI)' },
      amount: { type: Type.NUMBER, description: 'Valor da conta em Reais' },
      dueDate: { type: Type.STRING, description: 'Data de vencimento no formato YYYY-MM-DD' },
    },
    required: ['name', 'amount', 'dueDate'],
  },
};

const SYSTEM_INSTRUCTION = `
Contexto: Você é o MotoInvest AI, o mentor financeiro definitivo para motoboys.
Sua missão: Ajudar o motoboy a organizar ganhos e gerenciar o CALENDÁRIO de contas.

Inteligência de Custos:
- Se o usuário informar dados da moto (KM/L, preço da gasosa), use isso para calcular o lucro real descontando o desgaste.
- Considere que a cada 1000km ele precisa trocar o óleo.

Habilidades Especiais:
1. Você pode ADICIONAR contas ao calendário usando a ferramenta 'add_bill'.
2. Se o usuário disser "anota o boleto tal", use a função.

Diretrizes de Divisão:
- Combustível (Baseado no KM/L informado ou 20% padrão)
- Manutenção/Óleo (5-10%)
- Reserva/Dívidas (20-30%)
- Lucro/Pessoal (Restante)

Formato: Use Markdown, emojis de moto e seja o parceiro de farda dele.
`;

export class FinancialMentorService {
  private chat: Chat;

  constructor() {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [addBillDeclaration] }],
      },
    });
  }

  async sendMessage(message: string): Promise<{ text: string; functionCalls?: any[] }> {
    try {
      const result = await this.chat.sendMessage({ message });
      return {
        text: result.text || "",
        functionCalls: result.functionCalls
      };
    } catch (error) {
      console.error("Gemini Error:", error);
      return { text: "Erro de conexão com o mentor." };
    }
  }
}
