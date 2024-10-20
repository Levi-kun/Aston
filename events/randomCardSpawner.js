const {
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	ActionRowBuilder,
} = require("discord.js");
const { Query } = require("../databases/query.js");
const eventEmitter = require("../src/eventManager");
const { ObjectId } = require("mongodb");
const version = 1; // version header

function capitalizeFirstLetter(str) {
	return str
		.split(" ")
		.map((word) => {
			for (let i = 0; i < word.length; i++) {
				if (/[a-zA-Z]/.test(word.charAt(i))) {
					return (
						word.slice(0, i) +
						word.charAt(i).toUpperCase() +
						word.slice(i + 1)
					);
				}
			}
			return word; // If no alphabetical characters, return the word as is
		})
		.join(" ");
}

/**
 * This function chooses a random rank from the given rarity object.
 * @param {Object} rarity - An object containing keys as category names and values as weights for each category.
 * @returns {String} - A string representing the chosen category name.
 */
function chooseRank(rarity) {
	const keys = Object.keys(rarity);
	const weights = Object.values(rarity);
	const totalWeight = weights.reduce((acc, val) => acc + val, 0);
	const random = Math.random() * totalWeight;
	let cumulativeWeight = 0;
	for (let i = 0; i < keys.length; i++) {
		cumulativeWeight += weights[i];
		if (random < cumulativeWeight) {
			return keys[i]; // Convert to integer
		}
	}
}

// Helper function
function getRandomMultiplier(min, max) {
	return min + Math.random() * (max - min);
}

async function grabCardMoves(card) {
	const query = new Query("animeCardMoves");

	// Helper function to get a move from the 'Basic' category
	async function getDefaultMove() {
		const basicMove = await query.readOne({ "parent.id": "Basic" });
		if (!basicMove) {
			throw new Error("No default move found for 'Basic' category.");
		}
		return basicMove;
	}

	try {
		// 1. Get the move directly tied to the card (parent.id === card.name)
		let tiedMove = await query.readOne({ "parent.id": card.name }); // Use card name instead of ObjectId

		// If no tied move is found, use the default move
		if (!tiedMove) {
			console.warn(
				`No tied move found for card: ${card.name}, using default 'Basic' move.`
			);
			tiedMove = await getDefaultMove();
		}

		// 2. Shuffle the card's categories to ensure randomness
		let categories = [...card.categories]; // Clone the categories array
		categories = categories.sort(() => 0.5 - Math.random()); // Randomize the array
		const selectedMoves = new Set();
		selectedMoves.add(tiedMove.name); // Ensure the tied move is in the set

		// 3. Get moves tied to the first randomly selected category
		let firstCategoryMoves;
		try {
			firstCategoryMoves = await query.readMany({
				"parent.id": categories[0],
			}); // Use category name instead of ObjectId
		} catch (err) {
			console.warn(
				`No moves found for category: ${categories[0]}, using default 'Basic' move.`
			);
			firstCategoryMoves = [await getDefaultMove()];
		}

		// Filter out any moves that are already selected to prevent duplicates
		const uniqueFirstCategoryMoves = firstCategoryMoves.filter(
			(move) => !selectedMoves.has(move.name)
		);

		// Randomly select one unique move from the first category
		const firstCategoryMove =
			uniqueFirstCategoryMoves[
				Math.floor(Math.random() * uniqueFirstCategoryMoves.length)
			];
		selectedMoves.add(firstCategoryMove.name); // Add it to the set of selected moves

		// 4. Reset categories and get moves tied to a different randomly selected category
		const secondCategory =
			categories.length > 1 ? categories[1] : categories[0]; // Choose a second category
		let secondCategoryMoves;
		try {
			secondCategoryMoves = await query.readMany({
				"parent.id": secondCategory,
			}); // Use category name instead of ObjectId
		} catch (err) {
			console.warn(
				`No moves found for category: ${secondCategory}, using default 'Basic' move.`
			);
			secondCategoryMoves = [await getDefaultMove()];
		}

		// Filter out any moves that are already selected to prevent duplicates
		const uniqueSecondCategoryMoves = secondCategoryMoves.filter(
			(move) => !selectedMoves.has(move.name)
		);

		// Randomly select one unique move from the second category
		const secondCategoryMove =
			uniqueSecondCategoryMoves[
				Math.floor(Math.random() * uniqueSecondCategoryMoves.length)
			];
		selectedMoves.add(secondCategoryMove.name); // Add it to the set of selected moves

		// 5. Return the final array of 3 unique moves (one tied to the card, two tied to random categories or 'Basic')
		const moves = [tiedMove, firstCategoryMove, secondCategoryMove];
		return moves;
	} catch (err) {
		console.error(`Error in grabCardMoves: ${err.message}`);
		throw err;
	}
}

function rarityDesignater(rarity) {
	let value = "C";
	if (rarity <= 2) {
		value = "B";
	} else if (rarity <= 3) {
		value = "A";
	} else if (rarity <= 4) {
		value = "S";
	} else if (rarity <= 5) {
		value = "S+";
	}
	return value;
}

