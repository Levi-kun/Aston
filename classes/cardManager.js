const { Query } = require("../databases/query.js"); // Adjust the path accordingly

// Queries for accessing MongoDB collections
const animeCardListQuery = new Query("animeCardList");
const ownedCardsQuery = new Query("ownedCards");
const moveQuery = new Query("animeCardMoves");
const ownedMovesQuery = new Query("ownedMoves");

const pictureQuery = new Query("animeCardPhotos");

const { ObjectId } = require("mongodb");
// Define move types as constants
const moveTypes = Object.freeze({
	DMG: "DMG",
	SPECIAL: "SPECIAL",
	BUFF: "BUFF",
	DEBUFF: "DEBUFF",
	PASSIVE: "PASSIVE",
	FOCUS: "FOCUS",
});

/**
 * Card class represents a basic card from the animeCardList collection.
 * This class should not alter the animeCardList MongoDB collection.
 */
class Card {
	constructor(row) {
		this._id = row._id;
		this.name = row.name;
		this.categories = row.categories;
		this.power = row.power;
		this.rarity = row.rarity;
		this.version = row.version;
	}

	/**
	 * Static method to fetch a card from the animeCardList by its name or other parameters.
	 * @param {Object} filter - Filter for MongoDB query.
	 * @returns {Promise<Card>} - Returns a Card object.
	 */

	static async getCardByParam(filter) {
		const data = await animeCardListQuery.findOne(filter);
		if (!data.lv) {
			throw new Error("Card not found in animeCardList");
		}
		return new Card(data);
	}
	async getRandomMove(data, i = 1) {
		return moveQuery.aggregate(i, data);
	}
	async convertToOwnedCard(guildId, inGroup = false) {
		const ownedCard = new OwnedCard()
			.addGuildId(guildId)
			.addRealPower(this.powerSpawner(this.rank, this.power))
			.addinGroup(inGroup)
			.addName(this.name)
			.addVersion(this.version)
			.addRank(this.rarity)
			.addCardId(this._id);

		const moveInfo = await this.grabCardMoves(ownedCard._id);
		ownedCard
			.addMoveIds(moveInfo.map((move) => move._id))
			.addMoveSets(moveInfo);

		return ownedCard;
	}

	async grabPhotosForCard() {
		const photo = pictureQuery.findOne({ card_id: this._id });

		this._photoUrl = photo.attachment;

		return this._photoUrl;
	}

	// Helper function to get a move from the 'Basic' category
	async basicMove() {
		const basicData = {
			parent: { id: "basic", isCard: false },
		};
		return await this.getRandomMove(basicData, 3);
	}

