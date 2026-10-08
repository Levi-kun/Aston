/**
 *  This is 'titles' table! 
 *  Titles are user 'special' titles for a given card that gives
 *  bonuses to the card's value.
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS titles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        text INT NOT NULL,
        value INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`
}