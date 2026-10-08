/**
 *  Is This card turned on? // a database to store which cards are turned on
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS enabled_cards (
        card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enabled BOOL NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id, user_id)
    );`
}