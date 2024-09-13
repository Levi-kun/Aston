///
const axios = require("axios");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const positionMapping = {
    G: "Guard",
    F: "Forward",
    C: "Center",
};

// Your NBA API key (replace with your actual key)
const { balldontlie, year } = require("../../apiKeys.json").nba;

module.exports = {
    cooldown: 45,
    category: "sports",
    data: new SlashCommandBuilder()
        .setName("nba")
        .setDescription("Get latest NBA player or team stats")
        .addStringOption((option) =>
            option
                .setName("search_type")
                .setDescription("Choose 'player' or 'team'")
                .setRequired(true)
                .addChoices(
                    { name: "Player", value: "player" },
                    { name: "Team", value: "team" }
                )
        )
        .addStringOption((option) =>
            option
                .setName("search_term")
                .setDescription("NBA player or team name")
                .setRequired(true)
        ),
    async execute(interaction) {
        const searchType = interaction.options.getString("search_type");
        const searchTerm = interaction.options.getString("search_term");

        try {
            if (searchType === "player") {
                // Search for player by name
                const playerResponse = await axios.get(
                    `https://api.balldontlie.io/v1/players?search=${searchTerm}`,
                    { headers: { Authorization: balldontlie } }
                );

                if (playerResponse.data.data.length > 0) {
                    // Player found
                    const player = playerResponse.data.data[0];
                    const playerId = player.id;
                    const firstName = player.first_name;
                    const lastName = player.last_name;
                    const position = player.position;
                    const height = player.height;
                    const weight = player.weight;
                    const jerseyNumber = player.jersey_number;
                    const college = player.college;
                    const country = player.country;
                    const draftYear = player.draft_year;
                    const draftRound = player.draft_round;
                    const draftNumber = player.draft_number;
                    const teamFullName = player.team.full_name;
                    const teamAbbreviation = player.team.abbreviation;
                    const fullPosition = positionMapping[position];

                    const numbers = height
                        .split("-")
                        .map((num) => `${num.trim()}`);
                    const playerIdEmbed = new EmbedBuilder()
                        .setColor("#FF3377")
                        .setTitle(`${firstName} ${lastName}`)
                        .setThumbnail(
                            "https://cdn.freebiesupply.com/images/large/2x/nba-logo-transparent.png"
                        )
                        .setURL(`https://www.nba.com/player/${playerId}`)
                        .setAuthor({ name: `${jerseyNumber}` });
                    if (draftYear) {
                        playerIdEmbed.setDescription(
                            `Draft Year ${draftYear}, Draft Round ${draftRound}, Draft Number ${draftNumber}`
                        );
                    }

                    playerIdEmbed.addFields(
                        {
                            name: "Position",
                            value: fullPosition || position,
                            inline: false,
                        },
                        {
                            name: "Height",
                            value: `${numbers[0]}' ${numbers[1]}"`,
                            inline: true,
                        },
                        { name: "Weight", value: weight, inline: true },
                        { name: "College", value: college, inline: false },
                        { name: "Country", value: country, inline: false },
                        { name: "Team", value: teamFullName, inline: true },
                        {
                            name: "Abbreviation",
                            value: teamAbbreviation,
                            inline: true,
                        }
                    );

                    await interaction.reply({ embeds: [playerIdEmbed] });
                    // Fetch latest game stats for the player
                    const statsResponse = await axios.get(
                        `https://api.balldontlie.io/v1/stats?&player_ids[]=${playerId}`,
                        { headers: { Authorization: balldontlie } }
                    );
                    if (statsResponse.data.data.length > 0) {
                        const latestStats = statsResponse.data.data[0];
                        const points = latestStats.pts;
                        const rebounds = latestStats.reb;
                        const assists = latestStats.ast;

                        // Create a Discord embed with player stats
                        const embed = new EmbedBuilder()
                            .setTitle(
                                `${player.first_name} ${player.last_name} Newest Game`
                            )
                            .addFields(
                                { name: "Points", value: `${points}` },
                                { name: "Rebounds", value: `${rebounds}` },
                                { name: "Assists", value: `${assists}` }
                            );

                        await interaction.followUp({ embeds: [embed] });
                    } else {
                        await interaction.followUp(
                            "No stats found for this player."
                        );
                    }
                } else {
                    await interaction.reply({
                        content: "No matching player found.",
                    });
                }
            } else if (searchType === "team") {
                // Search for team by name
                const teamResponse = await axios.get(
                    `https://api.balldontlie.io/v1/teams?search=${searchTerm}`,
                    { headers: { Authorization: balldontlie } }
                );
                if (teamResponse.data.data.length > 0) {
                    // Team found

                    const team = teamResponse.data.data[0];
                    const teamId = team.id;
                    const teamFullName = team.full_name;
                    const teamAbbreviation = team.abbreviation;
                    const teamCity = team.city;
                    const teamConference = team.conference;
                    const teamDivision = team.division;

                    const teamEmbed = new EmbedBuilder()
                        .setColor("#0078D4")
                        .setTitle(teamFullName)
                        .setThumbnail(
                            "https://cdn.freebiesupply.com/images/large/2x/nba-logo-transparent.png"
                        )
                        .setURL(`https://www.nba.com/team/${teamId}`)
                        .setDescription(`City: ${teamCity}`)
                        .addFields(
                            {
                                name: "Abbreviation",
                                value: `${teamAbbreviation}`,
                                inline: true,
                            },
                            {
                                name: "Conference",
                                value: `${teamConference}`,
                                inline: true,
                            },
                            {
                                name: "Division",
                                value: `${teamDivision}`,
                                inline: true,
                            }
                        );
                    await interaction.reply({ embeds: [teamEmbed] });
                    // Fetch team stats
                    const teamStatsResponse = await axios.get(
                        `https://api.balldontlie.io/v1/stats?cursor=0&team_ids[]=${teamId}`,
                        { headers: { Authorization: balldontlie } }
                    );
                    if (teamStatsResponse.data.data.length > 0) {
                        const teamStats = teamStatsResponse.data.data[0];
                        const teamPoints = teamStats.pts;
                        const teamRebounds = teamStats.reb;
                        const teamAssists = teamStats.ast;

                        // Create a Discord embed with team stats
                        const embed = new EmbedBuilder()
                            .setTitle(`${team.full_name} Stats`)
                            .addFields(
                                {
                                    name: "Points",
                                    value: `${teamPoints}`,
                                    inline: true,
                                },
                                {
                                    name: "Rebounds",
                                    value: `${teamRebounds}`,
                                    inline: true,
                                },
                                {
                                    name: "Assists",
                                    value: `${teamAssists}`,
                                    inline: true,
                                }
                            )
                            .setColor("#007ACC");

                        // Reply to the user with the embed
                        await interaction.followUp({
                            embeds: [embed],
                        });
                    } else {
                        await interaction.followUp(
                            "No stats found for this team."
                        );
                    }
                } else {
                    await interaction.followUp("No matching team found.");
                }
            }
        } catch (error) {
            console.error("Error fetching NBA data:", error);
            await interaction.reply(
                "An error occurred while fetching NBA data."
            );
        }
    },
};
