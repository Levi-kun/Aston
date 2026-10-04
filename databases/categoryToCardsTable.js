/**
 *  A category per card relational table!
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS categoryToCards (
        id SERIAL NOT NULL PRIMARY KEY,
        card_id INT NOT NULLREFERENCE master_cards(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}