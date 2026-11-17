-- ==============================================================================
-- SANRA LIVING | Indian Make Steel Industries - SIDCO Coimbatore
-- Database Migration: 002_catalog.sql
-- ==============================================================================

-- 1. Add catalog enhancement columns to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS material_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 100;

-- Optional check constraint to ensure only supported use cases and material tags are saved
COMMENT ON COLUMN products.use_cases IS 'Supported: CAFE, OFFICE, HOME, HOSPITAL, HOSTEL';
COMMENT ON COLUMN products.material_tags IS 'Supported: MS, SS, WOOD, GRANITE';

-- 2. Update existing seed products with standard tags and sort order
UPDATE products
SET 
  use_cases = ARRAY['CAFE', 'HOME'],
  material_tags = ARRAY['MS', 'WOOD', 'GRANITE'],
  sort_order = 10
WHERE sku = 'IMS-CF-42';

UPDATE products
SET 
  use_cases = ARRAY['OFFICE', 'HOME'],
  material_tags = ARRAY['MS', 'WOOD'],
  sort_order = 20
WHERE sku = 'IMS-WS-425';

UPDATE products
SET 
  use_cases = ARRAY['HOME', 'CAFE'],
  material_tags = ARRAY['MS', 'WOOD', 'GRANITE'],
  sort_order = 30
WHERE sku = 'IMS-DN-63';
