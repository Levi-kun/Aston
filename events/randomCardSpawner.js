const {
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	ActionRowBuilder,
	MessageFlags,
} = require("discord.js");
const eventEmitter = require("../src/eventManager");

async function recordClaim(userId, guildId) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	/*
	//** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "readOne", args: [{ id: `${guildId}` }] } INFORMATION.
	RECREATE THIS IN DB,

	-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

	*/
	/*
	//** TO DO! CONTACTED DATABASE WITH { collection: "gainLimitData", operation: "countDocuments", args: [{ user_id: userId, guild_id: guildId, date: { $gte: today } }] } INFORMATION.
	RECREATE THIS IN DB,

	-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

	*/
	/*
	//** TO DO! CONTACTED DATABASE WITH { collection: "gainLimitData", operation: "insertOne", args: [{ user_id: userId, guild_id: guildId, date: new Date() }] } INFORMATION.
	RECREATE THIS IN DB,

	-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

	*/
	return false;
}

function capitalizeFirstLetter(str) {
	return str.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function addToPlayer(user, card) {
	card.addOwner(user.id);
}

function formatDescription(description, move, card) {
	if (!description) return "No description available.";

	let formattedDescription = description;

	formattedDescription = formattedDescription.replace("{name}", card.name);
	formattedDescription = formattedDescription.replace(
		"{flat}",
		move.duration
	);
	// Ensure modifiers exist and map relevant placeholders
	if (Array.isArray(move.modifiers)) {
		move.modifiers.forEach((mod) => {
			if (mod.flat !== undefined) {
				formattedDescription = formattedDescription.replace(
					"{flat}",
					mod.flat
				);
			}
			if (mod.percentage !== undefined) {
				formattedDescription = formattedDescription.replace(
					"{percentage}",
					mod.percentage
				);
			}
			if (mod.flat !== undefined && mod.percentage !== undefined) {
				const percentageValue = Math.floor(
					(mod.percentage / 100) * (card.realPower || 1)
				);
				formattedDescription = formattedDescription.replace(
					"{total}",
					`${Math.round(mod.flat + percentageValue)}`
				);
			}
			if (mod.target) {
				formattedDescription = formattedDescription.replace(
					"{target}",
					mod.target
				);
			}
			if (mod.type) {
				formattedDescription = formattedDescription.replace(
					"{type}",
					mod.type
				);
			}
		});
	}

	return formattedDescription;
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

		let cardClaimed = false;

		collector.on("collect", async (i) => {
			try {
				await i.deferUpdate(); // Acknowledge immediately

				if (i.customId === "Claim") {
					const claimed = await recordClaim(
						i.user.id,
						defaultChannel.guild.id
					);
					if (!claimed) {
						await i.followUp({
							content: "Card claiming is unavailable until the database migration is complete.",
							flags: MessageFlags.Ephemeral,
						});
						return;
					}

					addToPlayer(i.user, card);
					cardClaimed = true; // Mark card as claimed

					if (
						!Array.isArray(card._move_sets) ||
						card._move_sets.length === 0
					) {
						console.error("No valid moves found for card:", card);
						return;
					}

					const moveButtons = card._move_sets.map((move, index) =>
						new ButtonBuilder()
							.setCustomId(`move_${index}`)
							.setLabel(`${move.name || "Unknown Move"}`)
							.setStyle(ButtonStyle.Secondary)
					);

					const movesRow = new ActionRowBuilder().addComponents(
						...moveButtons.slice(0, 5)
					);

					const newEmbed = new EmbedBuilder()
						.setColor("000000")
						.setImage(image)
						.setDescription(
							capitalizeFirstLetter(
								`${card.name} | ${card.realPower} | Owner: ${i.user.displayName}` ||
									"Unknown Card"
							)
						);

					await message.edit({
						content: "Caught!",
						embeds: [newEmbed],
						components: [movesRow],
					});
				}
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
						move,
						card
					);
					await i.followUp({
						content: `**Move:** ${move.name}\n**Descriptions:** ${formattedDescription}\n**Cooldown:** ${move.cooldown}	| **Turn Cost:** ${move.turnCost}`,
						flags: MessageFlags.Ephemeral, // Only visible to the user
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

		collector.on("end", async (collected, reason) => {
			try {
				if (!cardClaimed && reason === "time") {
					// No one claimed the card, and it timed out
					await message.edit({
						content: `Boss, ${card.name} ran away!`,
						components: [],
						embeds: [],
					});
				} else if (cardClaimed) {
					// Card was claimed, just remove buttons
					await message.edit({
						components: [],
					});
				}
			} catch (endErr) {
				console.error(
					"Error during collector end:",
					endErr.message,
					endErr.stack
				);
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
		/*
		//** TO DO! CONTACTED DATABASE WITH { collection: "settings", operation: "readOne", args: [{ rarity_Settings: { $exists: true } }] } INFORMATION.
		RECREATE THIS IN DB,

		-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

		*/
		/*
		//** TO DO! CONTACTED DATABASE WITH { collection: "animeCardList", operation: "aggregate", args: [1, { rarity: parseInt(cardType, 10) }] } INFORMATION.
		RECREATE THIS IN DB,

		-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

		*/
		/*
		//** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "readOne", args: [{ id: `${guild.id}` }] } INFORMATION.
		RECREATE THIS IN DB,

		-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

		*/
		/*
		//** TO DO! CONTACTED DATABASE WITH { collection: "animeCardPhotos", operation: "readMany", args: [{ card_id: card._id }] } INFORMATION.
		RECREATE THIS IN DB,

		-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

		*/
		console.error("Card spawning is unavailable until the database migration is complete.");
	},
};

// Listen for the 'spawnInCard' event
eventEmitter.on("spawnInCard", (guild) => {
	module.exports.execute(guild);
});
