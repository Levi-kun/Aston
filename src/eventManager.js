const { EventEmitter } = require("events");

const eventEmitter = new EventEmitter();

eventEmitter.on("spawnInCard", (guild) => {});

module.exports = eventEmitter;
