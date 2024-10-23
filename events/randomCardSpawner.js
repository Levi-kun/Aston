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


async function addToPlayer(user, guild, card) {

	card.addOwner(user.id);

}

/**
 * Creates and sends a message with an image, card details, and a claim button to the default channel.
 *
 * @param {string} image - The URL or attachment of the card image.
 * @param {Object} card - The card object containing details like name, rarity, and power.
 * @param {import('discord.js').TextChannel} defaultChannel - The default channel where the message will be sent.
 * @param {import('discord.js').Guild} guild - The guild where the message will be sent.
 * @param {number} power - The spawned power for the card.
 *
 * @returns {Promise<import('discord.js').Message>} - The sent message.
 */

async function messageCreater(image, card, defaultChannel, guild) {
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
				{ name: "Value", value: `${card.realPower}` }, // Display the spawned power here
				{
					name: "Rarity",
					value: `${card.getRarity()}`,
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
					await addToPlayer(i.user, guild, card);
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
			let card = await query.aggregate(1, {
				rarity: parseInt(cardType, 10),
			});

			if (!card || card.length === 0) {
				console.error("Card not found");
				return;
			}

			// Extract the first card from the results
			card = card[0].lv;
			console.log(1, card);
			a = new Card(card).convertToOwnedCard(guild.id);
			console.log(2, a);
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
						a,
						defaultChannel,
						link[0],
						guild
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
