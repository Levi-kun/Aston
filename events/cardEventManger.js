const { Events } = require("discord.js");
const eventEmitter = require("../src/eventManager");
const schedule = require(('node-schedule'))
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("databases/animeDataBase.db"); // Adjust the database path as needed
const util = require("util");
const dbAllAsync = util.promisify(db.all.bind(db));


const serverSchedules = new Map();

function getRandomTime() {
    const date = new Date();
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(Math.floor(Math.random() * 60));
    return date;
}
async function getAmountPerServer(guildId) {
    const query = `SELECT searchADAY FROM guildTable WHERE guildID = ?`;

    try {
        const result = await dbAllAsync(query, [guildId]);
        return result[0]?.searchADAY || 20; // Return the value or 0 if not found
    } catch (error) {
        return 20;
    }
}

async function scheduleRandomJobsForServer(guild) {
    const guildId = guild.id

    const guildExists = await isGuildInTable(guildId);

    if (!guildExists) {
        return; // Exit the function if the guild is not in the table
    }


    try {
        const amountPerDay = await getAmountPerServer(guildId);

        if (amountPerDay === 0) {
            
            return; // Exit if no jobs need to be scheduled
        }

        // Clear any existing schedules for the server
        if (serverSchedules.has(guildId)) {
            serverSchedules.get(guildId).forEach(job => job.cancel());
            serverSchedules.delete(guildId);
        }

        const scheduledTimes = [];

        for (let i = 0; i < amountPerDay; i++) {
            const randomTime = getRandomTime();
            scheduledTimes.push(randomTime);

            const job = schedule.scheduleJob(randomTime, () => {
       
                eventEmitter.emit("spawnInCard", guild); // Trigger your event
            });

            if (!serverSchedules.has(guildId)) {
                serverSchedules.set(guildId, []);
            }

            serverSchedules.get(guildId).push(job);
        }

    } catch (error) {
        console.error(`Failed to schedule jobs for guild ${guildId}:`, error);
    }
}

// Function to schedule daily reset at midnight
function scheduleDailyReset() {
    schedule.scheduleJob('0 0 * * *', async () => {
        client.guilds.cache.forEach(async guild => {
            await scheduleRandomJobsForServer(guild.id);
        });
    });
}


async function isGuildInTable(guildId) {
    const query = `SELECT * FROM guildTable WHERE guildID = ?`;
    
    try {
        const result = await dbAllAsync(query, [guildId]);
        return result.length > 0; // Return true if guild exists, otherwise false
    } catch (error) {
        console.error(`Failed to check guild ${guildId} in the table:`, error);
        return false; // If an error occurs, treat as if the guild does not exist
    }
}



module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {

        client.guilds.cache.forEach(guild => {
        scheduleRandomJobsForServer(guild);
        
    });

    scheduleDailyReset()

    },
};
