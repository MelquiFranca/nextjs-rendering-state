CREATE TABLE IF NOT EXISTS inventory (
  product_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  available INTEGER NOT NULL CHECK (available >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO inventory (product_id, name, available, version)
VALUES
  ('scanner-pro', 'Scanner Pro X1', 12, 41),
  ('label-printer', 'Impressora de etiquetas', 7, 18),
  ('thermal-roll', 'Rolo térmico premium', 24, 9)
ON CONFLICT (product_id) DO NOTHING;
