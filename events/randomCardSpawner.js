const {Events} = require("discord.js");
const sqlite3 = require("sqlite3");
const animedb = new sqlite3.Database("databases/animeDataBase.db");
// const serverAnimedb = new sqlite3.Database("databases/")

module.exports = {
    name: Events.randomServerSpawner,

    async execute(guild) {
        const serverAnimedb = new sqlite3.Database(`databases/${guild.id}cards`) //correct


        const query = "SELECT ? FROM TABLE " //correct


    }

};