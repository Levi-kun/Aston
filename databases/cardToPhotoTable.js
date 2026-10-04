/**
 *  A photo per card relational table!
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS photoForCard (
        id SERIAL NOT NULL PRIMARY KEY,
        card_id INT NOT NULL REFERENCE masterCards(id),
        rarity INT NOT NULL,
        location TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}