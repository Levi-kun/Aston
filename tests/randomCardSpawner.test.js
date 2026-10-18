// tests/randomCardSpawner.test.js
//
// Unit tests for events/randomCardSpawner.js (node:test, zero new dependencies).
//
// The spawner's helpers are module-private, so paste this at the bottom of
// events/randomCardSpawner.js before running:
//
//   // Exposed for unit tests (tests/randomCardSpawner.test.js)
//   module.exports.recordClaim = recordClaim;
//   module.exports.capitalizeFirstLetter = capitalizeFirstLetter;
//   module.exports.addToPlayer = addToPlayer;
//   module.exports.formatDescription = formatDescription;
//   module.exports.messageCreater = messageCreater;
//
// No database needed: the spawner never requires databases/index.js, and
// recordClaim is still a stub (returns false) until the gain-limit port lands.

const { describe, it, mock, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { MessageFlags } = require("discord.js");

const spawner = require("../events/randomCardSpawner.js");
const eventEmitter = require("../src/eventManager.js");

afterEach(() => mock.restoreAll());

// --- fakes ---------------------------------------------------------------

function makeCard(overrides = {}) {
	return {
		name: "Blaze",
		realPower: 100,
		getRarity: () => "rare",
		_move_sets: [],
		addOwner: mock.fn(),
		...overrides,
	};
}

function makeMessage() {
	const edits = [];
	const handlers = {};
	const message = {
		edits,
		handlers,
		async edit(opts) {
			edits.push(opts);
			return message;
		},
		createMessageComponentCollector() {
			return { on: (event, cb) => { handlers[event] = cb; } };
		},
	};
	return message;
}

function makeChannel() {
	const sent = [];
	const channel = {
		id: "chan1",
		guild: { id: "guild1" },
		sent,
		lastMessage: null,
		async send(payload) {
			sent.push(payload);
			channel.lastMessage = makeMessage();
			return channel.lastMessage;
		},
	};
	return channel;
}

function makeInteraction(overrides = {}) {
	const followUps = [];
	return {
		customId: "Claim",
		user: { id: "user1", displayName: "User One" },
		followUps,
		async deferUpdate() {},
		async followUp(opts) { followUps.push(opts); },
		...overrides,
	};
}

// --- tests ---------------------------------------------------------------

describe("randomCardSpawner", () => {
	describe("execute", () => {
		it("logs that spawning is unavailable until the migration is complete", async () => {
			// Arrange
			const errSpy = mock.method(console, "error");

			// Act
			await spawner.execute({ id: "guild1" });

			// Assert
			assert.equal(errSpy.mock.calls.length, 1);
			assert.match(
				String(errSpy.mock.calls[0].arguments[0]),
				/unavailable until the database migration is complete/
			);
		});
	});

	describe("recordClaim (stub)", () => {
		it("returns false until the gain-limit DB port lands", async () => {
			// Arrange: the stub ignores its arguments.

			// Act
			const claimed = await spawner.recordClaim("user1", "guild1");

			// Assert
			assert.equal(claimed, false);
		});
	});

	describe("capitalizeFirstLetter", () => {
		it("capitalizes the first letter of every word", () => {
			assert.equal(spawner.capitalizeFirstLetter("fire dragon"), "Fire Dragon");
		});

		it("leaves capitals and non-letters alone", () => {
			assert.equal(spawner.capitalizeFirstLetter("Blaze-9"), "Blaze-9");
		});

		it("keeps an empty string empty", () => {
			assert.equal(spawner.capitalizeFirstLetter(""), "");
		});
	});

	describe("addToPlayer", () => {
		it("hands the card the user's id", () => {
			// Arrange
			const user = { id: "user9" };
			const card = makeCard();

			// Act
			spawner.addToPlayer(user, card);

			// Assert
			assert.equal(card.addOwner.mock.calls.length, 1);
			assert.deepEqual(card.addOwner.mock.calls[0].arguments, ["user9"]);
		});
	});

	describe("formatDescription", () => {
		const card = { name: "Blaze", realPower: 100 };

		it("falls back when the description is missing", () => {
			assert.equal(spawner.formatDescription(undefined, {}, card), "No description available.");
			assert.equal(spawner.formatDescription(null, {}, card), "No description available.");
			assert.equal(spawner.formatDescription("", {}, card), "No description available.");
		});

		it("replaces {name} with the card name", () => {
			assert.equal(
				spawner.formatDescription("{name} attacks!", {}, card),
				"Blaze attacks!"
			);
		});

		it("replaces {flat} with the move duration when there are no modifiers", () => {
			assert.equal(
				spawner.formatDescription("lasts {flat} turns", { duration: 3, modifiers: [] }, card),
				"lasts 3 turns"
			);
		});

		it("applies flat/percentage/total/target modifiers in order", () => {
			// Arrange
			const move = {
				duration: 2,
				modifiers: [{ flat: 10, percentage: 50, target: "foe", type: "fire" }],
			};

			// Act
			const out = spawner.formatDescription(
				"deals {total} damage over {flat} turns, {flat} + {percentage}% to {target}",
				move,
				card
			);

			// Assert: total = round(10 + floor(50/100 * 100)) = 60
			assert.equal(out, "deals 60 damage over 2 turns, 10 + 50% to foe");
		});

		it("leaves {total} alone when a modifier has no flat and no percentage", () => {
			const out = spawner.formatDescription(
				"{total} left",
				{ duration: 1, modifiers: [{ target: "foe" }] },
				card
			);
			assert.equal(out, "{total} left");
		});
	});

	describe("messageCreater", () => {
		it("sends an embed with a Claim button", async () => {
			// Arrange
			const channel = makeChannel();
			const card = makeCard();

			// Act
			await spawner.messageCreater("http://img/blaze.png", card, channel);

			// Assert
			assert.equal(channel.sent.length, 1);
			const payload = channel.sent[0];
			assert.equal(payload.embeds[0].data.description, "Blaze");
			assert.equal(payload.embeds[0].data.image.url, "http://img/blaze.png");
			const button = payload.components[0].components[0];
			assert.equal(button.data.custom_id, "Claim");
			assert.equal(button.data.label, "Claim");
		});

		it("answers a claim with the unavailable notice while recordClaim is a stub", async () => {
			// Arrange
			const channel = makeChannel();
			await spawner.messageCreater("http://img/blaze.png", makeCard(), channel);
			const message = channel.lastMessage;
			const interaction = makeInteraction();

			// Act
			await message.handlers.collect(interaction);

			// Assert
			assert.equal(interaction.followUps.length, 1);
			assert.match(
				interaction.followUps[0].content,
				/unavailable until the database migration is complete/
			);
			assert.equal(interaction.followUps[0].flags, MessageFlags.Ephemeral);
		});

		it("edits the ran-away message when the collector times out unclaimed", async () => {
			// Arrange
			const channel = makeChannel();
			await spawner.messageCreater("http://img/blaze.png", makeCard(), channel);
			const message = channel.lastMessage;

			// Act
			await message.handlers.end(new Map(), "time");

			// Assert
			assert.deepEqual(message.edits[0], {
				content: "Boss, Blaze ran away!",
				components: [],
				embeds: [],
			});
		});
	});

	describe("eventEmitter wiring", () => {
		it("routes the spawnInCard event to execute", async () => {
			// Arrange
			const errSpy = mock.method(console, "error");

			// Act
			eventEmitter.emit("spawnInCard", { id: "guild1" });
			await new Promise((r) => setTimeout(r, 25));

			// Assert
			const logged = errSpy.mock.calls.some((c) =>
				String(c.arguments[0]).includes("unavailable until the database migration is complete")
			);
			assert.ok(logged, "expected execute() to log the unavailable message");
		});
	});
});
