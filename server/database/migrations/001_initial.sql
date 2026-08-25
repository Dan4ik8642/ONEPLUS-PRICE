CREATE TABLE IF NOT EXISTS cities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_cities (
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, city_id)
);

CREATE TABLE IF NOT EXISTS price_lists (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  valid_from DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (supplier_id, name)
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id BIGSERIAL PRIMARY KEY,
  price_list_id BIGINT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  article TEXT NOT NULL,
  name TEXT NOT NULL,
  weight INTEGER,
  price INTEGER NOT NULL,
  vegan BOOLEAN NOT NULL DEFAULT FALSE,
  hit BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (price_list_id, article)
);

CREATE INDEX IF NOT EXISTS idx_supplier_cities_city ON supplier_cities(city_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_supplier_active ON price_lists(supplier_id, active, valid_from);
CREATE INDEX IF NOT EXISTS idx_price_list_items_active ON price_list_items(price_list_id, active);
CREATE INDEX IF NOT EXISTS idx_price_list_items_name ON price_list_items(name);
INSERT INTO cities(name) VALUES ('Москва') ON CONFLICT(name) DO NOTHING;
