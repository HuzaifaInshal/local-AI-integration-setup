import { initPool, query } from './connection.js';

async function seed() {
  console.log("Initializing database pool...");
  initPool();

  try {
    console.log("Dropping existing schema...");
    await query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;");
    
    console.log("Creating tables...");
    
    // 1. Clients
    await query(`
      CREATE TABLE clients (
        crimsid INT PRIMARY KEY,
        t24_id VARCHAR(20) UNIQUE NOT NULL,
        customer_name VARCHAR(200) NOT NULL,
        pr_category VARCHAR(50) NOT NULL,
        business_segment VARCHAR(50) NOT NULL,
        branch_code INT NOT NULL,
        branch_name VARCHAR(100) NOT NULL,
        sbp_parent VARCHAR(200) NOT NULL,
        sbp_child VARCHAR(200) NOT NULL,
        client_sales BIGINT NOT NULL,
        client_equity BIGINT NOT NULL,
        client_opening_date DATE NOT NULL,
        legal_entity VARCHAR(100) NOT NULL,
        pep VARCHAR(5) NOT NULL
      );
    `);

    // 2. Ratings
    await query(`
      CREATE TABLE ratings (
        id SERIAL PRIMARY KEY,
        t24_id VARCHAR(20) REFERENCES clients(t24_id) ON DELETE CASCADE,
        financial_year DATE NOT NULL,
        pr_category VARCHAR(50) NOT NULL,
        base_rating INT NOT NULL,
        final_rating INT NOT NULL,
        orr_authorized_by_bu_date DATE NOT NULL,
        orr_authorized_by_cd_date DATE NOT NULL
      );
    `);

    console.log("Seeding data...");

    // Seed Clients
    await query(`
      INSERT INTO clients (crimsid, t24_id, customer_name, pr_category, business_segment, branch_code, branch_name, sbp_parent, sbp_child, client_sales, client_equity, client_opening_date, legal_entity, pep) VALUES
      (12355, '145345670000', 'Fauji Fertilizer', 'Corporate', 'CIBG', 5, 'Main Branch', 'MANUFACTURE OF CHEMICALS AND CHEMICAL PRODUCTS', 'Manufacture Of Fertilizers And Nitrogen Compounds', 5000000000, 25000000, '2024-05-25', 'Public Limited Company - Unlisted', 'No'),
      (12356, '145345680000', 'Fatima Energy', 'Corporate', 'CIBG', 5, 'Main Branch', 'ELECTRICITY GAS STEAM AND AIR CONDITIONING SUPPLY', 'Electr Power Generation Transmission And Distributn- Hydal', 2348900000, 123450000, '2021-12-03', 'Public Limited Company - Unlisted', 'No'),
      (12357, '145345690000', 'Master Textile Mills', 'Corporate', 'CIBG', 280, 'ISB Main', 'MANUFACTURE OF TEXTILES', 'Preparation And Spinning Of Textile Fibres - Others', 2678900000, 323455555, '2024-05-27', 'Private Limited Company - Unlisted', 'Yes'),
      (12358, '145345700000', 'Afia Noor Textile Mills', 'Commercial', 'RBG', 12, 'Urdu Bazar', 'MANUFACTURE OF TEXTILES', 'Preparation And Spinning Of Textile Fibres - Others', 1432322222, 254432333, '2024-05-28', 'Private Limited Company - Unlisted', 'Yes'),
      (12359, '145345710000', 'Euro Oil Traders', 'Corporate', 'CIBG', 56, 'Faisalabad Main', 'RETAIL TRADE EXCEPT OF MOTOR VEHICLES AND MOTORCYCLES', 'Others Retail Sale N.E.C', 2897892000, 25475544, '2024-05-29', 'Private Limited Company - Unlisted', 'Yes'),
      (12360, '145345720000', 'Prime Oil & Ghee Mills', 'Commercial', 'RBG', 24, 'Jodia Bazar', 'MANUFACTURE OF FOOD PRODUCTS', 'Manufacture Of Vegetable And Animal Oils And Fats', 2897892001, 15475544, '2022-04-30', 'Private Limited Company - Unlisted', 'Yes'),
      (12361, '145345730000', 'Hajveri Oil Extraction', 'Commercial', 'RBG', 89, 'Jodia Bazar', 'MANUFACTURE OF FOOD PRODUCTS', 'Manufacture Of Other Food Products N.E.C.,', 287892002, 25423544, '2024-05-31', 'Private Limited Company - Unlisted', 'No'),
      (12362, '145345740000', 'Muhammad Imran Anwar', 'SE', 'IBG', 3344, 'IBG - Multan', 'INDIVIDUALS', 'OTHER SALARIED PERSONS', 2892003, 23375544, '2019-06-10', 'Individual', 'No'),
      (12363, '145345750000', 'Ali Raza Anwar', 'SE', 'RBG', 212, 'Main Sialkot', 'INDIVIDUALS', 'OTHER SALARIED PERSONS', 1357200, 10325378, '2024-06-02', 'Individual', 'No'),
      (12364, '145345760000', 'Pak Green Pharmacy', 'ME', 'IBG', 4467, 'IBG - Sialkot', 'HUMAN HEALTH ACTIVITIES', 'Other Human Health Activities', 27892005, 25473222, '2024-06-03', 'Individual', 'Yes'),
      (12365, '145345770000', 'Noor Pharma Link', 'ME', 'RBG', 39, 'Susan Road - Multan', 'HUMAN HEALTH ACTIVITIES', 'Other Human Health Activities', 18978926, 54475544, '2024-06-04', 'Private Limited Company - Unlisted', 'Yes'),
      (12366, '145345780000', 'OIL & GAS DEVELOPMENT COMPANY LTD', 'Corporate', 'CIBG', 39, 'Gulberg Main', 'MANUFACTURE OF CHEMICALS AND CHEMICAL PRODUCTS', 'Manufacture Of Fertilizers And Nitrogen Compounds', 2832892007, 35475544, '2024-11-05', 'Public Limited Company - listed', 'No'),
      (12367, '145345790000', 'SUI SOUTHERN GAS COMPANY', 'Corporate', 'CIBG', 5, 'Gulberg Main', 'PUBLIC SECTOR ENTERPRISES', 'Sui Southern Gas Company Ltd.', 5897892008, 11575544, '2022-06-09', 'Public Limited Company - listed', 'No'),
      (12368, '145345800000', 'Minhas Autos', 'SE', 'IBG', 2344, 'IBG - Gulberg', 'WHOLESALE TRADE EXCEPT OF MOTOR VEHICLES AND MOTORCYCLES', 'Non-Specialized Wholesale Trade', 1157200, 27875544, '2024-12-07', 'Sole Proprietorship', 'No'),
      (12369, '145345810000', 'Nexgen Auto (Private) Limited', 'ME', 'RBG', 654, 'F-10 Markaz, Islamabad', 'MANUFACTURE OF MOTOR VEHICLES TRAILERS AND SEMI-TRAILERS', 'Manufacture Of Motor Vehicles', 21292005, 25475544, '2024-06-08', 'Sole Proprietorship', 'No'),
      (12370, '145345820000', 'Faisalabad Cloth House', 'Commercial', 'RBG', 5, 'Hyderabad Main', 'MANUFACTURE OF TEXTILES', 'Preparation And Spinning Of Textile Fibres - Cotton', 2897892011, 11575544, '2024-06-09', 'Private Limited Company - Unlisted', 'No'),
      (12371, '145345830000', 'Fazal Cloth House', 'ME', 'IBG', 2232, 'IBG - Quetta', 'MANUFACTURE OF TEXTILES', 'Preparation And Spinning Of Textile Fibres - Cotton', 12292005, 21275544, '2024-06-10', 'Private Limited Company - Unlisted', 'No'),
      (12372, '145345840000', 'Qasim Autos', 'SE', 'IBG', 6544, 'IBG - Bhawalpur', 'MANUFACTURE OF MOTOR VEHICLES TRAILERS AND SEMI-TRAILERS', 'Manufacture Of Motor Vehicles', 9792013, 25475544, '2024-06-11', 'Sole Proprietorship', 'No'),
      (12373, '145345850000', 'Roshan Agri Business', 'Agri', 'RBG', 691, 'Vihari', 'Crop Animal Production', 'Post Harvest Crop Activities', 7892014, 25475544, '2024-06-12', 'Sole Proprietorship', 'No'),
      (12374, '145345860000', 'Cheema Agri Farm', 'Agri', 'RBG', 231, 'Nawabshah', 'Crop Animal Production', 'Post Harvest Crop Activities', 2897205, 25475544, '2024-06-13', 'Sole Proprietorship', 'No');
    `);

    // Seed Ratings
    await query(`
      INSERT INTO ratings (t24_id, financial_year, pr_category, base_rating, final_rating, orr_authorized_by_bu_date, orr_authorized_by_cd_date) VALUES
      ('145345670000', '2024-06-30', 'Corporate', 5, 5, '2024-08-31', '2024-08-31'),
      ('145345670000', '2025-06-30', 'Commercial', 4, 4, '2025-08-17', '2025-08-23'),
      ('145345670000', '2026-06-30', 'Corporate', 3, 3, '2026-07-02', '2026-07-15'),
      ('145345780000', '2025-06-30', 'Corporate', 2, 2, '2025-07-03', '2025-07-03'),
      ('145345780000', '2026-06-30', 'Corporate', 1, 1, '2026-07-19', '2026-07-20'),
      ('145345750000', '2025-06-30', 'SE', 7, 7, '2025-10-05', '2025-10-23'),
      ('145345750000', '2025-06-30', 'SE', 8, 12, '2026-07-03', '2026-07-10'),
      ('145345760000', '2024-06-30', 'ME', 5, 5, '2024-08-31', '2024-08-31'),
      ('145345760000', '2025-06-30', 'ME', 6, 6, '2025-08-17', '2025-08-23'),
      ('145345760000', '2026-06-30', 'ME', 4, 4, '2026-07-02', '2026-07-15'),
      ('145345860000', '2026-06-30', 'Agri', 6, 7, '2026-07-12', '2026-07-20');
    `);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  } finally {
    process.exit(0);
  }
}

seed();
