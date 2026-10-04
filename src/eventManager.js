const { EventEmitter } = require("events");

const eventEmitter = new EventEmitter();

/**
 * 
 *  This creates the Event vehicle for the Spawn Card Random Event.
 * 
 */

eventEmitter.on("spawnInCard", (guild) => {});

module.exports = eventEmitter;
