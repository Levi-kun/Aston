/**
 *  This is 'spawned' cards table! This is not the 'original' card data, rather the data for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS card_to_attributes (
        card_id INT NOT NULL REFERENCES master_cards(id) ON DELETE CASCADE,
        attribute_id INT NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id, attribute_id)
    )`
}