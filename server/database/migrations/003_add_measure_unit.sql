ALTER TABLE price_list_items
ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'г';

UPDATE price_list_items
SET unit = 'г'
WHERE unit IS NULL OR unit NOT IN ('г', 'мл');

ALTER TABLE price_list_items
DROP CONSTRAINT IF EXISTS price_list_items_unit_check;

ALTER TABLE price_list_items
ADD CONSTRAINT price_list_items_unit_check CHECK (unit IN ('г', 'мл'));
