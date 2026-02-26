# Database Schema Documentation

## Overview
This document outlines the database schema for the MotoInvest application, providing an overview of the tables, their relationships, and any relevant constraints.

## Tables

### Users
- **user_id** (Primary Key): Unique identifier for each user.
- **username**: The username chosen by the user.
- **password_hash**: Hashed password for user authentication.
- **email**: User's email address.
- **created_at**: Timestamp of when the user was created.

### Investments
- **investment_id** (Primary Key): Unique identifier for each investment.
- **user_id** (Foreign Key): References `Users(user_id)`.
- **amount**: The amount of money invested.
- **investment_date**: Date when the investment was made.
- **investment_type**: Type of investment (e.g., stocks, bonds, etc.).

### Transactions
- **transaction_id** (Primary Key): Unique identifier for each transaction.
- **investment_id** (Foreign Key): References `Investments(investment_id)`.
- **transaction_date**: Date when the transaction occurred.
- **transaction_amount**: Amount involved in the transaction.
- **transaction_type**: Type of transaction (e.g., buy, sell).

## Relationships
- Each user can have multiple investments, establishing a one-to-many relationship between `Users` and `Investments`.
- Each investment can have multiple transactions, creating another one-to-many relationship between `Investments` and `Transactions`.

## Constraints
- Foreign keys ensure referential integrity between tables.
- Unique constraints on `username` and `email` in the `Users` table to avoid duplicates.

## Indexes
- Indexes on foreign key columns to speed up lookup queries.

## Conclusion
This schema provides a foundation for managing user investments and transactions efficiently. Future versions may expand on this by adding more tables or altering existing structures based on application needs.
