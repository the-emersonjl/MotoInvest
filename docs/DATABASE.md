# MotoInvest Database Schema Documentation

## Overview
This documentation provides a comprehensive overview of the database schema for the MotoInvest application, including table descriptions, Row Level Security (RLS) policies, triggers, and a setup checklist.

## Tables

### 1. Users Table
- **Description**: Stores information about the users of the MotoInvest application.
- **Columns**:
  - `id`: Primary key (UUID)
  - `username`: Unique username for each user (STRING)
  - `password_hash`: Hashed password for security (STRING)
  - `email`: Unique email address (STRING)
  - `created_at`: Timestamp of account creation (TIMESTAMP)

### 2. Investments Table
- **Description**: Records investments made by users.
- **Columns**:
  - `id`: Primary key (UUID)
  - `user_id`: Foreign key referencing Users (UUID)
  - `amount`: Amount invested (DECIMAL)
  - `investment_date`: Date of investment (DATE)

### 3. Portfolio Table
- **Description**: Represents a user's investment portfolio.
- **Columns**:
  - `id`: Primary key (UUID)
  - `user_id`: Foreign key referencing Users (UUID)
  - `investment_id`: Foreign key referencing Investments (UUID)
  - `quantity`: Number of shares/units (INTEGER)

## Row Level Security (RLS) Policies
- **Policy for Users Table**: Allow access only to the user associated with the `user_id`.
- **Policy for Investments Table**: Enable users to view only their investments.
- **Policy for Portfolio Table**: Users can access their respective portfolios.

## Triggers
1. **Investments_Audit**: Triggers on insert/delete/update to log changes to the Investments table.
2. **Portfolio_Audit**: Maintains a history of changes in the Portfolio table.

## Setup Checklist
- [ ] Configure the database environment.
- [ ] Set up tables according to the above schema.
- [ ] Implement RLS policies to secure data access.
- [ ] Create necessary triggers for auditing.
- [ ] Perform testing for access controls and data integrity.

---

*Document created on 2026-02-26 19:16:10 (UTC)*