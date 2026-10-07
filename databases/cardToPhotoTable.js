/**
 *  A photo per card relational table!
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS photo_per_card (
        card_id INT NOT NULL REFERENCES cards(id),
        photo_id INT NOT NULL REFERENCES photos(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id)
    );`
}