const {
	Collection,
	Guild,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} = require("discord.js");
const { Query } = require("../databases/query.js"); // Adjust the path accordingly
const bot = require("../client.js");
const eventEmitter = require("../src/eventManager");
const photoQuery = new Query("animeCardPhotos");
const moveQuery = new Query("animeCardMoves");
const moveTypes = Object.freeze({
	DMG: "DMG",
	SPECIAL: "SPECIAL",
	BUFF: "BUFF",
	DEBUFF: "DEBUFF",
	PASSIVE: "PASSIVE",
	FOCUS: "FOCUS",
});

/**
 * Card class represents a player's card with all necessary properties and methods.
 */

const ownedCardsQuery = new Query("ownedCards");
class Card {
	constructor(data) {
		this._id = data._id;
		this.name = data.name;
		this.realPower = data.realPower;
		this.rank = data.rank;
		this.version = data.version;
		this.owner = data.player_id;
		this.categories = data.categories;
		this.createdAt = data.created_At;
		this.card_id = data.card_id;
		this.default = data.inGroup;

		this._cloneCard = false;

		this.move_sets = {};
		for (let i = 0; i < this.move_ids.length; i++) {
			let values = moveQuery.findOne({ _id: this.move_ids[i] });
			this.move_sets[move_ids[i]] = values;

			// proxy

			return new Proxy(this, {
				set: async (target, prop, value) => {
					target[prop] = value;
					if (prop.startsWith("_")) return;

					if ((this._cloneCard = true)) return;

					try {
						await ownedCardsQuery.updateOne(
							{ _id: target._id }, // Find card by its ID
							{ $set: { prop: value } } // Update the changed property
						);
					} catch (error) {
						console.error("Error updating card:", error);
					}

					return true;
				},
			});
		}
	}
	static async createNewCard(args) {
		const newCardData = await ownedCardsQuery.insertOne(args);
		return new card(newCardData);
	}
	/** 
    Static method to fetch a specific card.
    * @param {object} - Object for mongodb filter
    */
	static async getCardByParam(args) {
		const data = ownedCardsQuery.readOne(args);
		if (!data || Object.keys(data).length === 0) {
			return "Error Failure to grab card by args";
		}
		return new Card(data);
	}
	/**
	 * Static method to fetch multiple cards by their parent card IDs.
	 * @param {Array<string>} cardIds - Array of card IDs.
	 * @returns {Promise<Array<Card>>}
	 */
	static async getCardsByIds(cardIds) {
		if (!cardIds.length) return [];

		try {
			// Fetch owned card data
			const ownedCards = await ownedCardsQuery.readMany({
				card_id: { $in: cardIds },
			});

			if (!ownedCards.length) return [];

			// Create a map for quick lookup
			const animeCardMap = {};
			ownedCards.forEach((oc) => {
				animeCardMap[oc._id] = oc;
			});

			// Fetch move sets for each card
			const cards = await Promise.all(
				ownedCards.map(async (oc) => {
					const animeCard = animeCardMap[oc.card_id];
					if (!animeCard) {
						console.warn(
							`Anime card with ID ${oc.card_id} not found.`
						);
						return null;
					}
					return new Card({
						...oc,
					});
				})
			);

			// Filter out any null values due to missing anime cards
			return cards.filter((card) => card !== null);
		} catch (error) {
			console.error(`Error fetching cards by IDs: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Static method to fetch move sets for a card by move IDs.
	 * @param {string} move_ids - Comma-separated string of move IDs.
	 * @returns {Promise<Array<Move>>}
	 */
	static async getMovesForCard(move_ids) {
		if (!move_ids) return [];

		try {
			for (let i = 0; i < this.move_ids.length; i++) {
				let values = moveQuery.findOne({ _id: this.move_ids[i] });
				this.move_sets[move_ids[i]] = values;
			}
		} catch (error) {
			console.error(`Error fetching moves for card: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Static method to fetch a user's owned cards.
	 * @param {string} userId - The ID of the user.
	 * @param {string} guildId - The ID of the guild.
	 * @returns {Promise<Array<Card>>}
	 */
	static async getUserCards(userId, guildId) {
		try {
			// Fetch owned cards for the user
			const ownedCards = await ownedCardsQuery.readMany({
				player_id: userId,
				guild_id: guildId,
			});

			if (!ownedCards.length) return [];
			// Fetch move sets for each card
			const cards = await Promise.all(
				ownedCards.map(async (oc) => {
					return new Card({
						...oc,
					});
				})
			);

			// Filter out any null values due to missing anime cards
			return cards.filter((card) => card !== null);
		} catch (error) {
			console.error(`Error fetching user cards: ${error.message}`);
			throw error;
		}
	}
	async grabPhotos() {
		const photos = await photoQuery.findOne({ card_id: this.card_id });
		const photoUrls = photos.map((photo) => photo.pictureData);

		return photoUrls;
	}
	/**
	 * Returns a formatted object of the card's details.
	 * @returns {object} - Formatted card details.
	 */
	getDetails() {
		cardDetails = {
			_id: data._id,
			name: this.Name,
			category: this.category,
			power: this.power,
			categories: [this.category],
			rank: this.rank,
			moves: this.move_sets,
			version: this.version,
			owner: this.player_id,
			default: data.inGroup,
		};

		return cardDetails;
	}

	/**
	 * Returns an EmbedBuilder object representing the card.
	 * @returns {EmbedBuilder} - The embed with card details.
	 */
	toEmbed() {
		return new EmbedBuilder()
			.setTitle(this.Name)
			.setDescription(this.getDetails())
			.addFields(
				{ name: "Category", value: this.category, inline: true },
				{ name: "Damage", value: `${this.power}`, inline: true },
				{
					name: "Special Category",
					value: this.Specialcategory,
					inline: true,
				},
				{ name: "Power", value: `${this.Power}`, inline: true },
				{ name: "Rarity", value: this.getRarity(), inline: true },
				{
					name: "Move Set",
					value: this.MoveSet.map((move) => move.moveName).join(", "),
					inline: false,
				}
			)
			.setColor("#FF0000"); // Example color
	}

	/**
	 * Returns the rarity designation based on the card's rank.
	 * @returns {string} - The rarity designation.
	 */
	async getRarity() {
		if (this.rank <= 2) {
			return "B";
		} else if (this.rank <= 3) {
			return "A";
		} else if (this.rank <= 4) {
			return "S";
		} else if (this.rank <= 5) {
			return "S+";
		} else {
			return "C";
		}
	}

	async cloneCard() {
		const clone = new card(this);
		clone._cloneCard = true;
		return clone;
	}

	async pvpMode() {
		const pvp = this.cloneCard();
		pvp.health = this.power;
		return this.cloneCard;
	}
	
	// Additional methods related to Card can be added here.
}

module.exports = {
	Card,
};
