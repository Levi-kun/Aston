/**
 *  Creates the per User per Guild
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS guild_users (
        user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guild_id VARCHAR(25) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
        display_name VARCHAR(100) NOT NULL,
        claims INT NOT NULL DEFAULT 10,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        left_guild boolean DEFAULT false,
        PRIMARY KEY (user_id, guild_id)
    );`
}