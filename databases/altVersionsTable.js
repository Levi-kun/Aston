/**
 *  This is categories or alt version that a card can assume
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS alt_version (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
        rarity INT NOT NULL,
        description_change TEXT NOT NULL,
        modification BSON,
        is_nsfw BOOL NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`
}