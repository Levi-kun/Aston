/**
 *  
 *  A user claiming a card! This shows that relationship
 * 
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS claiming (
        card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id, user_id)
    );`
}