function powerSpawner(value, power) {
	if (value >= 4) {
		power = Math.floor(power * getRandomMultiplier(0.9, 1.111));
		return power;
	} else {
		power = Math.floor(
			power *
				getRandomMultiplier(
					getRandomMultiplier(0.5, 0.899),
					getRandomMultiplier(1, getRandomMultiplier(1.1, 1.4599))
				)
		);
		return power;
	}
}

async function addToPlayer(user, card, guild, power) {
	const query = new Query("ownedCards");
	try {
		const moveIds = await grabCardMoves(card).then((moves) =>
			moves.map((move) => move._id)
		);
		const rowQuery = {
			vr: version,
			rank: card.rarity,
			player_id: user.id,
			guild_id: guild.id,
			realPower: power,
			move_ids: moveIds,
			card_id: card._id,
			inGroup: false, // or set it based on your logic
		};
		console.log(rowQuery);
		const rowData = await query.insertOne(rowQuery);
		return rowData;
	} catch (err) {
		console.error(`Error inserting into ownedCards: ${err.message}`);
		throw err;
	}
}

async function messageCreater(image, card, defaultChannel, guild, power) {
	try {
		const claimButton = new ButtonBuilder()
			.setCustomId("Claim")
			.setLabel("Claim this Card")
			.setStyle(ButtonStyle.Primary);

		const cardEmbed = new EmbedBuilder()
			.setColor("000000")
			.setImage(`${image}`)
			.setDescription(`${capitalizeFirstLetter(card.name)}`)
			.addFields(
				{ name: "Value", value: `${power}` }, // Display the spawned power here
				{
					name: "Rarity",
					value: `${rarityDesignater(card.rarity)}`,
					inline: true,
				}
			);

		const row = new ActionRowBuilder().addComponents(claimButton);

		let message = await defaultChannel.send({
			embeds: [cardEmbed],
			components: [row],
		});

		const collectorFilter = (i) =>
			i.customId === "next" || i.customId === "Claim";
		const collector = message.createMessageComponentCollector({
			filter: collectorFilter,
			time: 600_000,
		});

		collector.on("collect", async (i) => {
			if (i.customId === "Claim") {
				await message.delete();
				try {
					await addToPlayer(i.user, card, guild, power);
					await message.channel.send(
						`${i.user.username}, congrats on obtaining: ${card.Name}`
					);
				} catch (err) {
					console.error(`Error in addToPlayer: ${err.message}`);
					await message.channel.send(
						`Sorry ${i.user.username}, there was an error claiming the card. Please try again later.`
					);
				}
			}
		});

		collector.on("end", (collected) => {
			message.delete();
			console.log(`Collected ${collected.size} interactions.`);
		});
	} catch (err) {
		console.error(`Error in messageCreater: ${err.message}`);
		throw err;
	}
}
module.exports = {
	name: "spawnInCard",
	async execute(guild) {
		try {
			const query = new Query("animeCardList");

			// Fetch rarity settings
			const settingsQuery = new Query("settings");
			const rarity_Settings = await settingsQuery.readOne({
				rarity_Settings: { $exists: true },
			});

			// Choose rank
			const cardType = chooseRank(rarity_Settings.rarity_Settings);

			// Aggregate the card
			let card = await query.aggregate(1, cardType);

			if (!card || card.length === 0) {
				console.error("Card not found");
				return;
			}

			// Extract the first card from the results
			card = card[0].lv;
			console.log(card.name);
			// Spawn the power for the card
			const power =
				Math.round(powerSpawner(card.rarity, card.power) / 50) * 50; // Call powerSpawner with appropriate values

			// Get the default channel ID
			let guildData;
			try {
				const guildQuery = new Query("guildDataBase");
				guildData = await guildQuery.readOne({ id: guild.id });
				if (!guildData) {
					console.error("Guild data not found", guild.id, guild.name);
					return;
				}
			} catch (err) {
				console.error(`Error in fetching guild data: ${err.message}`);
				return;
			}

			const defaultChannelId = guildData.channelInformation.default._id;

			// Fetch card photos
			let photos;
			try {
				const cardIdQuery = { card_id: new ObjectId(card._id) };
				const photoQuery = new Query("animeCardPhotos");
				photos = await photoQuery.readMany(cardIdQuery);
				if (!photos || photos.length === 0) {
					console.error(`No images found for card: ${card._id}`);
					return;
				}
			} catch (err) {
				console.error(`Error in fetching card photos: ${err.message}`);
				return;
			}

			const image = photos.map((photo) => photo.attachment);
			const link = photos.map(
				(photo) => photo.linkAttachment || "@asp_levi"
			);

			// Send messages to the default channel
			const defaultChannel = guild.channels.cache.get(defaultChannelId);
			if (defaultChannel) {
				try {
					await messageCreater(
						image[0],
						card,
						defaultChannel,
						link[0],
						guild,
						power
					); // Pass the spawned power to the message creator
				} catch (err) {
					console.error(`Error in messageCreater: ${err.message}`);
				}
			} else {
				console.error("Default channel not found");
			}
		} catch (err) {
			console.error(`Error executing spawnInCard: ${err.message}`);
		}
	},
};

// Listen for the 'spawnInCard' event
eventEmitter.on("spawnInCard", (guild) => {
	module.exports.execute(guild);
});
