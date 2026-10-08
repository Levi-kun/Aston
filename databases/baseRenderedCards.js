module.exports = {
	content: `
	CREATE TABLE IF NOT EXISTS card_base_renders (
		card_id INT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
		fingerprint TEXT NOT NULL,
		location TEXT NOT NULL,
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);`
};