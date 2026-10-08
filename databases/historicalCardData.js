/**
 *  This is categories or alt version that a card can assume
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS historical_card_data (
        id BIGSERIAL PRIMARY KEY,
        card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        fingerprint TEXT NOT NULL,
        state JSONB NOT NULL,
        image_path TEXT NOT NULL,
        attachment_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS historical_card_render_lookup
        ON historical_card_data (card_id, fingerprint, created_at DESC);`
}