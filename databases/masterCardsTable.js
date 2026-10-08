/**
 *  Creates the Cards Table 
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS master_cards (
        id SERIAL NOT NULL PRIMARY KEY,
        name VARCHAR(25) NOT NULL,
        base_description TEXT NOT NULL,
        spawn_rate INT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`
}