/**
 *  Creates the Guild Settings 
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS guildSettings (
        guild_id VARCHAR(25)  NOT NULLREFERENCES guild(id) ON DELETE CASCADE,
        spawn_a_day INT NOT NULL,
        tier INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id)
    )`
}