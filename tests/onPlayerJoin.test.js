require('dotenv').config();

process.env.DB_NAME = 'test';

const { describe, it, mock, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { execute } = require('../events/onPlayerJoin');
const { testAtStartTable } = require('../src/createDatabases');
const sql = require('../databases/index.js')

// Unit Test on the onPlayerJoin
// We expect onPlayerJoin to:
// add a user to the user table, if they don't already exist
// attach the user entity to a guild in guild_user

const testGuild = {
    id: "222222222222222222",
    name: "Testing 123",
    ownerId: "987654321098765432",
    memberCount: 400,
    available: true,
    features: [],
}

const otherTestGuild = {
    id: "111111111111111111",
    name: "Testing 345",
    ownerId: "987654321098765432",
    memberCount: 200,
    available: true,
    features: [],
}


before(async () => {

    try /* creating userTable */ {
        await testAtStartTable('userTable.js');
    } catch (err) {
        console.error('Failed to create userTable:', err);
    }

    try /* creating guildTable */{
        await testAtStartTable('guildTable.js');
    } catch (err) {
        console.error('Failed to create guildTable:', err);
    }

    try /* creating guildToUserTable */ {
        await testAtStartTable('guildToUserTable.js');
    } catch (err) {
        console.error('Failed to create guildToUserTable:', err);
    }

    const expected = ['users', 'guilds', 'guild_user'];

    const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'guilds', 'guild_user');
    `;

    const found = rows.map((r) => r.table_name);
    const missing = expected.filter((t) => !found.includes(t));

    assert.deepEqual(missing, [], `missing tables: ${missing.join(', ')}`);

    try /* creating testGuild */ {
        await sql`
            INSERT INTO guilds (id, name)
            VALUES (${testGuild.id}, ${testGuild.name})
            RETURNING name;
        `;
    } catch (err) {
        console.error('Failed to insert testGuild:', err);
    }

    try /* creating otherTestGuild */ {
        await sql`
            INSERT INTO guilds (id, name)
            VALUES (${otherTestGuild.id}, ${otherTestGuild.name})
            RETURNING name;
        `;
    } catch (err) {
        console.error('Failed to insert otherTestGuild:', err);
    }
});

beforeEach(async () => {
    await sql`
        TRUNCATE guild_user, users, guilds
        RESTART IDENTITY CASCADE
    `;

    await sql`
        INSERT INTO guilds (id, name)
        VALUES
            (${testGuild.id}, ${testGuild.name}),
            (${otherTestGuild.id}, ${otherTestGuild.name})
    `;
});

after(async() => {
    await sql`DROP TABLE IF EXISTS guild_user, users, guilds CASCADE`;
    await sql.end()
})

const fakeMemberNonBotIsGuild = {
    displayName: 'Test',
    user: {
        id: '000000000000000001',
        username: 'test',
        tag: 'test',
        bot: false,
    },
    guild: {
        id: "222222222222222222",
        name: "Testing 123",
        memberCount: 400,
    },
};

const fakeMemberNonBotIsOfOtherGuild = {
    displayName: 'Test',
    user: {
        id: '000000000000000001',
        username: 'test',
        tag: 'test',
        bot: false,
    },
    guild: {
        id: "111111111111111111",
        name: "Testing 123",
        memberCount: 400,
    },
};

const fakeMemberBotIsGuild = {
    displayName: 'Test',
    user: {
        id: '000000000000000002',
        username: 'test',
        tag: 'test',
        bot: true,
    },
    guild: {
        id: "222222222222222222",
        name: "Testing 123",
        memberCount: 400,
    },
};

const fakeMemberNonBotIsNotGuild = {
    displayName: 'Test',
    user: {
        id: '000000000000000001',
        username: 'test',
        tag: 'test',
        bot: false,
    }
};


describe('onPlayerJoin', () => {

    it('Creates a user and attaches them to an existing guild', async () => {
        await execute(fakeMemberNonBotIsGuild);

        const userId = fakeMemberNonBotIsGuild.user.id;
        const guildId = fakeMemberNonBotIsGuild.guild.id;

        const users = await sql`
            SELECT * FROM users
            WHERE id = ${userId}
        `;

        const guildUsers = await sql`
            SELECT * FROM guild_user
            WHERE user_id = ${userId}
              AND guild_id = ${guildId}
        `;

        assert.equal(users.length, 1, 'User should exist in users');
        assert.equal(
            guildUsers.length,
            1,
            'User should be attached to the guild'
        );
    });

    it('Attaches an existing user to another guild without duplicating the user', async () => {
        // First, create the user and attach them to the first guild.
        await execute(fakeMemberNonBotIsGuild);

        // Then, process the same user joining another guild.
        await execute(fakeMemberNonBotIsOfOtherGuild);

        const userId = fakeMemberNonBotIsOfOtherGuild.user.id;
        const guildId = fakeMemberNonBotIsOfOtherGuild.guild.id;

        const users = await sql`
            SELECT * FROM users
            WHERE id = ${userId}
        `;

        const guildUsers = await sql`
            SELECT * FROM guild_user
            WHERE user_id = ${userId}
              AND guild_id = ${guildId}
        `;

        assert.equal(
            users.length,
            1,
            'Existing user should not be duplicated'
        );

        assert.equal(
            guildUsers.length,
            1,
            'Existing user should be attached to the second guild'
        );

        const allGuilds = await sql`
            SELECT guild_id FROM guild_user
            WHERE user_id = ${userId}
        `;

        assert.equal(
            allGuilds.length,
            2,
            'User should be attached to both guilds'
        );
    });

    it('Ignores bot members', async () => {
    const logMock = mock.method(console, 'log');

    try {
        await execute(fakeMemberBotIsGuild);

        assert.ok(
            logMock.mock.calls.some((call) =>
                call.arguments.some((arg) =>
                    String(arg).includes('Failed: User is a bot')
                )
            ),
            'Expected console.log to report that the user is a bot'
        );

        const userId = fakeMemberBotIsGuild.user.id;

        const users = await sql`
            SELECT * FROM users
            WHERE id = ${userId}
        `;

        const guildUsers = await sql`
            SELECT * FROM guild_user
            WHERE user_id = ${userId}
        `;

        assert.equal(users.length, 0, 'Bot should not be added to users');
        assert.equal(
            guildUsers.length,
            0,
            'Bot should not be attached to any guild'
        );
    } finally {
        mock.restoreAll();
    }
});

it('Handles a member without a guild', async () => {
    const logMock = mock.method(console, 'log');

    try {
        await execute(fakeMemberNonBotIsNotGuild);

        assert.ok(
            logMock.mock.calls.some((call) =>
                call.arguments.some((arg) =>
                    String(arg).includes('Failed: User is in DM')
                )
            ),
            'Expected console.log to report that the user is in a DM'
        );
    } finally {
        mock.restoreAll();
    }
});

});