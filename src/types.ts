// TypeScript type definitions for the MotoInvest application

// Example type for a User
export interface User {
    id: number;
    name: string;
    email: string;
}

// Example type for an Investment
export interface Investment {
    id: number;
    userId: number;
    amount: number;
    date: string; // ISO date string
}

// Add more type definitions as needed
