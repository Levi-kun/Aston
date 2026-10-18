require('dotenv').config();

process.env.DB_NAME = 'test';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { execute } = require('../events/onGuildJoin.js');
const { testAtStartTable } = require('../src/createDatabases.js');
const sql = require('../databases/index.js');

const testGuild = {
    id: '222222222222222222',
    name: 'Testing 123',
    ownerId: '987654321098765432',
    memberCount: 400,
    available: true,
    features: [],
};

const otherTestGuild = {
    id: '111111111111111111',
    name: 'Testing 345',
    ownerId: '987654321098765432',
    memberCount: 200,
    available: true,
    features: [],
};

const makeGuild = (guild) => ({
    ...guild,
    members: {
        fetch: async () => new Map(),
    },
});

before(async () => {
    await testAtStartTable('userTable.js');
    await testAtStartTable('guildTable.js');
    await testAtStartTable('guildToUserTable.js');

    const expected = ['users', 'guilds', 'guild_users'];

    const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'guilds', 'guild_users');
    `;

    const found = rows.map(row => row.table_name);
    const missing = expected.filter(table => !found.includes(table));

    assert.deepEqual(
        missing,
        [],
        `Missing tables: ${missing.join(', ')}`
    );

});

beforeEach(async () => {
    await sql`
        TRUNCATE guilds CASCADE
    `;
});

after(async () => {
    await sql`DROP TABLE IF EXISTS guild_users, users, guilds CASCADE`;
    await sql.end();
});

describe('onGuildJoin', () => {
    it('creates the guild record when the bot joins', async () => {
        await execute(makeGuild(testGuild));

        const rows = await sql`
            SELECT id, name, created_at
            FROM guilds
            WHERE id = ${testGuild.id}
        `;

        assert.equal(rows.length, 1);
        assert.equal(rows[0].id, testGuild.id);
        assert.equal(rows[0].name, testGuild.name);
        assert.ok(rows[0].created_at);
    });

    it('creates separate records when the bot joins different guilds', async () => {
        await execute(makeGuild(testGuild));
        await execute(makeGuild(otherTestGuild));

        const rows = await sql`
            SELECT id, name
            FROM guilds
            WHERE id IN (${testGuild.id}, ${otherTestGuild.id})
        `;

        assert.equal(rows.length, 2);

        const firstGuild = rows.find(
            row => row.id === testGuild.id
        );

        const secondGuild = rows.find(
            row => row.id === otherTestGuild.id
        );

        assert.ok(firstGuild);
        assert.equal(firstGuild.name, testGuild.name);

        assert.ok(secondGuild);
        assert.equal(secondGuild.name, otherTestGuild.name);
    });

    it('does not duplicate a guild record when the handler runs twice', async () => {
        await execute(makeGuild(testGuild));
        await execute(makeGuild(testGuild));

        const rows = await sql`
            SELECT id
            FROM guilds
            WHERE id = ${testGuild.id}
        `;

        assert.equal(rows.length, 1);
    });
    it('preserves left_guild when the bot leaves and rejoins the guild', async () => {
    
        await execute(makeGuild(testGuild));

        const userId = '333333333333333333';

        await sql`
            INSERT INTO users (id, name)
            VALUES (${userId}, 'player_one')
        `;

        await sql`
            INSERT INTO guild_users
                (user_id, guild_id, display_name, left_guild)
            VALUES
                (${userId}, ${testGuild.id}, 'Player One', TRUE)
        `;


        await execute(makeGuild(testGuild));

        const guildRows = await sql`
            SELECT id
            FROM guilds
            WHERE id = ${testGuild.id}
        `;

        const relationshipRows = await sql`
            SELECT user_id, guild_id, left_guild
            FROM guild_users
            WHERE user_id = ${userId}
            AND guild_id = ${testGuild.id}
        `;


        assert.equal(guildRows.length, 1);

        assert.equal(relationshipRows.length, 1);
        assert.equal(relationshipRows[0].left_guild, true);
    });
});
