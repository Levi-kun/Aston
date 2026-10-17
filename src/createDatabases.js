/**

    Create the automation of going through each database

*/

const path = require("path");
const fs = require("fs");
const sql = require("../databases");
const baseFolderPath = "../databases/"

const tableFiles = [
    // Layer 0: no foreign keys
    "masterCardsTable.js",
    "altVersionsTable.js",
    "userTable.js",
    "guildTable.js",
    "titlesTables.js",
    "photoTable.js",
    // Layer 1: reference layer 0 only
    "cardsTable.js",          // refs master_cards, alt_version
    "categoryToCardsTable.js",// refs master_cards
    "cardToPhotoTable.js",    // refs alt_version, photos
    "guildChannelTable.js",   // refs guilds
    "guildSettingsTable.js",  // refs guilds
    "guildToUserTable.js",    // refs guilds, users
    // Layer 2: reference layer 1
    "renderedCardsTable.js",  // refs cards
    "baseRenderedCards.js",   // refs cards
    "likesToCards.js",        // refs cards
    "historicalCardData.js",  // refs cards
    "cardToTitles.js",        // refs cards, titles
    "userToCardsTable.js",    // refs cards, users
    "enableCards.js",         // refs cards, users
];


/**
 *  Call function to create the tables inside ../databases/
 */
async function createAtStartTables() {
        const resolvedBasePath = path.join(__dirname, baseFolderPath)

        for (const file of tableFiles) {
            let tableScheme;

            try {
                tableScheme = require(path.join(resolvedBasePath, file))
            } catch (err) {
                console.error(`Error! Failed to load schema for '${file}: ${err.message}`)
                continue;
            }
            const content = Object.keys(tableScheme);

            if(content.length !== 1) throw Error(`'${file}' has an invalid object size!`)

            if(typeof tableScheme.content !== "string" || !tableScheme.content) throw Error(`Invalid export for ${file}! Expected only 1 export (the schema)`);
            
            try {
                await sql.unsafe(tableScheme.content)
            } catch (err) {
            
                console.error(`Error creating table on start up for '${file}': ${err.message}`)
    
            }
        }
}

/**
 * 
 * @param {String} file
 * creates a table from the file, for one use cases, for testing purposes
 *  
 */
async function testAtStartTable(file) {
    const resolvedBasePath = path.join(__dirname, "../databases");

    if (file === "index.js" || !file.endsWith(".js")) {
        throw new Error("Invalid schema filename!");
    }

    const schemaPath = path.join(resolvedBasePath, file);

    // Ensure the file exists inside the databases directory.
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file '${file}' does not exist!`);
    }

    let tableScheme;

    try {
        tableScheme = require(schemaPath);
    } catch (err) {
        throw new Error(
            `Failed to load schema for '${file}': ${err.message}`
        );
    }

    const content = Object.keys(tableScheme);

    if (content.length !== 1) {
        throw new Error(`'${file}' has an invalid object size!`);
    }

    if (
        typeof tableScheme.content !== "string" ||
        !tableScheme.content
    ) {
        throw new Error(
            `Invalid export for ${file}! Expected only 1 export (the schema).`
        );
    }

    try {
        await sql.unsafe(tableScheme.content);
        console.log(`Successfully created test table using '${file}'.`);
    } catch (err) {
        console.error(
            `Error creating test table using '${file}': ${err.message}`
        );
        throw err;
    }
}


module.exports = { createAtStartTables, testAtStartTable };