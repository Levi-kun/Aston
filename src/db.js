
const sqlite3 = require("sqlite3");
const util = require("util");

const animedb = new sqlite3.Database("databases/animeDataBase.db");
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));
const dbRunAsync = util.promisify(animedb.run.bind(animedb));

module.exports = {
    dbAllAsync,
    dbGetAsync,
    dbRunAsync,
};
