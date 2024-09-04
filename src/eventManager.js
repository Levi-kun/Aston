
const { EventEmitter } = require('events');

const eventEmitter = new EventEmitter();

eventEmitter.on('spawnInCard', (cardData) => {
    console.log('Card spawned:', cardData);
});

module.exports = eventEmitter;
