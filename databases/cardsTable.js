/**
 *  This is 'spawned' cards table! This is not the 'original' card data, rather the data for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        card_id INT REFERENCES master_cards(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        alt_version INT REFERENCES alt_version(id),
        shine FLOAT8 NOT NULL,
        xp INT NOT NULL,
        level INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}