	async grabCardMoves(card_id) {
		try {
			// 1. Get the move directly tied to the card (parent.id === card.name)
			let tiedMove = await this.getRandomMove({
				parent: { id: this.name.toLowerCase() },
			}); // Use card name instead of ObjectId
			// If no tied move is found, use the default moves
			if (tiedMove.length === 0) {
				tiedMove = await this.basicMove();
			}

			// 2. Shuffle the card's categories to ensure randomness
			let categories = [...this.categories]; // Clone the categories array
			categories = categories.sort(() => 0.5 - Math.random()); // Randomize the array
			const selectedMoves = new Set();
			tiedMove = tiedMove[0].lv;
			selectedMoves.add(tiedMove._id); // Ensure the tied move is in the set

			// 3. Get moves tied to the first randomly selected category
			let firstCategoryMoves;
			try {
				firstCategoryMoves = await this.getRandomMove(
					{
						parent: { id: categories[0].toLowerCase() },
					},
					3
				);
				// Use category name instead of ObjectId
				if (firstCategoryMove.length === 0) {
					firstCategoryMoves = await this.basicMove();
				}
			} catch (err) {
				firstCategoryMoves = await this.basicMove();
			}

			// Filter out any moves that are already selected to prevent duplicates
			const uniqueFirstCategoryMoves = firstCategoryMoves.filter(
				(move) => !selectedMoves.has(move.lv._id)
			);
			// Randomly select one unique move from the first category
			const firstCategoryMove =
				uniqueFirstCategoryMoves[
					Math.floor(Math.random() * uniqueFirstCategoryMoves.length)
				];

			selectedMoves.add(firstCategoryMove.lv._id); // Add it to the set of selected moves
			// 4. Reset categories and get moves tied to a different randomly selected category
			let secondCategory =
				categories.length > 1 ? categories[1] : categories[0]; // Choose a second category
			secondCategory = secondCategory.toLowerCase(); // Convert to lowercase for MongoDB query
			let secondCategoryMoves;
			try {
				secondCategoryMoves = await this.getRandomMove(
					{
						parent: { id: secondCategory },
					},
					3
				); // Use category name instead of ObjectId

				if (secondCategoryMoves.length === 0) {
					secondCategoryMoves = await this.basicMove();
				}
			} catch (err) {
				console.warn(
					`No moves found for category: ${secondCategory}, using default 'Basic' move.`
				);
				secondCategoryMoves = await this.basicMove();
			}

			// Filter out any moves that are already selected to prevent duplicates
			const uniqueSecondCategoryMoves = secondCategoryMoves.filter(
				(move) => !selectedMoves.has(move.lv._id)
			);

			// Randomly select one unique move from the second category
			const secondCategoryMove =
				uniqueSecondCategoryMoves[
					Math.floor(Math.random() * uniqueSecondCategoryMoves.length)
				];
			selectedMoves.add(secondCategoryMove.lv._id);
			// 5. Return the final array of 3 unique moves (one tied to the card, two tied to random categories or 'Basic')
			const moves = [
				tiedMove,
				firstCategoryMove.lv,
				secondCategoryMove.lv,
			];
			for (let i = 0; i < moves.length; i++) {
				moves[i].card_id = card_id;
				moves[i]._id = new ObjectId();
				moves[i].level = 1;
				delete moves[i].parent;
			}
			return moves;
		} catch (err) {
			console.error(`Error in grabCardMoves: ${err.message}`);
			throw err;
		}
	}
	chooseRanks() {
		const rarity = this.rarity;
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
	getRandomMultiplier(min, max) {
		return min + Math.random() * (max - min);
	}

	powerSpawner(value, power) {
		if (value >= 4) {
			power = Math.floor(power * this.getRandomMultiplier(0.9, 1.111));
		} else {
			power = Math.floor(
				power *
					this.getRandomMultiplier(
						this.getRandomMultiplier(0.5, 0.899),
						this.getRandomMultiplier(
							1,
							this.getRandomMultiplier(1.1, 1.4599)
						)
					)
			);
		}

		power = Math.max(1000, power);
		power = Math.round(power / 50) * 50;

		return power;
	}

	// Additional methods related to card data can be added here if needed.
}

/**
 * OwnedCard class extends Card for the ownedCards collection.
 * This class allows modifications to the ownedCards MongoDB collection.
 */
class OwnedCard {
	constructor() {
		this._id = new ObjectId();
		this.realPower = 0;
		this.rank;
		this.guild_id;
		this.createdAt;
		this.card_id;
		this.inGroup;
		this._cloneCard;
		this.newCard = false;
		this.move_ids = [];
		this._move_sets = [];

		// Initialize move sets for the cardp
		9;
		return new Proxy(this, {
			set: async (target, prop, value) => {
				target[prop] = value;
				if (prop.startsWith("_" && !prop === "_id")) return;

				if (prop === "owner") {
					this.newCard = this.createOwnedCardDocument();
				}

				if (!this._cloneCard && !this.newCard && this.owner) {
					try {
						await ownedCardsQuery.updateOne(
							{ _id: this._id }, // Find card by its ID
							{ $set: { prop: value } } // Update the changed property
						);
					} catch (error) {
						console.error("Error updating card:", error);
					}
				}

				return true;
			},
		});
	}

	/**
	 * Builder Methods for the OwnedCard class can be added here.
	 */
	addVersion(version) {
		this.version = version;
		return this;
	}
	addRealPower(power) {
		this.realPower += power;
		return this;
	}
	addName(name) {
		this.name = name;
		return this;
	}
	addRank(rank) {
		this.rank = rank;
		return this;
	}

