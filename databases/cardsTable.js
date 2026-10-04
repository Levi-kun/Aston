/**
 *  This is 'spawned' cards table! This is not the 'original' card data, rather the data for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        card_id INT REFERENCES master_cards(id) ON DELETE CASCADE,
        rarity INT NOT NULL,
        damage INT NOT NULL,
        health INT NOT NULL,
        defense INT NOT NULL,
        crit_rate INT NOT NULL CHECK (crit_rate BETWEEN 0 AND 100),
        crit_damage INT NOT NULL,
        photo_card INT NOT NULL REFERENCES photo_per_card(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}