/**
 *  User Owns Titles, They Put it on Cards!
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS title_to_card (
        card_id INT REFERENCES cards(id),
        title_id INT REFERENCES titles(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id, title_id)
    );`
}