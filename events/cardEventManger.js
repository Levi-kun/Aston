const { Events } = require("discord.js");
const eventEmitter = require("../src/eventManager");
const schedule = require("node-schedule");
const { Query } = require("../databases/query.js");

const serverSchedules = new Map();

function getRandomTime() {
	const date = new Date();
	date.setHours(Math.floor(Math.random() * 24));
	date.setMinutes(Math.floor(Math.random() * 60));
	date.setSeconds(Math.floor(Math.random() * 60));
	return date;
}

const guildQuery = new Query("guildDataBase");

async function getAmountPerServer(guildId) {
	const gQuery = { id: guildId };
	try {
		return (await guildQuery.readOne(gQuery).searchADAY) || 20;
	} catch (error) {
		console.log(error);
		return 20;
	}
}

async function resetDailyClaims() {
	const gainLimitQuery = new Query("gainLimitData");
	await gainLimitQuery.deleteMany({});
	console.log("Daily claim limits reset.");
}

function scheduleJobsForGuild(guildId, numJobs) {
	const scheduledJobs = Array.from({ length: numJobs }, () =>
		schedule.scheduleJob(getRandomTime(), () =>
			eventEmitter.emit("spawnInCard", guildId)
		)
	);
	serverSchedules.set(guildId, scheduledJobs);
}

async function scheduleRandomJobsForServer(guild) {
	const guildId = guild.id;

	const guildExists = await isGuildInTable(guildId);

	if (!guildExists) return; // Exit the function if the guild is not in the table

	try {
		const amountPerDay = await getAmountPerServer(guildId);
		if (amountPerDay === 0) return;

		serverSchedules.get(guildId)?.forEach((job) => job.cancel());
		scheduleJobsForGuild(guild, amountPerDay);
	} catch (error) {
		console.error(`Failed to schedule jobs for guild ${guildId}:`, error);
	}
}

// Function to schedule daily reset at midnight
function scheduleDailyReset(client) {
	schedule.scheduleJob("0 0 * * *", async () => {
		client.guilds.cache.forEach(async (guild) => {
			await scheduleRandomJobsForServer(guild);
			await resetDailyClaims();
		});
	});
}

async function isGuildInTable(guildId) {
	const query = { id: guildId };

	try {
		const result = guildQuery.readOne(query);
		if (Object.keys(result).length == 0) {
			return true;
		} else {
			return false;
		}
	} catch (error) {
		console.error(`Failed to check guild ${guildId} in the table:`, error);
		return false; // If an error occurs, treat as if the guild does not exist
	}
}

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		client.guilds.cache.forEach((guild) => {
			scheduleRandomJobsForServer(guild);
		});

		scheduleDailyReset(client);
	},
};
