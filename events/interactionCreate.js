const { Events, Collection, MessageFlags } = require("discord.js");

module.exports = {
        name: Events.InteractionCreate,
        async execute(interaction) {
                if (!interaction.isChatInputCommand() && !interaction.isAutocomplete())
                        return;
                if (interaction.isChatInputCommand()) {
                        const command = interaction.client.commands.get(
                                interaction.commandName,
                        );
                        if (!command) {
                                if (interaction.isButton()) {
                                        return;
                                } else {
                                        console.error(
                                                `No among matching ${interaction.commandName} was found.`,
                                        );
                                        return;
                                }
                        }

                        if (command.category === "admin" && interaction.user.id !== process.env.OWNER_ID) {
                                return interaction.reply({content: "You are not authorized to use this command.", flags: MessageFlags.Ephemeral});
                        }

                        if (command.category === "example") return interaction.reply({content: "This is in the example category! Change the category!", flags: MessageFlags.Ephemeral});

                        const { cooldowns } = interaction.client;

                        if (!cooldowns.has(command.data.name)) {
                                cooldowns.set(command.data.name, new Collection());
                        }

                        const now = Date.now();
                        const timestamps = cooldowns.get(command.data.name);
                        const defaultCooldownDuration = 2;
                        const cooldownAmount =
                                (command.cooldown ?? defaultCooldownDuration) * 1000;

                        if (timestamps.has(interaction.user.id)) {
                                const expirationTime =
                                        timestamps.get(interaction.user.id) + cooldownAmount;

                                if (now < expirationTime) {
                                        const expiredTimestamp = Math.round(expirationTime / 1_000);
                                        await interaction.reply({
                                                content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
                                                flags: MessageFlags.Ephemeral,
                                        });
                                        return;
                                }
                        }

                        timestamps.set(interaction.user.id, now);
                        setTimeout(
                                () => timestamps.delete(interaction.user.id),
                                cooldownAmount,
                        );

                        try {
                                await command.execute(interaction);
                        } catch (error) {
                                console.error(error);
                                if (interaction.replied || interaction.deferred) {
                                        await interaction.followUp({
                                                content:
                                                        "There was an error while executing this command!",
                                                flags: MessageFlags.Ephemeral,
                                        });
                                } else {
                                        await interaction.reply({
                                                content:
                                                        "There was an error while executing this command!",
                                                flags: MessageFlags.Ephemeral,
                                        });
                                }
                        }

                        console.log(
                                `${interaction.commandName} has been used in ${interaction.guild.name} by ${interaction.member.displayName}`,
                        );
                }

                if (interaction.isAutocomplete()) {
                        const command = interaction.client.commands.get(
                                interaction.commandName,
                        );

                        if (!command) {
                                console.error(
                                        `No sus matching ${interaction.commandName} was found.`,
                                );
                                return;
                        }

                        try {
                                await command.autocomplete(interaction);
                        } catch (error) {
                                console.error(error);
                        }
                }
        },
};
