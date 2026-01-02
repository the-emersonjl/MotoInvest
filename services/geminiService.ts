
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";

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

const getFinancialDataDeclaration: FunctionDeclaration = {
  name: 'get_financial_summary',
  parameters: {
    type: Type.OBJECT,
    description: 'Obtém um resumo detalhado dos ganhos, gastos, agenda de boletos e progresso da meta financeira.',
    properties: {},
  },
};

const SYSTEM_INSTRUCTION = `
Contexto: Você é o MotoInvest AI, o mentor financeiro definitivo para motoboys e trabalhadores autônomos.
Sua missão: Ajudar o usuário a organizar ganhos, gerenciar o CALENDÁRIO (agenda) de contas e atingir METAS financeiras.

Capacidades e Acesso a Dados:
- Você tem acesso total à AGENDA de débitos e ao progresso das METAS via ferramenta 'get_financial_summary'.
- SEMPRE chame 'get_financial_summary' se o usuário perguntar sobre o futuro, sobre quanto falta para a meta, ou sobre quais contas vencem em breve.
- Você é MULTIMODAL: Analise prints de apps de entrega ou comprovantes para confirmar ganhos.
- Você entende ÁUDIOS: Resuma o que o usuário disse sobre o corre do dia.

Diretrizes de Resposta:
1. Comece sempre conferindo os dados atuais se a pergunta for financeira.
2. Seja motivador e use gírias leves de motoboy ("corre", "visão", "marcha").
3. Sugira divisões de lucro: 30% Meta/Sonho, 40% Contas Fixas, 30% Gastos/Manutenção.

Formato: Use Markdown, emojis 🏍️💰. Direto ao ponto e estratégico.
`;

export class FinancialMentorService {
  private chat: Chat;
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [addBillDeclaration, getFinancialDataDeclaration] }],
      },
    });
  }

  async sendMessage(
    message: string, 
    media?: { data: string; mimeType: string }[],
    onToolCall?: (name: string, args: any) => Promise<any>
  ): Promise<{ text: string; functionCalls?: any[] }> {
    try {
      const parts: any[] = [{ text: message || "Analise os dados abaixo." }];
      if (media) {
        media.forEach(m => {
          parts.push({
            inlineData: {
              data: m.data,
              mimeType: m.mimeType
            }
          });
        });
      }

      let response = await this.chat.sendMessage({ message: parts });

      if (response.functionCalls && response.functionCalls.length > 0 && onToolCall) {
        const functionResponses = [];
        for (const fc of response.functionCalls) {
          const result = await onToolCall(fc.name, fc.args);
          functionResponses.push({
            id: fc.id,
            name: fc.name,
            response: { result }
          });
        }
        
        const followUp = await this.chat.sendMessage({
          message: functionResponses.map(fr => ({
            functionResponse: {
              name: fr.name,
              id: fr.id,
              response: fr.response
            }
          })) as any
        });
        
        return {
          text: followUp.text || "",
          functionCalls: followUp.functionCalls
        };
      }

      return {
        text: response.text || "",
        functionCalls: response.functionCalls
      };
    } catch (error) {
      console.error("Gemini Error:", error);
      return { text: "Visão, deu um erro aqui na conexão. Tenta de novo!" };
    }
  }
}
