/**
 *  This is categories or alt version that a card can assume
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS historical data (
        card_id INT REFERENCE cards(id) NOT NULL,
        alt_version INT,
        xp INT NOT NULL,
        mint INT NOT NULL,
        title INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        PRIMARY KEY (card_id, created_at)
    );`
}