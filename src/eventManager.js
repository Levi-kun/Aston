// eventManager.js
const { EventEmitter } = require('events');

// Create an event emitter
const eventEmitter = new EventEmitter();

// Define the custom event
eventEmitter.on('spawnInCard', (cardData) => {
    // Your logic for spawning a card goes here
    console.log('Card spawned:', cardData);
    // You can emit additional events or perform other actions related to card spawning
});

// Export the event emitter
module.exports = eventEmitter;
