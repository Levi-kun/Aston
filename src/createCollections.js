const { Query } = require("../databases/query.js"); // Import the Query class
require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function collectSchemasAndCreateDB(baseFolderPath) {
    try {
        // Read all directories (each representing a collection schema) in the base folder path
        const folders = fs
            .readdirSync(baseFolderPath)
            .filter((file) =>
                fs.lstatSync(path.join(baseFolderPath, file)).isDirectory()
            );

        // Iterate through each folder and find schema files inside
        for (const folder of folders) {
            const folderFullPath = path.join(baseFolderPath, folder); // Correct the folderPath usage
            const files = fs.readdirSync(folderFullPath);

            // Iterate through files in the folder to find schema files
            for (const file of files) {
                const filePath = path.join(folderFullPath, file);

                // If a file is a schema file (assuming .js schema files)
                if (file.endsWith(".js")) {
                    const schemaModule = require(filePath); // Require the schema

                    // Check if the schema module contains collectionName and schema fields
                    if (
                        schemaModule &&
                        schemaModule.collectionName &&
                        schemaModule.schema
                    ) {
                        const { collectionName, schema } = schemaModule;

                        // Create a new Query instance with the collection name
                        const query = new Query(collectionName);

                        // Connect to MongoDB and create the collection if not exists
                        await query.connect(); // Ensure the Query instance connects properly

                        try {
                            // Attempt to create the collection with the schema validation
                            await query.db.createCollection(collectionName, {
                                validator: { $jsonSchema: schema },
                            });
                            console.log(
                                `Collection '${collectionName}' created/verified.`
                            );
                        } catch (err) {
                            if (err.codeName === "NamespaceExists") {
                                console.log(
                                    `Collection '${collectionName}' already exists.`
                                );
                            } else {
                                console.error(
                                    `Error creating collection '${collectionName}':`,
                                    err
                                );
                            }
                        } finally {
                            await query.client.close(); // Close connection after each operation
                        }
                    } else {
                        console.error(
                            `Schema file '${file}' does not contain valid collectionName or schema fields.`
                        );
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error setting up database:", err);
    }
}

collectSchemasAndCreateDB("../databases")
    .then(() => console.log("Database Setup Complete"))
    .catch((err) => console.error("Error setting up database:", err));

module.exports = {
    collectSchemasAndCreateDB,
};
