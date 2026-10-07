/**
 *  A photo per card relational table!
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS photos (
        id SERIAL NOT NULL PRIMARY KEY,
        variation TEXT NOT NULL,
        location TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`
}