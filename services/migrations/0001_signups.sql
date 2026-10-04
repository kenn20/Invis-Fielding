CREATE TABLE signups (
  email TEXT PRIMARY KEY NOT NULL,
  registered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
