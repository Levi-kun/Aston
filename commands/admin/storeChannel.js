const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { ownerId } = require("../../config.json");

const outputDir = path.join(__dirname, "../../output");

// Helper: sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
        category: "admin",
        data: new SlashCommandBuilder()
                .setName("channelread")
                .setDescription("Export all messages from a channel to JSON")
                .addStringOption((option) =>
                        option
                                .setName("channelid")
                                .setDescription("The channel ID to export")
                                .setRequired(true),
                ),
        async execute(interaction) {
                try {
                        if (interaction.user.id !== ownerId) {
                                return interaction.reply({
                                        content: "You are not authorized to use this command.",
                                        ephemeral: true,
                                });
                        }

                        const channelId = interaction.options.getString("channelid");
                        const channel = await interaction.client.channels.fetch(channelId);

                        if (!channel || !channel.isTextBased()) {
                                return interaction.reply(
                                        "Invalid channel ID or not a text channel.",
                                );
                        }

                        // Approximate total messages in channel
                        const totalCount = channel.messageCount ?? null; // Discord may not always expose this
                        let batchSize = 100;
                        if (totalCount) {
                                if (totalCount > 10000) batchSize = 25;
                                else if (totalCount > 1000) batchSize = 50;
                        }

                        await interaction.reply(
                                `Starting export... using batch size \`${batchSize}\``,
                        );

                        // Create a temp progress message
                        let progressMsg = await interaction.followUp(
                                "Fetching messages... ⏳",
                        );
                        let allMessages = [];
                        let lastId = null;

                        let batchCount = 0;
                        let lastUpdate = Date.now();

                        while (true) {
                                const options = { limit: batchSize };
                                if (lastId) options.before = lastId;

                                const messages = await channel.messages.fetch(options);
                                if (messages.size === 0) break;

                                messages.forEach((msg) => {
                                        allMessages.push({
                                                message: msg.content,
                                                user: msg.author.tag,
                                                timestamp: msg.createdAt.toISOString(),
                                        });
                                });

                                lastId = messages.last().id;
                                batchCount++;

                                // Update progress message every 10 seconds
                                if (Date.now() - lastUpdate >= 10000) {
                                        lastUpdate = Date.now();
                                        await progressMsg.edit(
                                                `Fetching messages... ⏳ Batch \`${batchCount}\`, Messages so far: \`${allMessages.length}\``,
                                        );
                                }

                                // Rate-limit sleep
                                await sleep(1000);
                        }

                        // Final update
                        await progressMsg.edit(
                                `✅ Finished! Fetched \`${allMessages.length}\` messages in \`${batchCount}\` batches.`,
                        );

                        // Save file
                        const guildName = channel.guild.name
                                .replace(/[^a-z0-9]/gi, "_")
                                .toLowerCase();
                        const timestamp = Date.now();
                        const fileName = `${guildName}_${channelId}_${timestamp}.json`;
                        const filePath = path.join(outputDir, fileName);

                        if (!fs.existsSync(outputDir)) {
                                fs.mkdirSync(outputDir, { recursive: true });
                        }

                        fs.writeFileSync(filePath, JSON.stringify(allMessages, null, 2));

                        await interaction.followUp(
                                `📁 Exported messages saved as \`${fileName}\``,
                        );
                } catch (e) {
                        console.error(e);
                        if (interaction.replied || interaction.deferred) {
                                await interaction.followUp(
                                        "❌ Failed to export messages. Check console for details.",
                                );
                        } else {
                                await interaction.reply(
                                        "❌ Failed to export messages. Check console for details.",
                                );
                        }
                }
        },
};
