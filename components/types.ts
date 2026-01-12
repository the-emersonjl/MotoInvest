
// Define se a mensagem foi enviada pelo Usuário ou pela IA (Modelo)
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

// Representa o usuário logado no sistema
export interface User {
  email: string;
  name: string;
}

// Estrutura de cada mensagem no chat
export interface Message {
  role: Role;
  text: string;
  timestamp: string;
}

// Representa uma conta (boleto) cadastrada
export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // Data de vencimento (YYYY-MM-DD)
  isPaid: boolean;
}

// Representa uma despesa registrada no "Corre"
export interface Expense {
  id: string;
  value: number;
  date: string;
  description?: string;
}

// Perfil completo do Motocumpanheiro com metas e informações pessoais
export interface Profile {
  age: string;         // Idade
  gender: string;      // Gênero
  experience: string;  // Tempo de experiência
  tool: string;        // Veículo utilizado
  days_week: string;   // Quantos dias trabalha na semana
  hours_day: string;   // Quantas horas trabalha por dia
  platforms: string[]; // Aplicativos que utiliza (iFood, Uber, etc)
  accident: boolean;   // Se já sofreu algum acidente
  challenge: string;   // Maior desafio no corre
  financial_goal?: number; // Valor da meta em reais
  goal_name?: string;      // Nome do sonho (ex: "Trocar de Moto")
}
