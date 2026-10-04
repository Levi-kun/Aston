/**
 *  This is 'spawned' cards table! This is not the 'original' card data, rather the data for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS cardToAttributes (
        id SERIAL NOT NULL PRIMARY KEY,
        card_id INT NOT NULL REFERENCE masterCards(id) ON DELETE CASCADE,
        attribute_id INT NOT NULL REFERENCE abilities(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}