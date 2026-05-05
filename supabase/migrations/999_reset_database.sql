-- ============================================
-- RESET DATABASE SCRIPT
-- WARNING: This will delete ALL tables, functions, and data in the public schema.
-- ============================================

-- 1. Drop the public schema with CASCADE to remove all objects
DROP SCHEMA IF EXISTS public CASCADE;

-- 2. Recreate the public schema
CREATE SCHEMA public;

-- 3. Grant standard permissions back to Supabase roles
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Optional: Comments to indicate success
COMMENT ON SCHEMA public IS 'Standard public schema';
