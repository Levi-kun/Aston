/**
 *  Creates the Render Photos Table 
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS card_renders (
        card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        fingerprint TEXT NOT NULL,
        location TEXT NOT NULL,
        attachment_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id)
);`
}