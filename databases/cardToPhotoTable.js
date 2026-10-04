/**
 *  A photo per card relational table!
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS photo_per_card (
        id SERIAL NOT NULL PRIMARY KEY,
        card_id INT NOT NULL REFERENCES master_cards(id),
        rarity INT NOT NULL,
        location TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}