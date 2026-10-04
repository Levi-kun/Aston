/**
 *  Creates the Cards Table 
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS masterCards (
        id SERIES NOT NULL PRIMARY KEY,
        name VARCHAR(25) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )`
}