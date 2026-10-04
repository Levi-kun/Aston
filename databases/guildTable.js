// postgresql://[user[:password]@][host][:port][/dbname][?paramspec]   

/**
 *  Holds the Guild Table Creation for PG
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS guilds (
        id VARCHAR(25) NOT NULL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
}