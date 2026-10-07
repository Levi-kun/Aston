/**
 *  This is 'spawned' cards table! This is not the 'original' card data, rather the data for each card
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS likes (
        card_id INT REFERENCES cards(id) ON DELETE CASCADE,
        count INT NOT NULL,
        PRIMARY KEY (card_id)
    );`
}