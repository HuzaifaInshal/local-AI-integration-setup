# Sample NL2SQL Prompts for Testing & Validation

Below are sample natural language queries designed for testing the NL2SQL database querying interface with your new client and ratings schemas.

---

### PROMPT 1: PEP Clients
*   **Prompt**: Show me all clients who are Politically Exposed Persons (PEP) along with their business segments
*   **Target Tables**: `clients`
*   **SQL Logic**: `SELECT customer_name, business_segment FROM clients WHERE pep = 'Yes';`

### PROMPT 2: Corporate Sales Limit
*   **Prompt**: List all clients under the Corporate segment with client sales greater than 2 billion
*   **Target Tables**: `clients`
*   **SQL Logic**: `SELECT customer_name, client_sales FROM clients WHERE business_segment = 'Corporate' AND client_sales > 2000000000;`

### PROMPT 3: Specific Client Metadata
*   **Prompt**: What is the legal entity type and SBP parent of Euro Oil Traders?
*   **Target Tables**: `clients`
*   **SQL Logic**: `SELECT legal_entity, sbp_parent FROM clients WHERE customer_name = 'Euro Oil Traders';`

### PROMPT 4: Sales and Equity Aggregation
*   **Prompt**: What is the total sales and total equity of all Private Limited Companies?
*   **Target Tables**: `clients`
*   **SQL Logic**: `SELECT SUM(client_sales) AS total_sales, SUM(client_equity) AS total_equity FROM clients WHERE legal_entity = 'Private Limited Company - Unlisted';`

### PROMPT 5: Grouping Count
*   **Prompt**: Show the count of clients in each branch
*   **Target Tables**: `clients`
*   **SQL Logic**: `SELECT branch_name, COUNT(*) AS client_count FROM clients GROUP BY branch_name;`

### PROMPT 6: Rating History Join
*   **Prompt**: Show the base rating and final rating history of Fauji Fertilizer for all years
*   **Target Tables**: `clients` JOIN `ratings`
*   **SQL Logic**: 
    ```sql
    SELECT r.financial_year, r.base_rating, r.final_rating 
    FROM ratings r
    JOIN clients c ON r.t24_id = c.t24_id
    WHERE c.customer_name = 'Fauji Fertilizer'
    ORDER BY r.financial_year;
    ```

### PROMPT 7: Rating Improvements
*   **Prompt**: List all clients whose final rating in the financial year ending 2026 was 3 or better (lower numbers are better)
*   **Target Tables**: `clients` JOIN `ratings`
*   **SQL Logic**: 
    ```sql
    SELECT c.customer_name, r.final_rating 
    FROM ratings r
    JOIN clients c ON r.t24_id = c.t24_id
    WHERE r.financial_year = '2026-06-30' AND r.final_rating <= 3;
    ```

### PROMPT 8: Authorization Dates
*   **Prompt**: Which ratings were authorized by the Credit Department (CD) in July 2026?
*   **Target Tables**: `ratings` JOIN `clients`
*   **SQL Logic**:
    ```sql
    SELECT c.customer_name, r.financial_year, r.final_rating, r.orr_authorized_by_cd_date 
    FROM ratings r
    JOIN clients c ON r.t24_id = c.t24_id
    WHERE r.orr_authorized_by_cd_date >= '2026-07-01' AND r.orr_authorized_by_cd_date <= '2026-07-31';
    ```
