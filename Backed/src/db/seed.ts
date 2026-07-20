import { initPool, query } from './connection.js';

async function seed() {
  console.log("Initializing database pool...");
  initPool();

  try {
    console.log("Dropping existing schema...");
    await query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;");
    
    console.log("Creating tables...");
    
    // 1. Branches
    await query(`
      CREATE TABLE branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        city VARCHAR(50) NOT NULL,
        address VARCHAR(150) NOT NULL
      );
    `);

    // 2. Employees
    await query(`
      CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL,
        salary NUMERIC(10, 2) NOT NULL,
        hire_date DATE NOT NULL
      );
    `);

    // 3. Customers
    await query(`
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Businesses
    await query(`
      CREATE TABLE businesses (
        id SERIAL PRIMARY KEY,
        owner_id INT REFERENCES customers(id) ON DELETE CASCADE,
        company_name VARCHAR(100) NOT NULL,
        industry VARCHAR(50) NOT NULL,
        tax_id VARCHAR(30) UNIQUE NOT NULL,
        annual_revenue NUMERIC(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Accounts
    await query(`
      CREATE TABLE accounts (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        business_id INT REFERENCES businesses(id) ON DELETE SET NULL,
        account_number VARCHAR(20) UNIQUE NOT NULL,
        account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings', 'loan', 'credit')),
        balance NUMERIC(15, 2) DEFAULT 0.00,
        currency VARCHAR(3) DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Cards
    await query(`
      CREATE TABLE cards (
        id SERIAL PRIMARY KEY,
        account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
        card_number VARCHAR(19) UNIQUE NOT NULL,
        card_type VARCHAR(20) CHECK (card_type IN ('debit', 'credit')),
        expiration_date DATE NOT NULL,
        cvv VARCHAR(3) NOT NULL,
        status VARCHAR(20) CHECK (status IN ('active', 'blocked', 'expired')),
        credit_limit NUMERIC(10, 2) DEFAULT 0.00
      );
    `);

    // 7. Transactions
    await query(`
      CREATE TABLE transactions (
        id SERIAL PRIMARY KEY,
        sender_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
        receiver_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
        amount NUMERIC(15, 2) NOT NULL,
        transaction_type VARCHAR(20) CHECK (transaction_type IN ('transfer', 'deposit', 'withdrawal', 'fee', 'payment')),
        status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed')),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Loans
    await query(`
      CREATE TABLE loans (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        business_id INT REFERENCES businesses(id) ON DELETE SET NULL,
        amount NUMERIC(15, 2) NOT NULL,
        interest_rate NUMERIC(5, 2) NOT NULL,
        term_months INT NOT NULL,
        start_date DATE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('active', 'fully_paid', 'defaulted'))
      );
    `);

    // 9. Loan Payments
    await query(`
      CREATE TABLE loan_payments (
        id SERIAL PRIMARY KEY,
        loan_id INT REFERENCES loans(id) ON DELETE CASCADE,
        account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
        amount_paid NUMERIC(15, 2) NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Seeding data...");

    // Seed Branches
    await query(`
      INSERT INTO branches (name, city, address) VALUES
      ('Main Branch', 'New York', '100 Wall St'),
      ('Sunset Branch', 'Los Angeles', '500 Sunset Blvd'),
      ('Loop Branch', 'Chicago', '120 La Salle St'),
      ('Tech Branch', 'San Francisco', '800 Market St'),
      ('North Branch', 'Seattle', '200 Pine St'),
      ('Peach Branch', 'Atlanta', '400 Peachtree St'),
      ('Capital Branch', 'Washington DC', '300 Pennsylvania Ave'),
      ('River Branch', 'Boston', '150 Congress St'),
      ('Star Branch', 'Dallas', '250 Main St'),
      ('Bay Branch', 'Miami', '110 Biscayne Blvd');
    `);

    // Seed Employees
    await query(`
      INSERT INTO employees (branch_id, first_name, last_name, role, salary, hire_date) VALUES
      (1, 'Alice', 'Smith', 'Manager', 95000.00, '2020-01-15'),
      (2, 'Bob', 'Johnson', 'Teller', 45000.00, '2021-03-22'),
      (3, 'Charlie', 'Brown', 'Loan Officer', 75000.00, '2019-07-10'),
      (4, 'Diana', 'Prince', 'Advisor', 82000.00, '2018-11-05'),
      (5, 'Evan', 'Wright', 'Manager', 92000.00, '2022-05-18'),
      (6, 'Fiona', 'Gallagher', 'Teller', 43000.00, '2023-02-10'),
      (7, 'George', 'Costanza', 'Loan Officer', 78000.00, '2017-08-25'),
      (8, 'Hannah', 'Baker', 'Teller', 44000.00, '2022-09-01'),
      (9, 'Ian', 'Malcolm', 'Advisor', 85000.00, '2016-04-12'),
      (10, 'Julia', 'Roberts', 'Manager', 97000.00, '2015-12-01');
    `);

    // Seed Customers
    await query(`
      INSERT INTO customers (first_name, last_name, email, phone, status) VALUES
      ('John', 'Doe', 'john.doe@email.com', '555-0101', 'active'),
      ('Jane', 'Smith', 'jane.smith@email.com', '555-0102', 'active'),
      ('Michael', 'Green', 'michael.g@email.com', '555-0103', 'active'),
      ('Sarah', 'Connor', 'sarah.c@email.com', '555-0104', 'active'),
      ('Bruce', 'Wayne', 'bruce@waynecorp.com', '555-0105', 'active'),
      ('Clark', 'Kent', 'clark.k@dailyplanet.com', '555-0106', 'active'),
      ('Tony', 'Stark', 'tony@starkindustries.com', '555-0107', 'active'),
      ('Peter', 'Parker', 'peter.p@bugle.com', '555-0108', 'active'),
      ('Walter', 'White', 'walter.w@graymatter.com', '555-0109', 'suspended'),
      ('Arthur', 'Dent', 'arthur.d@galaxy.com', '555-0110', 'inactive');
    `);

    // Seed Businesses
    await query(`
      INSERT INTO businesses (owner_id, company_name, industry, tax_id, annual_revenue) VALUES
      (5, 'Wayne Enterprises', 'Technology', 'TAX-001', 15000000.00),
      (6, 'Daily Planet', 'Media', 'TAX-002', 2000000.00),
      (7, 'Stark Industries', 'Defense & Energy', 'TAX-003', 50000000.00),
      (8, 'Parker Photography', 'Creative Services', 'TAX-004', 50000.00),
      (9, 'A1A Carwash', 'Automotive Services', 'TAX-005', 500000.00),
      (10, 'Dent Consulting', 'Professional Services', 'TAX-006', 120000.00),
      (3, 'Green Foods', 'Retail & Grocery', 'TAX-007', 350000.00),
      (4, 'Connor Security', 'Defense Systems', 'TAX-008', 800000.00),
      (1, 'Doe Logistics', 'Transportation', 'TAX-009', 600000.00),
      (2, 'Smith Bakery', 'Food & Beverage', 'TAX-010', 150000.00);
    `);

    // Seed Accounts
    await query(`
      INSERT INTO accounts (customer_id, business_id, account_number, account_type, balance, currency) VALUES
      (1, NULL, 'ACC-001', 'checking', 1250.50, 'USD'),
      (2, NULL, 'ACC-002', 'savings', 10500.00, 'USD'),
      (NULL, 1, 'ACC-003', 'checking', 5000000.00, 'USD'),
      (NULL, 3, 'ACC-004', 'checking', 12000000.00, 'USD'),
      (NULL, 5, 'ACC-005', 'checking', 45000.00, 'USD'),
      (4, NULL, 'ACC-006', 'loan', -15000.00, 'USD'),
      (5, NULL, 'ACC-007', 'checking', 750000.00, 'USD'),
      (3, NULL, 'ACC-008', 'savings', 2500.00, 'USD'),
      (NULL, 7, 'ACC-009', 'savings', 85000.00, 'USD'),
      (NULL, 9, 'ACC-010', 'checking', 32000.00, 'USD');
    `);

    // Seed Cards
    await query(`
      INSERT INTO cards (account_id, card_number, card_type, expiration_date, cvv, status, credit_limit) VALUES
      (1, '4111-2222-3333-4444', 'debit', '2028-12-31', '123', 'active', 0.00),
      (2, '4222-3333-4444-5555', 'debit', '2027-06-30', '456', 'active', 0.00),
      (3, '4333-4444-5555-6666', 'credit', '2029-01-31', '789', 'active', 100000.00),
      (4, '4444-5555-6666-7777', 'credit', '2030-05-31', '321', 'active', 500000.00),
      (5, '4555-6666-7777-8888', 'debit', '2028-08-31', '654', 'active', 0.00),
      (7, '4666-7777-8888-9999', 'credit', '2029-10-31', '987', 'active', 50000.00),
      (8, '4777-8888-9999-0000', 'debit', '2027-03-31', '159', 'active', 0.00),
      (9, '4888-9999-0000-1111', 'credit', '2028-11-30', '753', 'active', 20000.00),
      (10, '4999-0000-1111-2222', 'debit', '2028-02-28', '852', 'active', 0.00),
      (7, '4000-1111-2222-3333', 'credit', '2027-07-31', '951', 'blocked', 10000.00);
    `);

    // Seed Transactions
    await query(`
      INSERT INTO transactions (sender_account_id, receiver_account_id, amount, transaction_type, status, description) VALUES
      (3, 10, 25000.00, 'transfer', 'completed', 'Payment for logistics services'),
      (NULL, 1, 1500.00, 'deposit', 'completed', 'Monthly Payroll Deposit'),
      (2, NULL, 200.00, 'withdrawal', 'completed', 'ATM Cash Withdrawal'),
      (4, 5, 1200.00, 'transfer', 'completed', 'Stark Ind. clean-up services payment'),
      (4, NULL, 50.00, 'fee', 'completed', 'Monthly Account Maintenance Fee'),
      (1, 6, 500.00, 'payment', 'completed', 'Loan Repayment Installment'),
      (7, 4, 50000.00, 'transfer', 'completed', 'Private Investment Contribution'),
      (NULL, 8, 800.00, 'deposit', 'completed', 'Venmo transfer from friend'),
      (9, NULL, 4500.00, 'withdrawal', 'completed', 'Cash withdrawal for store supplies'),
      (2, 1, 120.00, 'transfer', 'completed', 'Bakery catering payment');
    `);

    // Seed Loans
    await query(`
      INSERT INTO loans (customer_id, business_id, amount, interest_rate, term_months, start_date, status) VALUES
      (1, NULL, 5000.00, 5.50, 24, '2025-01-10', 'active'),
      (2, NULL, 12000.00, 4.80, 36, '2024-06-15', 'active'),
      (NULL, 1, 2000000.00, 3.50, 60, '2023-03-20', 'active'),
      (NULL, 3, 5000000.00, 3.20, 120, '2022-09-01', 'active'),
      (NULL, 5, 50000.00, 6.00, 48, '2024-11-12', 'active'),
      (4, NULL, 15000.00, 7.20, 36, '2025-04-05', 'active'),
      (3, NULL, 8000.00, 5.80, 24, '2025-02-18', 'active'),
      (NULL, 7, 60000.00, 5.00, 48, '2024-08-20', 'active'),
      (NULL, 9, 40000.00, 5.20, 36, '2024-10-05', 'active'),
      (NULL, 10, 20000.00, 6.50, 24, '2025-05-01', 'active');
    `);

    // Seed Loan Payments
    await query(`
      INSERT INTO loan_payments (loan_id, account_id, amount_paid, payment_date) VALUES
      (1, 1, 250.00, '2025-02-10 10:00:00'),
      (2, 2, 400.00, '2025-02-15 11:30:00'),
      (3, 3, 45000.00, '2025-02-20 09:15:00'),
      (4, 4, 110000.00, '2025-02-01 14:00:00'),
      (5, 5, 1500.00, '2025-02-12 16:45:00'),
      (6, 6, 500.00, '2025-02-05 12:00:00'),
      (7, 8, 380.00, '2025-02-18 10:20:00'),
      (8, 9, 1600.00, '2025-02-20 15:30:00'),
      (9, 10, 1200.00, '2025-02-05 08:45:00'),
      (10, 2, 950.00, '2025-02-15 11:30:00');
    `);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  } finally {
    process.exit(0);
  }
}

seed();
