const {
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	ActionRowBuilder,
} = require("discord.js");
const { Query } = require("../databases/query.js");
const { Card } = require("../classes/cardManager.js");
const eventEmitter = require("../src/eventManager");
const { ObjectId } = require("mongodb");
const version = 1; // version header

function chooseRank(rarity) {
	const keys = Object.keys(rarity);
	const weights = Object.values(rarity);
	const totalWeight = weights.reduce((acc, val) => acc + val, 0);
	const random = Math.random() * totalWeight;
	let cumulativeWeight = 0;
	for (let i = 0; i < keys.length; i++) {
		cumulativeWeight += weights[i];
		if (random < cumulativeWeight) {
			return keys[i];
		}
	}
}

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
			return word;
		})
		.join(" ");
}

function addToPlayer(user, card) {
	card.addOwner(user.id);
}

function formatDescription(description, move, card) {
	if (!description) return "No description available.";

	let formattedDescription = description;

	// Base placeholders from the move and card
	const placeholderMap = {
		"{name}": move.name || "Unknown",
		"{level}": move.level || "N/A",
		"{duration}": move.duration || "N/A",
		"{card_name}": card?.name || "Unknown Card",
	};

	// Ensure modifiers array exists
	const modifiers = Array.isArray(move.modifiers) ? move.modifiers : [];

	// Add modifier-specific placeholders
	modifiers.forEach((mod, index) => {
		placeholderMap[`{type_${index}}`] = mod.type || "Unknown Type";
		placeholderMap[`{target_${index}}`] = mod.target || "Unknown Target";
		placeholderMap[`{flat_${index}}`] = mod.value || "N/A";
	});

	// Ensure requirementForm and nested data exist
	if (move.requirementForm && move.requirementForm.requirement) {
		const req = move.requirementForm.requirement;
		placeholderMap["{requirementType}"] = req.type || "N/A";
		placeholderMap["{requirementValue}"] = req.value || "N/A";

		const reqModifiers = Array.isArray(move.requirementForm.data?.modifiers)
			? move.requirementForm.data.modifiers
			: [];

		// Include placeholders for requirement modifiers
		reqModifiers.forEach((mod, index) => {
			placeholderMap[`{req_type_${index}}`] = mod.type || "Unknown Type";
			placeholderMap[`{req_target_${index}}`] =
				mod.target || "Unknown Target";
			placeholderMap[`{req_flat_${index}}`] = mod.value || "N/A";
		});
	}

	// Replace placeholders in the description
	Object.keys(placeholderMap).forEach((placeholder) => {
		formattedDescription = formattedDescription.replaceAll(
			placeholder,
			placeholderMap[placeholder]
		);
	});

	// Append modifier details for clarity (if any modifiers exist)
	const modifierDetails =
		modifiers.length > 0
			? modifiers
					.map(
						(mod) =>
							`Type: ${mod.type}, Target: ${mod.target}, Value: ${mod.value}`
					)
					.join("\n")
			: "No modifiers available.";

	return `${formattedDescription}\n\n**Modifiers:**\n${modifierDetails}`;
}

async function messageCreater(image, card, defaultChannel) {
	try {
		const claimButton = new ButtonBuilder()
			.setCustomId("Claim")
			.setLabel("Claim")
			.setStyle(ButtonStyle.Primary);

		const cardEmbed = new EmbedBuilder()
			.setColor("000000")
			.setImage(image)
			.setDescription(capitalizeFirstLetter(card.name || "Unknown Card"))
			.addFields(
				{ name: "Value", value: `${card.realPower || "N/A"}` },
				{ name: "Rarity", value: `${card.getRarity()}`, inline: true }
			);

		const row = new ActionRowBuilder().addComponents(claimButton);
		const message = await defaultChannel.send({
			embeds: [cardEmbed],
			components: [row],
		});

		const collector = message.createMessageComponentCollector({
			time: 300_000,
		});

		collector.on("collect", async (i) => {
			try {
				await i.deferUpdate(); // Acknowledge immediately

				if (i.customId === "Claim") {
					addToPlayer(i.user, card);

					if (
						!Array.isArray(card._move_sets) ||
						card._move_sets.length === 0
					) {
						console.error("No valid moves found for card:", card);
						return;
					}

					// Create buttons for moves (max 5 buttons per row)
					const moveButtons = card._move_sets.map((move, index) =>
						new ButtonBuilder()
							.setCustomId(`move_${index}`)
							.setLabel(`${move.name || "Unknown Move"}`)
							.setStyle(ButtonStyle.Secondary)
					);

					const movesRow = new ActionRowBuilder().addComponents(
						...moveButtons.slice(0, 5)
					);

					// Edit the message to show move buttons
					await message.edit({
						content: `${
							i.user.username
						}, congrats on obtaining: ${capitalizeFirstLetter(
							card.name
						)}`,
						components: [movesRow],
					});
				}

				// If a move button is pressed
				if (i.customId.startsWith("move_")) {
					const moveIndex = parseInt(i.customId.split("_")[1], 10);
					const move = card._move_sets[moveIndex];

					if (!move) {
						console.error(
							"Invalid move index:",
							moveIndex,
							"for card:",
							card
						);
						return;
					}

					// Format description and handle placeholders
					const formattedDescription = formatDescription(
						move.description,
						move.modifiers || [],
						card
					);

					// Send a new message with the move details
					await i.followUp({
						content: `**Move:** ${move.name}\n**Type:** ${
							move.type
						}\n**Power:** ${
							move.modifiers
								?.map((mod) => mod.value)
								.join(", ") || "N/A"
						}\n**Effect:** ${formattedDescription}`,
						ephemeral: true, // Only visible to the user
					});
				}
			} catch (innerErr) {
				console.error(
					"Error during collector interaction:",
					innerErr.message,
					innerErr.stack
				);
			}
		});

		collector.on("end", async (_, reason) => {
			if (reason === "time") {
				await message.edit({
					content: `Boss, ${card.name} ran away!`,
					components: [],
				});
			}
		});
	} catch (err) {
		console.error("Error in messageCreater:", err.message, err.stack);
		throw err;
	}
}

module.exports = {
	name: "spawnInCard",
	async execute(guild) {
		try {
			const query = new Query("animeCardList");
			const settingsQuery = new Query("settings");
			const rarity_Settings = await settingsQuery.readOne({
				rarity_Settings: { $exists: true },
			});

			const cardType = chooseRank(rarity_Settings.rarity_Settings);
			let card = await query.aggregate(1, {
				rarity: parseInt(cardType, 10),
			});

			if (!card || card.length === 0) {
				console.error("Card not found");
				return;
			}

			card = card[0].lv;
			const adjustedCard = await new Card(card).convertToOwnedCard(
				guild.id
			);

			const guildQuery = new Query("guildDataBase");
			const guildData = await guildQuery.readOne({ id: `${guild.id}` });

			const defaultChannelId = guildData.channelInformation.default._id;
			const photoQuery = new Query("animeCardPhotos");
			const photos = await photoQuery.readMany({
				card_id: new ObjectId(card._id),
			});

			const image = photos.map((photo) => photo.attachment);

			const defaultChannel = guild.channels.cache.get(defaultChannelId);
			if (defaultChannel) {
				await messageCreater(image[0], adjustedCard, defaultChannel);
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
