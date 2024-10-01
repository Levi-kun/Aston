const fs = require("node:fs");

const util = require("util");

const path = require("node:path");

const bot = require("./client.js");

require("dotenv").config();

const token = process.env.TOKEN;

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

function getTimeStamp(dateObject) {
    // current year
    const year = dateObject.getFullYear();

    // current hours
    const hours = dateObject.getHours();

    // current minutes
    const minutes = dateObject.getMinutes();
    const timestamp = Date.now();
    // current seconds
    const seconds = dateObject.getSeconds();

    return `${year}-${hours}-${minutes}-${seconds}-${timestamp}`;
}

const timestamp = new Date();
const logFile = fs.createWriteStream(
    `./consoleLogs/${getTimeStamp(timestamp)}`,
    { flags: "a" }
);

// Create a console logger that writes to the file
const logStdout = process.stdout;

console.log = function () {
    logFile.write(util.format.apply(null, arguments) + "\n");
    logStdout.write(util.format.apply(null, arguments) + "\n");
};

bot.login(token);
