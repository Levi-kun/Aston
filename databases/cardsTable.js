/**
 *  This is 'spawned' cards table! This is not the 'original' card data, rather the data for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        card_id INT REFERENCES version_cards(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}