	addGuildId(guildId) {
		this.guild_id = guildId;
		return this;
	}

	addOwner(owner) {
		this.owner = owner;
		return this;
	}
	addCreatedAt(createdAt) {
		this.createdAt = createdAt;
		return this;
	}

	addCardId(cardId) {
		this.card_id = cardId;
		return this;
	}
	addinGroup(inGroup) {
		this.inGroup = inGroup;
		return this;
	}

	becomeCloneCard() {
		this._cloneCard = true;
	}

	addMoveIds(moveIds) {
		this.move_ids = [...this.move_ids, ...moveIds];
		return this;
	}
	addMoveSets(moveSets) {
		this._move_sets = [...this._move_sets, ...moveSets];
		return this;
	}

	addRank(rank) {
		this.rank = rank;
		return this;
	}

	isNewCard() {
		this.newCard = true;
		return this;
	}
	//

	/**
	 * Static method to create a new owned card and insert it into the database.
	 * @param {Object} args - Data for the new card.
	 * @returns {Promise<OwnedCard>} - Returns the created OwnedCard object.
	 */
	static async createNewCard(args) {
		const newCardData = await ownedCardsQuery.insertOne(args);
		return new OwnedCard(newCardData);
	}

	/**
	 * Static method to fetch a specific owned card by filter.
	 * @param {Object} filter - Filter for MongoDB query.
	 * @returns {Promise<OwnedCard>} - Returns an OwnedCard object.
	 */
	static async getCardByParam(filter) {
		const data = await ownedCardsQuery.findOne(filter);
		if (!data) {
			throw new Error("Owned card not found");
		}
		return new OwnedCard(data);
	}

	/**
	 * Static method to fetch multiple owned cards by their parent card IDs.
	 * @param {Array<string>} cardIds - Array of card IDs.
	 * @returns {Promise<Array<OwnedCard>>}
	 */
	static async getCardsByIds(cardIds) {
		if (!cardIds.length) return [];

		try {
			const ownedCards = await ownedCardsQuery.findMany({
				card_id: { $in: cardIds },
			});

			if (!ownedCards.length) return [];

			const cards = ownedCards.map((oc) => new OwnedCard(oc)._proxy());

			return cards;
		} catch (error) {
			console.error(
				`Error fetching owned cards by IDs: ${error.message}`
			);
			throw error;
		}
	}
	async createOwnedCardDocument() {
		await this._move_sets.map((move) => ownedMovesQuery.insertOne(move));
		// Build the document object
		const ownedCardDocument = {
			_id: this._id,
			name: this.name,
			guild_id: `${this.guild_id}`,
			vr: parseInt(this.vr || 0, 10), // Default value for vr
			created_At: this.created_At || new Date(),
			updated_At: this.updated_At || new Date(),
			rank: this.getRarity(),
			card_id: this.card_id,
			player_id: this.owner,
			realPower: this.realPower,
			move_ids: this.move_ids, // Default to empty array if not provided
			inGroup: this.inGroup || false,
		};

		const a = await ownedCardsQuery.insertOne(ownedCardDocument);
		console.log(a);
		return true;
	}

	async grabPhotosForCard() {
		const photo = pictureQuery.findOne({card_id: this.card_id})

		this._photoUrl = photo.attachment;

		return this._photoUrl
	}
	// Example usage

	/**
	 * Fetch move sets for the owned card and update the move_sets property.
	 */
	async getMoveSets() {
		if (this.move_ids.length) {
			for (let i = 0; i < this.move_ids.length; i++) {
				let moveData = await ownedMovesQuery.findOne({
					_id: this.move_ids[i],
					card_id: this.card_id,
				});
				this.move_sets[this.move_ids[i]] = moveData;
			}
		}
		return this.move_sets;
	}
	getRarity() {
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
	// Additional methods related to owned card operations can be added here.
}

module.exports = {
	Card,
	OwnedCard,
};
