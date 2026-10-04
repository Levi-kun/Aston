const fs = require("node:fs");
const util = require("util");
const path = require("node:path");
const bot = require("./client.js");

require("dotenv").config();

const token = process.env.TOKEN;



/**
 * 
 * 	This 'turns' the bot on, by hooking into the events located in the events/ folder
 * 
 */

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		bot.once(event.name, (...args) => event.execute(...args));
	} else {
		bot.on(event.name, (...args) => event.execute(...args));
	}
}

/**
 * 
 *  this is for logging
 *	it creats a file and sets them up by this format {years-hours-minutes-seconds-timestamp}
 *  and all console prints will be logged by date/time.
 */

function getTimeStamp(dateObject) {
	const year = dateObject.getFullYear();
	const hours = dateObject.getHours();
	const minutes = dateObject.getMinutes();
	const seconds = dateObject.getSeconds();
	const timestamp = Date.now();
	return `${year}-${hours}-${minutes}-${seconds}-${timestamp}`;
}

const timestamp = new Date();
const logFile = fs.createWriteStream(
	`./consoleLogs/${getTimeStamp(timestamp)}`,
	{ flags: "a" }
);

const logStdout = process.stdout;

console.log = function () {
	logFile.write(util.format.apply(null, arguments) + "\n");
	logStdout.write(util.format.apply(null, arguments) + "\n");
};

bot.login(token);
