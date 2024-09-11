const { ActionRowBuilder } = require("@discordjs/builders");

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    ChannelType,
} = require("discord.js");

module.exports = {
    cooldown: 2.5,
    category: "fun",
    data: new SlashCommandBuilder()
        .setName("van")
        .setDescription("Make them go bye bye!")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user you want to hug")
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName("location")
                .setDescription("Smuggling them where, boss?")
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("if you do not mind telling me boss")
                .addChoices(
                    { name: "Ethan", value: "ah the go to boss. gotcha." },
                    {
                        name: "mind yo damn buisness",
                        value: `won't do that ever again boss`,
                    }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const optionTarget = interaction.options.getMember("target").id;
        const Target = interaction.guild.members.cache.get(optionTarget);
        const reason =
            interaction.options.getString("reason") ??
            "You were an op, reason enough.";
        const vanvoicechannel = interaction.options.getChannel("location");

        const targetVoiceState = Target.voice.channel;
        if (!targetVoiceState) {
            return interaction.reply({
                content: `Boss, we can't find him!`,
                ephemeral: true,
            });
        }

        if (targetVoiceState.id === vanvoicechannel.id) {
            return interaction.reply({
                content: `Boss, he's already there.`,
                ephemeral: true,
            });
        }
        const confirm = new ButtonBuilder()
            .setCustomId("Proceed")
            .setLabel("Take them out")
            .setStyle(ButtonStyle.Danger);

        const nevermind = new ButtonBuilder()
            .setCustomId("Failure")
            .setLabel("Nevermind")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(confirm, nevermind);

        const response = await interaction.reply({
            content: `Waiting on your signal Boss`,
            components: [row],
            ephemeral: true,
        });
        const collectorFilter = (i) => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({
                filter: collectorFilter,
                time: 60_000,
            });

            if (confirmation.customId === "Proceed") {
                const updatedVoiceState = Target.voice.channel;
                if (!updatedVoiceState) {
                    return confirmation.update({
                        content: `Boss, we can't find him!`,
                        components: [],
                    });
                }

                coolPictureAttachment = new AttachmentBuilder(
                    "https://i2.wp.com/metro.co.uk/wp-content/uploads/2018/12/amazon-776e.gif?quality=90&strip=all&zoom=1&resize=440%2C247&ssl=1"
                );

                interaction.followUp({
                    content: `**WE GOT ${Target}, BOSS --> ${vanvoicechannel}!**`,
                    files: [coolPictureAttachment],
                });

                await Target.voice.setChannel(vanvoicechannel);
                await confirmation.update({
                    content: `Yes Boss`,
                    components: [],
                });
            }
            if (confirmation.customId === "Failure") {
                await confirmation.update({
                    content: "Yes Boss",
                    components: [],
                });
            }
        } catch (e) {
            await interaction.followUp({
                content: "THE BOSS WENT MIA! FOLLOWING PLAN C!",
                ephemeral: true,
            });
        }
    },
};
