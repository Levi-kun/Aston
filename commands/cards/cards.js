// Import necessary modules and classes
const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
	ComponentType,
} = require("discord.js");
const Card = require("../../classes/cards/cards.js");
const sql = require("../../databases/index.js")


async function createCardObjects (id, userId) {
	const cardIds = await sql`
  SELECT c.id
  FROM cards AS c
  JOIN claiming AS cl
    ON cl.card_id = c.id
   AND cl.user_id = ${userId}
  WHERE c.card_id = ${id}
  ORDER BY c.id;
`;
	const cards = await Promise.all(cardIds.map(row => Card.spawn(row.id, userId)));

	return cards;

	}


/**
 * 
 * 	This is the command for inspecting a card, this shows a card.
 * 	usage: /inspect <id>
 * 	
 */
module.exports = {
	category: "cards",
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName("cards")
		.setDescription("I got the data right here boss, just state the id.")
		.addStringOption((option) =>
			option.setName("name").setDescription("What's the card name?").setRequired(false).setAutocomplete(true)
		),
	async autocomplete(interaction) {
	const focused = interaction.options.getFocused().toLowerCase();

	const rows = await sql`
		SELECT DISTINCT m.id, m.name
		FROM cards AS c
		JOIN claiming AS cl
		  ON cl.card_id = c.id
		 AND cl.user_id = ${interaction.user.id}
		JOIN master_cards AS m
		  ON m.id = c.card_id
		WHERE LOWER(m.name) LIKE ${"%" + focused + "%"}
		ORDER BY m.name
		LIMIT 25;
	`;

	await interaction.respond(
		rows.map(r => ({ name: r.name, value: String(r.id) }))
	)
},
	async execute(interaction) {
		const name = interaction.options.getUser("name");
		let masterCardId;

		// quickly grab the id

		if(/^\d+$/.test(raw)) {
			masterCardId = Number(raw);
		} else {
			const [row] = await sql`
			SELECT id FROM master_cards
			WHERE LOWER(name) = ${raw.toLowerCase()};`;
			if (!row) {
				return await interaction.reply({ content: `No card found with the name "${raw}".`, ephemeral: true });
			}
			masterCardId = row.id;
		}

	

		const userId = interaction.user.id;

		const cards = await createCardObjects(masterCardId, userId);

		const photos = [];

		await interaction.reply({})
		
	},
	
};


