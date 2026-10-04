/**
 *  This is 'spawned' cards table! This is not the 'original' card data, rather the data for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        card_id INT REFERENCE masterCards(id) ON DELETE CASCADE,
        rarity INT NOT NULL,
        damage INT NOT NULL,
        health INT NOT NULL,
        defense INT NOT NULL,
        crit_rate INT NOT NULL,
        crit_damage INT NOT NULL,
        photo_card INT NOT NULL REFERENCE photoForCard(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}