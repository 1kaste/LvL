# Migrating Jobiflow to Supabase and Vercel

This document provides a complete guide to setting up the Jobiflow POS application with a Supabase backend for data persistence and deploying it to Vercel for production hosting.

## Table of Contents
1.  [Prerequisites](#1-prerequisites)
2.  [Supabase Project Setup](#2-supabase-project-setup)
3.  [SQL Schema and Data Seeding](#3-sql-schema-and-data-seeding)
4.  [Setting up the Admin and Demo Users](#4-setting-up-the-admin-and-demo-users)
5.  [Local Development Setup](#5-local-development-setup)
6.  [Vercel Deployment](#6-vercel-deployment)

---

### 1. Prerequisites

Before you begin, ensure you have the following:
- A [Supabase](https://supabase.com/) account (Free tier is sufficient to start).
- A [Vercel](https://vercel.com/) account.
- A [GitHub](https://github.com/) account.
- [Node.js](https://nodejs.org/) (version 18 or later) installed on your local machine.
- [Git](https://git-scm.com/) installed on your local machine.

---

### 2. Supabase Project Setup

1.  **Create a New Project:**
    - Go to your Supabase Dashboard and click "New project".
    - Give it a name (e.g., `jobiflow-pos`) and generate a secure database password.
    - Choose a region and click "Create new project".

2.  **Get API Keys:**
    - Once the project is ready, navigate to **Project Settings** (the gear icon in the left sidebar).
    - Go to the **API** section.
    - You will need the **Project URL** and the `anon` **public** key. These will be your environment variables.

3.  **Disable Email Confirmation:**
    - In the left sidebar, go to **Authentication** -> **Providers**.
    - Under the **Email** provider, toggle off "Confirm email". This simplifies the setup process for demo accounts. You can re-enable this later for better security in a real production environment.

---

### 3. SQL Schema and Data Seeding

This is the most critical step. The following SQL script will create all necessary tables, relationships, data types, security policies, and initial data.

- In your Supabase project, navigate to the **SQL Editor** (the `SQL` icon).
- Click **+ New query**.
- Copy the entire SQL script below and paste it into the editor.
- Click **RUN**. This may take a moment to complete.

```sql
-- ============================================================================
-- 0. CLEANUP SCRIPT (Optional: Run if you are re-installing)
-- This section drops all existing objects in a specific order to ensure
-- a clean and error-free setup.
-- WARNING: This will permanently delete all data.
-- ============================================================================
-- Drop policies from tables first
DROP POLICY IF EXISTS "Enable read access for all users" ON public.store_settings;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.categories;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.deductions;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.discounts;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.keg_instances;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.payment_methods;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.purchase_orders;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.sale_items;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.sales;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.scheduled_shifts;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.time_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
-- Drop tables
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.keg_instances CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.deductions CASCADE;
DROP TABLE IF EXISTS public.time_logs CASCADE;
DROP TABLE IF EXISTS public.scheduled_shifts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.discounts CASCADE;
DROP TABLE IF EXISTS public.store_settings CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
-- Drop types and functions
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.time_clock_status;
DROP TYPE IF EXISTS public.product_type;
DROP TYPE IF EXISTS public.keg_status;
DROP TYPE IF EXISTS public.po_status;
DROP TYPE IF EXISTS public.time_log_status;
DROP TYPE IF EXISTS public.discount_type;
DROP TYPE IF EXISTS public.payment_method_enum;
DROP TYPE IF EXISTS public.activity_type;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- ============================================================================
-- 1. ENUMERATED TYPES
-- Defines custom data types to ensure data consistency.
-- ============================================================================
CREATE TYPE public.user_role AS ENUM ('Admin', 'Manager', 'Cashier', 'Server/bartender');
CREATE TYPE public.time_clock_status AS ENUM ('Clocked In', 'Clocked Out', 'Awaiting Clearance');
CREATE TYPE public.product_type AS ENUM ('Stocked', 'Service', 'Keg');
CREATE TYPE public.keg_status AS ENUM ('Full', 'Tapped', 'Empty');
CREATE TYPE public.po_status AS ENUM ('Pending', 'Partially Received', 'Received', 'Cancelled');
CREATE TYPE public.time_log_status AS ENUM ('Ongoing', 'Completed', 'Pending Approval', 'Rejected');
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE public.payment_method_enum AS ENUM ('cash', 'card', 'mpesa');
CREATE TYPE public.activity_type AS ENUM ('Sale', 'Inventory', 'User', 'System', 'PO', 'Shift', 'Keg');

-- ============================================================================
-- 2. TABLES
-- Creates all the necessary tables for the application.
-- ============================================================================

-- Profiles Table (Linked to Supabase Auth)
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying NOT NULL UNIQUE,
    name text NOT NULL,
    role user_role NOT NULL,
    pin character varying(4),
    override_pin character varying(4),
    salary_amount numeric(10, 2),
    time_clock_status time_clock_status NOT NULL DEFAULT 'Clocked Out'::time_clock_status,
    clock_in_time timestamp with time zone
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Categories Table
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying NOT NULL UNIQUE
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Products Table
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    price numeric(10, 2) NOT NULL,
    product_type product_type NOT NULL,
    stock integer NOT NULL,
    low_stock_threshold integer NOT NULL DEFAULT 10,
    keg_capacity numeric,
    keg_capacity_unit character varying,
    linked_keg_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    serving_size numeric,
    serving_size_unit character varying
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Keg Instances Table
CREATE TABLE public.keg_instances (
    id uuid PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    capacity numeric NOT NULL,
    current_volume numeric NOT NULL,
    status keg_status NOT NULL,
    tapped_date timestamp with time zone,
    tapped_by_id uuid REFERENCES public.profiles(id),
    closed_date timestamp with time zone,
    closed_by_id uuid REFERENCES public.profiles(id),
    sales jsonb
);
ALTER TABLE public.keg_instances ENABLE ROW LEVEL SECURITY;

-- Sales and Sale Items Tables
CREATE TABLE public.sales (
    id text PRIMARY KEY,
    subtotal numeric(10, 2) NOT NULL,
    tax numeric(10, 2) NOT NULL,
    total numeric(10, 2) NOT NULL,
    date timestamp with time zone NOT NULL,
    payment_method payment_method_enum NOT NULL,
    served_by_id uuid NOT NULL REFERENCES public.profiles(id),
    served_by_name text NOT NULL,
    customer_type text NOT NULL,
    discount_name text,
    discount_amount numeric(10, 2)
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sale_items (
    id SERIAL PRIMARY KEY,
    sale_id text NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id),
    product_name text NOT NULL,
    quantity integer NOT NULL,
    price_at_sale numeric(10, 2) NOT NULL
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Suppliers and Purchase Orders Tables
CREATE TABLE public.suppliers (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    contact_person text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    payment_terms text,
    bank_name text,
    bank_account_number text,
    bank_branch text,
    mpesa_paybill text,
    notes text
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.purchase_orders (
    id text PRIMARY KEY,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
    invoice_no text,
    total_cost numeric(10, 2) NOT NULL,
    status po_status NOT NULL,
    order_date date NOT NULL,
    received_date date,
    received_by_id uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id text NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id),
    quantity_ordered integer NOT NULL,
    quantity_received integer NOT NULL DEFAULT 0,
    cost numeric(10, 2) NOT NULL
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Time Management Tables
CREATE TABLE public.scheduled_shifts (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL
);
ALTER TABLE public.scheduled_shifts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.time_logs (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clock_in_time timestamp with time zone NOT NULL,
    clock_out_time timestamp with time zone,
    duration_hours numeric(6, 2),
    status time_log_status NOT NULL,
    declared_amount numeric(10, 2),
    counted_amount numeric(10, 2),
    expected_sales jsonb,
    difference numeric(10, 2),
    rejection_reason text,
    approved_by_id uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Deductions Table
CREATE TABLE public.deductions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE
);
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;

-- Discounts Table
CREATE TABLE public.discounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type discount_type NOT NULL,
    value numeric NOT NULL,
    is_active boolean NOT NULL DEFAULT false
);
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Payment Methods (for receipts)
CREATE TABLE public.payment_methods (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    details text NOT NULL,
    show_on_receipt boolean NOT NULL
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Store Settings Table (Singleton)
CREATE TABLE public.store_settings (
    id integer PRIMARY KEY DEFAULT 1,
    store_name text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    logo_url text NOT NULL,
    receipt_header text NOT NULL,
    receipt_footer text NOT NULL,
    show_logo_on_receipt boolean NOT NULL,
    pdf_footer_text text NOT NULL,
    pdf_footer_logo_url text NOT NULL,
    show_pdf_footer boolean NOT NULL,
    system_lock_pin text NOT NULL,
    auto_lock_on_print boolean NOT NULL,
    CONSTRAINT singleton_check CHECK (id = 1)
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Activity Log Table
CREATE TABLE public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "timestamp" timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name text NOT NULL,
    "type" activity_type NOT NULL,
    description text NOT NULL,
    details text
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. DATABASE FUNCTIONS & TRIGGERS
-- Automates profile creation when a new user signs up.
-- ============================================================================

-- Function to create a profile for a new user, deriving name from email
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
begin
  -- Extract name from email, capitalize it, and replace dots/underscores with spaces
  user_name := initcap(regexp_replace(split_part(new.email, '@', 1), '[._-]', ' ', 'g'));

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    user_name,
    -- Default all new sign-ups to 'Cashier' role. Admin must promote them.
    'Cashier'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Secures the database by defining access rules.
-- ============================================================================
CREATE POLICY "Enable read access for all users" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for users based on email" ON public.profiles FOR UPDATE USING (auth.jwt() ->> 'email' = email) WITH CHECK (auth.jwt() ->> 'email' = email);
CREATE POLICY "Enable all operations for authenticated users" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.deductions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.discounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.keg_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.payment_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.scheduled_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.time_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON public.store_settings FOR SELECT USING (true);
-- Note: Further policies restricting access based on 'Admin' or 'Manager' roles can be added for enhanced security.

-- ============================================================================
-- 5. INITIAL DATA SEEDING
-- Populates the database with essential default and demo data.
-- ============================================================================

-- Default Store Settings
INSERT INTO public.store_settings (id, store_name, address, phone, email, logo_url, receipt_header, receipt_footer, show_logo_on_receipt, pdf_footer_text, pdf_footer_logo_url, show_pdf_footer, system_lock_pin, auto_lock_on_print) VALUES
(1, 'Jobi Bar & Grill', '123 Main Street, Nairobi', '0712 345 678', 'contact@jobiflow.com', 'https://i.ibb.co/hK7d32p/jobiflow-high-resolution-logo-transparent.png', 'Thank you for your visit!', 'Karibu Tena! Find us on Social Media @jobiflow', true, 'Jobiflow - Modern Point of Sale (POS) | Powered By Kaste Tech & Brands', 'https://i.ibb.co/L84kL2p/kastech.png', true, '1234', true);

-- Demo Categories
INSERT INTO public.categories (id, name) VALUES
('c7a7e8e6-7132-4c28-90a6-9d3752e1f5e8', 'Beers'),
('a3b8d4f2-6c1e-4b9a-8f3d-2e1c7b5a4d1f', 'Spirits'),
('f9e8d7c6-5b4a-3d2e-1c0b-9a8f7e6d5c4b', 'Wines'),
('b2a1c0d9-8e7f-6g5h-4i3j-2k1l0m9n8o7p', 'Soft Drinks'),
('d1e2f3g4-h5i6-j7k8-l9m0-n1o2p3q4r5s6', 'Food');

-- Demo Products
INSERT INTO public.products (category_id, name, price, product_type, stock, low_stock_threshold) VALUES
('c7a7e8e6-7132-4c28-90a6-9d3752e1f5e8', 'Tusker Lager', 250.00, 'Stocked', 100, 20),
('c7a7e8e6-7132-4c28-90a6-9d3752e1f5e8', 'White Cap', 280.00, 'Stocked', 80, 20),
('a3b8d4f2-6c1e-4b9a-8f3d-2e1c7b5a4d1f', 'Jameson Whiskey', 250.00, 'Stocked', 50, 10),
('f9e8d7c6-5b4a-3d2e-1c0b-9a8f7e6d5c4b', '4th Street Red', 1200.00, 'Stocked', 30, 5),
('b2a1c0d9-8e7f-6g5h-4i3j-2k1l0m9n8o7p', 'Coca-Cola', 100.00, 'Stocked', 200, 50),
('d1e2f3g4-h5i6-j7k8-l9m0-n1o2p3q4r5s6', 'Samosa', 150.00, 'Stocked', 75, 15);

-- Demo Suppliers
INSERT INTO public.suppliers (id, name, contact_person, phone, email) VALUES
('s1a1b2c3-d4e5-f6g7-h8i9-j0k1l2m3n4o5', 'East African Breweries', 'John Kamau', '0722000001', 'sales@eabl.com'),
('s2p1q2r3-s4t5-u6v7-w8x9-y0z1a2b3c4d5', 'Kenya Wine Agencies', 'Jane Adhiambo', '0722000002', 'orders@kwal.co.ke');
```

---

### 4. Setting up the Admin and Demo Users

Your database is now ready. The next step is to create user accounts.

1.  **Create the Main Admin Account:**
    *   Run the Jobiflow application locally (see next section).
    *   On the login page, **sign up** with your main administrator email (e.g., `admin@mybusiness.com`) and a secure password.
    *   **This is a critical step.** After you sign up, you need to manually promote this user to an 'Admin' in the Supabase dashboard.
    *   Go to your Supabase project -> **Table Editor** -> `profiles` table.
    *   Find the row for your admin user and change the `role` column from `Cashier` to `Admin`. Click **Save**.

2.  **Log in as the Admin:**
    *   Go back to the application's login page and sign in with the admin credentials you just created.

3.  **Create Demo User Accounts:**
    *   As the logged-in Admin, navigate to the **Users** page from the sidebar.
    *   Click "Add User" and create the following 9 accounts. The system is now robust enough to handle user creation directly from the UI.
    *   Use a standard password for all of them, like `password123`, for ease of testing.

    **Managers:**
    *   `managermike@jobiflow.com`
    *   `managerpatricia@jobiflow.com`
    *   `managerdavid@jobiflow.com`

    **Cashiers:**
    *   `cashierjane@jobiflow.com`
    *   `cashierkevin@jobiflow.com`
    *   `cashiermercy@jobiflow.com`

    **Servers/Bartenders:**
    *   `bartenderjoe@jobiflow.com`
    *   `serverlinda@jobiflow.com`
    *   `bartenderchris@jobiflow.com`

    After creating them, you can go into each user's details to set their PINs, salaries, etc., just as you would in a live environment.

---

### 5. Local Development Setup

Follow these steps to run the Jobiflow application on your local machine for development and testing.

1.  **Clone the Repository:**
    Open your terminal or command prompt and clone the project's source code from its GitHub repository.
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Create Environment File:**
    Create a new file named `.env` in the root directory of the project. This file will store your secret keys and is ignored by Git.

3.  **Add Supabase Keys:**
    Open the `.env` file and add the API keys you obtained from your Supabase project in **Step 2**.
    ```
    VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```
    *   **`VITE_SUPABASE_URL`**: The Project URL from the API settings page.
    *   **`VITE_SUPABASE_ANON_KEY`**: The `anon` public key from the same page.

4.  **Install Dependencies:**
    Run the following command to install all the necessary packages for the project.
    ```bash
    npm install
    ```

5.  **Run the Development Server:**
    Start the local development server.
    ```bash
    npm run dev
    ```
    Your application should now be running. The terminal will display the local URL, typically `http://localhost:5173`. Open this URL in your web browser to access the Jobiflow login page.

---

### 6. Vercel Deployment

1.  Push your project code to a GitHub repository.
2.  Go to your Vercel Dashboard and click "Add New... -> Project".
3.  Import the GitHub repository you just created.
4.  **Configure Environment Variables:**
    - In the project settings, go to the **Environment Variables** section.
    - Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables with your Supabase credentials.
5.  Click **Deploy**. Vercel will build and deploy your application.
