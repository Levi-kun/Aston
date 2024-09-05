
const { EventEmitter } = require('events');

const eventEmitter = new EventEmitter();

eventEmitter.on('spawnInCard', (guild) => {
    console.log('in guild:', guild.name)
});

module.exports = eventEmitter;
