/**
 *  Creates the Guild Settings 
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(25) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
        spawn_a_day INT NOT NULL,
        tier INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id)
    );`
}