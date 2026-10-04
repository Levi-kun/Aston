/**
 *  This is the special 'abilities' Table. Each card has only one.
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS abilities (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('passive', 'active')),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    effect JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
}