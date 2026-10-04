

/**
 *  Holds the User Table Creation for PG
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(25) NOT NULL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
}