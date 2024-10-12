// Assuming you have already set up your Discord.js bot and have a collection of commands
const {
    MessageActionRow,
    ButtonBuilder,
    SlashCommandBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType,
} = require("discord.js");

module.exports = {
    category: "utility",
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "If you need a reminder, boss, I can tell you what we do."
        )
        .addStringOption((option) =>
            option.setName("category").setDescription("Which division boss?")
        )
        .addIntegerOption((option) =>
            option.setName("page").setDescription("What page boss?")
        ),
    async execute(interaction) {
        commandsList = [];
        // Get all available commands
        const commands = interaction.client.commands;
        commands.forEach((element) =>
            commandsList.push([
                element.data.name,
                element.data.description,
                element.category || "unassigned",
                element.cooldown || 5,
            ])
        );
        // Optional: Get the category from user input (if provided)
        // Optional: Get the category from user input (if provided)
        const category = interaction.options.getString("category");

        // Filter commands based on category (if provided)
        const filteredCommands = category
            ? commandsList.filter((cmd) => cmd[2] === category)
            : commandsList;

        // Paginate commands (10 per page)
        const pageSize = 10;
        let page = interaction.options.getInteger("page") || 1;
        const startIndex = (page - 1) * pageSize;
        const pageCommands = filteredCommands.slice(
            startIndex,
            startIndex + pageSize
        );

        // Construct the help message
        let helpMessage = `**Commands (${category || "All"})**\n\n`;
        pageCommands.forEach((cmd) => {
            helpMessage += `• \`${cmd[0]}\`: ${cmd[1]}\n`;
        });

        // Create buttons for pagination
        const prevButton = new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Primary);
        const nextButton = new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Primary);

        // Create an action row with the buttons
        const row = new ActionRowBuilder().addComponents(
            prevButton,
            nextButton
        );

        const nextCollectorFilter = (i) =>
            i.user.id === interaction.user.id && i.customId === "next";

        const prevCollectorFilter = (i) =>
            i.user.id === interaction.user.id && i.customId === "prev";

        const helpResponse = await interaction.reply({
            content: helpMessage,
            components: [row],
            ephemeral: true,
        });

        const nextconfirmation =
            interaction.channel.createMessageComponentCollector({
                filter: nextCollectorFilter,
                time: 60_000,
            });
        const prevconfirmation =
            interaction.channel.createMessageComponentCollector({
                filter: prevCollectorFilter,
                time: 60_000,
            });
        nextconfirmation.on("collect", async (i) => {
            page += 1;
            await interaction.editReply({
                content: helpMessage,
                ephemeral: true,
            });
        });

        prevconfirmation.on("collect", async (i) => {
            page -= 1;

            await interaction.editReply({
                content: helpMessage,
                ephemeral: true,
            });
        });
    },
};
