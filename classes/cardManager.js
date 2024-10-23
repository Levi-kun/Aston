const { Query } = require("../databases/query.js"); // Adjust the path accordingly

// Queries for accessing MongoDB collections
const animeCardListQuery = new Query("animeCardList");
const ownedCardsQuery = new Query("ownedCards");
const moveQuery = new Query("animeCardMoves");
const ownedMovesQuery = new Query("ownedMoves");

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
		return moveQuery.aggregate(i, data)
	}	
	async convertToOwnedCard(
		guildId,
		inGroup = false
	) {
		const ownedCard = new OwnedCard()
		.addGuildId(guildId)
		.addRealPower(this.powerSpawner(this.rank, this.power))
		.addMoveIds(this.grabCardMoves)
		.addinGroup(inGroup)
		.addCardId(this._id)

		return ownedCard;
	}


async grabCardMoves() {
	const query = new Query("animeCardMoves");

	// Helper function to get a move from the 'Basic' category
	async function basicMove() {
			basicData = {
				parent: { id: "Basic", isCard}
			}
			return getRandomMove(basicData)
		
	}
	try {
		// 1. Get the move directly tied to the card (parent.id === card.name)
		let tiedMove = await getRandomMove({ parent: {id: this._id}}); // Use card name instead of ObjectId

		// If no tied move is found, use the default move
		if (!tiedMove) {
			console.warn(
				`No tied move found for card: ${this.name}, using default 'Basic' move.`
			);
			tiedMove = await basicMove();
		}

		// 2. Shuffle the card's categories to ensure randomness
		let categories = [...this.categories]; // Clone the categories array
		categories = categories.sort(() => 0.5 - Math.random()); // Randomize the array
		const selectedMoves = new Set();
		selectedMoves.add(tiedMove.parent.id); // Ensure the tied move is in the set

		// 3. Get moves tied to the first randomly selected category
		let firstCategoryMoves;
		try {
			firstCategoryMoves = await this.getRandomMove({
				parent: { id: categories[0] },
			},3); // Use category name instead of ObjectId
		} catch (err) {
			console.warn(
				`No moves found for category: ${categories[0]}, using default 'Basic' move.`
			);
			firstCategoryMoves = [await basicMove()];
		}

		// Filter out any moves that are already selected to prevent duplicates
		const uniqueFirstCategoryMoves = firstCategoryMoves.filter(
			(move) => !selectedMoves.has(move.parent.id)
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
			secondCategoryMoves = await this.getRandomMove({
				parent: {id: secondCategory},
			},3); // Use category name instead of ObjectId
		} catch (err) {
			console.warn(
				`No moves found for category: ${secondCategory}, using default 'Basic' move.`
			);
			secondCategoryMoves = [await basicMove()];
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
		for(let i =0; i <moves.length; i++) { 
			console.log(`Move ${i+1}: ${moves[i].name}`);
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

	// Additional methods related to card data can be added here if needed.
} 

/**
 * OwnedCard class extends Card for the ownedCards collection.
 * This class allows modifications to the ownedCards MongoDB collection.
 */
class OwnedCard extends Card {
	constructor(data) {

		this.realPower = data.realPower;
		this.rank = data.rank;
		this.guild_id = data.guild_id;
		this.owner = data.player_id;
		this.createdAt = data.created_At;
		this.card_id = data.card_id;
		this.inGroup = data.inGroup;
		this._cloneCard = false;
		this.move_ids = data.move_ids || [];
		this._move_sets = {};

	    // Initialize move sets for the cardp
9
		return new Proxy(this, {
			set: async (target, prop, value) => {
				target[prop] = value;
				console.log(`Setting ${prop} to ${value}`);
				if (prop.startsWith("_")) return;

				// Only update the database if not a clone
				if(this.owner) {
				if (!this._cloneCard) {
					try {
						await ownedCardsQuery.updateOne(
							{ _id: target._id }, // Find card by its ID
							{ $set: { [prop]: value } } // Update the changed property
						);
						console.log(`Updated ${this.name} to the database`);
					} catch (error) {
						console.error("Error updating card:", error);
					}
				}
				
			}
				return true;
			},
		});
	}

	/**
	 * Builder Methods for the OwnedCard class can be added here.
	 */

	addRealPower(power){
		this.realPower += power;
	}

	addRank(rank){
		this.rank = rank;
	}

	addGuildId(guildId){ 
		this.guild_id = guildId;
	}

	addOwner(owner){
		this.owner = owner;
	}
	addCreatedAt(createdAt){
        this.createdAt = createdAt;
    }

	addCardId(cardId){
        this.card_id = cardId;
    }
	addinGroup(inGroup){
        this.inGroup = inGroup;
    }

	becomeCloneCard() {
		this._cloneCard = true;
	}

	addMoveIds(moveIds){ 
		this.move_ids = [...this.move_ids,...moveIds];
        this._move_sets = {};
	}
	//

	/**
	 * Static method to create a new owned card and insert it into the database.
	 * @param {Object} args - Data for the new card.
	 * @returns {Promise<OwnedCard>} - Returns the created OwnedCard object.
	 */
	static async createNewCard(args) {
		const newCardData = await ownedCardsQuery.insertOne(args);
		return new OwnedCard(newCardData)
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
		return new OwnedCard(data)
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

	/**
	 * Fetch move sets for the owned card and update the move_sets property.
	 */
	async getMoveSets() {
		if (this.move_ids.length) {
			for (let i = 0; i < this.move_ids.length; i++) {
				let moveData = await ownedMovesQuery.findOne({
					_id: this.move_ids[i], card_id: this.card_id,
				});
				this.move_sets[this.move_ids[i]] = moveData;
			}
		}
		return this.move_sets;
	}

	// Additional methods related to owned card operations can be added here.
}

module.exports = {
	Card,
	OwnedCard,
};
