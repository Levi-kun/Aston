const { Query } = require("../databases/query.js");
const fs = require("fs");
const path = require("path");

async function collectSchemasAndCreateDB(baseFolderPath) {
        try {
                const fullBasePath = path.resolve(baseFolderPath);
                const folders = fs
                        .readdirSync(fullBasePath)
                        .filter((file) =>
                                fs.lstatSync(path.join(fullBasePath, file)).isDirectory(),
                        );

                for (const folder of folders) {
                        const schemaFile = path.join(fullBasePath, folder, `${folder}.js`);

                        if (!fs.existsSync(schemaFile)) {
                                console.warn(
                                        `⚠ Skipping '${folder}' — no schema file found at ${schemaFile}`,
                                );
                                continue;
                        }

                        let schemaModule;
                        try {
                                schemaModule = require(schemaFile);
                        } catch (err) {
                                console.error(
                                        `❌ Failed to load schema for '${folder}': ${err.message}`,
                                );
                                continue;
                        }

                        // Handle both CommonJS and ESModule export styles
                        const exportKeys = Object.keys(schemaModule);
                        let schemaObject = null;

                        // Case 1: export const something = { collectionName, schema }
                        if (exportKeys.length > 0) {
                                for (const key of exportKeys) {
                                        const candidate = schemaModule[key];
                                        if (
                                                candidate &&
                                                typeof candidate === "object" &&
                                                candidate.collectionName &&
                                                candidate.schema
                                        ) {
                                                schemaObject = candidate;
                                                break;
                                        }
                                }
                        }

                        // Case 2: module.exports = { collectionName, schema }
                        if (
                                !schemaObject &&
                                schemaModule.collectionName &&
                                schemaModule.schema
                        ) {
                                schemaObject = schemaModule;
                        }

                        // Case 3: export default { collectionName, schema }
                        if (!schemaObject && schemaModule.default) {
                                const candidate = schemaModule.default;
                                if (candidate.collectionName && candidate.schema) {
                                        schemaObject = candidate;
                                }
                        }

                        if (!schemaObject) {
                                console.warn(
                                        `⚠ Skipping '${folder}' — no valid schema export found.`,
                                );
                                continue;
                        }

                        const { collectionName, schema } = schemaObject;
                        const query = new Query(collectionName);
                        await query.connect();

                        try {
                                await query.db.createCollection(collectionName, {
                                        validator: { $jsonSchema: schema },
                                });
                                console.log(
                                        `Created or verified collection: ${collectionName}`,
                                );
                        } catch (err) {
                                if (err.codeName !== "NamespaceExists") {
                                        console.error(
                                                `Error creating collection '${collectionName}':`,
                                                err,
                                        );
                                }
                        } finally {
                                await query.client.close();
                        }
                }

                console.log("Database setup complete.");
        } catch (err) {
                console.error("Error setting up database:", err);
        }
}

if (require.main === module) {
        collectSchemasAndCreateDB(path.resolve(__dirname, "../databases")).catch(
                (err) => console.error("Error setting up database:", err),
        );
}

module.exports = { collectSchemasAndCreateDB };
