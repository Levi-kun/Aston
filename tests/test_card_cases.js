require("dotenv").config();

const Card = require("../classes/cards/cards.js");
const sql = require("../databases/index.js");

async function main() {
	const [cardId, userId] = process.argv.slice(2);
	if (!cardId || !userId) {
		throw new Error("Usage: node test_card_cases.js <owned-card-id> <user-id>");
	}

	const card = await Card.spawn(cardId, userId);
	const result = await card.render_card(userId);
	console.log(`Rendered card ${card.id}: ${result.location}`);
}

main()
	.catch(error => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => sql.end());
