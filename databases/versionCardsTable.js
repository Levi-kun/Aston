/**
 *  This is 'version' cards table! This is not the 'original' card data, rather the version/alternates for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS version_cards (
        id SERIAL PRIMARY KEY,
        card_id INT REFERENCES cards(id) ON DELETE CASCADE,
        photo_card INT NOT NULL REFERENCES photo_per_card(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}