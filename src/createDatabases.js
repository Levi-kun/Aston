/**

    Create the automation of going through each database

*/

const path = require("path");
const fs = require("fs");
const sql = require("../databases");
const baseFolderPath = "../databases/"

async function createAtStartTables() {
        const resolvedBasePath = path.join(__dirname, '../databases')
        
        const baseFolder = fs.readdirSync(resolvedBasePath)
        .filter((file) => {
            return file.endsWith(".js")
        })

        for (const file of baseFolder) {
            let tableScheme;

            if (file === "index.js") continue;

            try {
                tableScheme = require(path.join(resolvedBasePath, file))
            } catch (err) {
                console.error(`Error! Failed to load schema for '${file}: ${err.message}`)
                continue;
            }
            const content = Object.keys(tableScheme);

            if(content.length !== 1) throw Error(`'${file}' has an invalid object size!`)

            if(!typeof tableScheme.content === "string" || !tableScheme.content) throw Error(`Invalid export for ${file}! Expected only 1 export (the schema)`);
            
            try {
                await sql.unsafe(tableScheme.content)
            } catch (err) {
            
                console.error(`Error creating table on start up for '${file}': ${err.message}`)
    
            }
        }
}

module.exports = { createAtStartTables };