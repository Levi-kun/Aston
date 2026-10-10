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

/** logging agent removed, will implement something different */

bot.login(token);
