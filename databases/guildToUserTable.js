/**
 *  Creates the per User per Guild
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS guild_user (
        user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guild_id VARCHAR(25) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, guild_id)
    )`
}