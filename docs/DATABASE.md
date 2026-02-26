# Database Schema Documentation

## Overview
This document provides a comprehensive overview of the database schema used in the MotoInvest project. It outlines the various tables, their fields, relationships, and constraints.

## Tables

### Users
- **user_id** (Primary Key): Unique identifier for each user.
- **username**: The username chosen by the user.
- **email**: The email address of the user.
- **password_hash**: Hashed password for user authentication.
- **created_at**: Timestamp of when the user account was created.
- **updated_at**: Timestamp of the last update to the user account.

### Products
- **product_id** (Primary Key): Unique identifier for each product.
- **name**: Name of the product.
- **description**: Detailed description of the product.
- **price**: Price of the product.
- **created_at**: Timestamp of when the product was added.
- **updated_at**: Timestamp of the last update to the product.

### Orders
- **order_id** (Primary Key): Unique identifier for each order.
- **user_id** (Foreign Key): The ID of the user who placed the order.
- **total_amount**: The total amount for the order.
- **order_date**: The date when the order was placed.
- **status**: Current status of the order (e.g., pending, completed, canceled).

### Order_Items
- **order_item_id** (Primary Key): Unique identifier for each order item.
- **order_id** (Foreign Key): The ID of the order.
- **product_id** (Foreign Key): The ID of the product.
- **quantity**: The quantity of the product ordered.
- **price**: The price of the product at the time of the order.

## Relationships
- A user can have multiple orders.
- An order can have multiple order items.
- An order item is associated with one product.

## Constraints
- Foreign keys ensure referential integrity between the tables.
- Unique constraints on usernames and emails in the Users table to prevent duplicates.