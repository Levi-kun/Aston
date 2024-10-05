const { Query } = require("../databases/query.js"); // Import the Query class
require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function collectSchemasAndCreateDB(baseFolderPath) {
    try {
        // Ensure we are using an absolute path
        const fullBasePath = path.resolve(baseFolderPath);
        console.log(`Base folder path resolved to: ${fullBasePath}`);

        // Read all directories (each representing a collection schema) in the base folder path
        const folders = fs
            .readdirSync(fullBasePath)
            .filter((file) =>
                fs.lstatSync(path.join(fullBasePath, file)).isDirectory()
            );

        for (const folder of folders) {
            const folderFullPath = path.join(fullBasePath, folder);
            console.log(`Loading schema from: ${folderFullPath}`);

            const files = fs.readdirSync(folderFullPath);

            for (const file of files) {
                const filePath = path.join(folderFullPath, file);

                if (file.endsWith(".js")) {
                    const schemaModule = require(filePath);

                    if (
                        schemaModule &&
                        schemaModule.collectionName &&
                        schemaModule.schema
                    ) {
                        const { collectionName, schema } = schemaModule;

                        const query = new Query(collectionName);

                        await query.connect();

                        try {
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
                            await query.client.close();
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

collectSchemasAndCreateDB(path.resolve(__dirname, "../databases"))
    .then(() => console.log("Database Setup Complete"))
    .catch((err) => console.error("Error setting up database:", err));

module.exports = {
    collectSchemasAndCreateDB,
};
