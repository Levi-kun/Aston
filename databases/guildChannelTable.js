/**
 *  Creates the Guild Channel 
 */

module.exports = {
    content: `
    CREATE TABLE IF NOT EXISTS guild_channels (
        guild_id VARCHAR(25) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
        channel_id VARCHAR(25) NOT NULL,
        channel_type VARCHAR(25) NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, channel_id)
    )`
}