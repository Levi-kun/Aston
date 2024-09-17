const {
    SlashCommandBuilder,
    GuildOnboardingPromptOption,
} = require("discord.js");

module.exports = {
    category: "cards",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("inspect")
        .setDescription("inspects a card!")
        .addStringOption((option) =>
            option.setName("name").setDescription("What's the card name?")
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("What user do you want to use?")
        ),
    async execute(interaction) {
        const cardName = interaction.option.getString("name");

        let query = `SELECT * FROM `;
        /* 
        create a table called owned_Cards_(guild id)
        SCHEMA:
        vr NOT NULL
        timestamp created NOT NULL
        id NOT NULL PRIMARY_KEY
        rank NOT NULL
        card_id NOT NULL
        player_id NOT NULL
        realPower
        move_ids
        inGroup
        */
    },
};
