const { MongoClient } = require("mongodb");
const mpath = require("mpath");
const path = require("path");

require("dotenv").config();

function isObject(value) {
        return typeof value === "object" && value !== null;
}

function createURI() {
        const uri = process.env.MONGODB_URI;
        const user = process.env.ASTONDB_USER;
        const password = process.env.ASTONDB_PASSWORD;

        const completeURI = `mongodb://${user}:${password}@${uri}/astondb?authSource=astondb`;
        return completeURI;
}

class Query {
        constructor(collectionName) {
                if (!collectionName) {
                        console.error("Collection name is required.");
                }
                this.collectionName = collectionName;
                this.schema = this._collectionSchema(collectionName); // Use the passed schema for validation
                this.client = new MongoClient(createURI());
                this.dbName = `astondb`; // Replace with your actual DB name
        }

        // Connect to the MongoDB
        async connect() {
                if (!this.client.isConnected && this.client.connect) {
                        await this.client.connect();
                }
                this.db = this.client.db(this.dbName);
                this.collection = this.db.collection(this.collectionName);
        }
        async countDocuments(query = {}) {
                await this.connect();
                try {
                        const count = await this.collection.countDocuments(query);
                        return count;
                } catch (error) {
                        console.error("Error during countDocuments:", error);
                        return 0; // Return 0 in case of error
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        // Disconnect from MongoDB
        async disconnect() {
                if (this.client.isConnected) {
                        await this.client.close();
                }
        }

        // Validate the data against the schema
        validateData(data) {
                const { schema } = this;
                const requiredFields = schema.required || [];

                // Ensure required fields are present
                for (let field of requiredFields) {
                        if (!mpath.get(field, data)) {
                                console.error(`Missing required field: ${field}`);
                        }
                }

                // Validate all properties defined in the schema
                for (let key in schema.properties) {
                        const propertySchema = schema.properties[key];
                        const expectedType = propertySchema.bsonType;

                        // Check if the property exists
                        const value = mpath.get(key, data);

                        // Enhanced type validation
                        if (value !== undefined && expectedType) {
                                const actualType = Array.isArray(value)
                                        ? "array"
                                        : typeof value;

                                // For "int" bsonType, ensure the value is an integer
                                if (expectedType === "int" && !Number.isInteger(value)) {
                                        console.error(
                                                `Invalid type for field '${key}'. Expected 'int', got '${typeof value}'`,
                                        );
                                }

                                // Type mismatch
                                if (expectedType !== actualType && expectedType !== "int") {
                                        console.error(
                                                `Invalid type for field '${key}'. Expected '${expectedType}', got '${actualType}'`,
                                        );
                                }
                        }

                        // Validate nested objects
                        if (
                                propertySchema.properties &&
                                typeof value === "object" &&
                                !Array.isArray(value)
                        ) {
                                this.validateData(value); // Recursion for nested object validation
                        }
                }

                // Check if additional properties are disallowed
                if (schema.additionalProperties === false) {
                        for (let dataKey in data) {
                                if (!schema.properties[dataKey]) {
                                        console.error(`Unexpected field: '${dataKey}'`);
                                }
                        }
                }
        }

        // Insert one document into the collection
        async insertOne(data) {
                await this.connect(); // Ensure DB connection
                try {
                        try {
                                this.validateData(data); // Validate data before inserting
                        } catch (error) {
                                console.log("Validation error: ", error);
                        }
                        if (!this.checkOne(data) || !this.checkOne({ _id: data._id }))
                                return { error: "Document already exists." };

                        let result = await this.collection.insertOne(data);

                        if (result.acknowledged === true) {
                                result = this.readOne({ _id: result.insertedId });
                        }
                        return result;
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        // Remove one document from the collection
        async removeOne(query) {
                await this.connect();
                try {
                        const result = await this.collection.deleteOne(query);
                        return result;
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        // Update one document in the collection
        async updateOne(filter, newData, options = {}, aggergate = false) {
                await this.connect();
                try {
                        if (options.upsert !== false) {
                                options.upsert = true;
                        }
                        // Validate new data before updating
                        if (options.validateData !== false) {
                                this.validateData(newData); // Add an option to skip validation if needed
                        }

                        let result;
                        // Pass in options like arrayFilters, upsert
                        if (!aggergate) {
                                result = await this.collection.updateOne(
                                        filter,
                                        { $set: newData },
                                        options,
                                );
                        } else {
                                result = await this.collection.updateOne(
                                        filter,
                                        newData,
                                        options,
                                );
                        }
                        if (result.modifiedCount > 0 || result.upsertedCount > 0) {
                        }
                        return result;
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        /*
         * Requires the MongoDB Node.js Driver
         * https://mongodb.github.io/node-mongodb-native
         */

        async trueControlAggergate(stack) {
                await this.connect();

                this.validateData(stack);

                try {
                        console.log("stack", stack);
                        const cursor = this.collection.aggregate(stack);
                        const results = await cursor.toArray();
                        return results;
                } catch (error) {
                        console.error("Error during true aggregation:", error);
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        async aggregate(num, filter = false) {
                await this.connect();
                let name = "name";
                // Validate num parameter before executing aggregation pipeline
                this.validateData(num);
                // Initialize the aggregation pipeline
                const stack = [];
                let totalNumCondition = false;
                // Ensure num is valid

                if (isObject(num)) {
                        ((filter = num), (num = null), (name = "_id"));
                }

                if (num <= 0 && typeof num == "number") {
                        console.error("Invalid 'num' parameter:", num);
                        return [];
                }

                if (!num || num === null) {
                        totalNumCondition = true;
                }

                // Apply filter if provided
                if (filter) {
                        stack.push({ $match: filter });
                }

                // Sort by version (highest first)
                stack.push({ $sort: { version: -1 } });

                // Group by name and pick the highest version
                stack.push({
                        $group: {
                                _id: `$${name}`, // Group by the 'name' field
                                lv: { $first: "$$ROOT" }, // Get the highest version document for each group
                        },
                });

                // Randomly select 'num' documents
                if (!totalNumCondition && num !== null) {
                        stack.push({ $sample: { size: num } });
                }

                try {
                        const cursor = this.collection.aggregate(stack);
                        const results = await cursor.toArray();
                        return results;
                } catch (error) {
                        console.error("Error during aggregation:", error);
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        // Update all documents that match the filter
        /**
         * Updates all documents in the collection that match the provided filter with the new data.
         * @param {Object} filter - The query object to filter the documents.
         * @param {Object} newData - The new data to update the documents with.
         * @returns {Promise<Object>} - The result of the update operation, containing the number of updated documents and the updated documents themselves.
         */
        async updateAll(filter, newData) {
                await this.connect();
                try {
                        this.validateData(newData); // Validate new data before updating
                        const result = await this.collection.updateMany(filter, {
                                $set: newData,
                        });
                        return result;
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        async checkOne(query) {
                await this.connect();
                try {
                        const result = await this.readOne(query);
                        if (!result) return false; // No document found, return false
                        if (Object.keys(result).length <= 0) return false; // No document found, return false

                        return true; // If all key-value pairs match, return true
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        // Find one document that matches the query
        async readOne(query) {
                await this.connect();
                try {
                        const result = await this.collection.findOne(query);
                        if (result == null) return {};
                        return result;
                } catch (e) {
                        console.error("Error reading document:", e);
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        /**
         * Reads multiple documents from the collection that match the provided query.
         * @param {Object} query - The query object to filter the documents.
         * @param {Object} [sort] - An optional object specifying the sort order for the results.
         * @param {Number} [limit] - An optional number specifying the maximum number of documents to return.
         * @returns {Promise<Array<Object>>} - An array of documents that match the query, sorted and limited according to the provided parameters.
         */

        async readMany(query, sort = null, limit = null) {
                await this.connect();
                try {
                        const result = this.collection.find(query);
                        if (sort) {
                                result.sort({ sort });
                        }
                        if (limit) {
                                result.limit(limit);
                        }
                        return result.toArray();
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        // Create a new instance of the Query class for the guildDataBase
        async updateChannelId(guildId, channelId, channelType = "default") {
                await this.connect();
                try {
                        // Prepare the dynamic channel field based on the type
                        const channelField = `channelInformation.${channelType}`;

                        // Prepare the update data
                        const updateData = {
                                [channelField]: { _id: channelId, _type: channelType }, // Set channel ID and type based on channelType
                        };
                        console.log("here");
                        // Update the guild document with the new channel information
                        const result = await this.updateOne(
                                { id: guildId },
                                updateData,
                                { upsert: true }, // Insert document if it doesn't exist
                        );

                        if (result.modifiedCount === 0 && result.upsertedCount === 0) {
                                console.error("No document was updated or inserted.");
                        }
                } catch (error) {
                        console.error("Error updating channel ID:", error.message);
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }

        async _collectionSchema(collectionName) {
                const parentFolder = path.join(__dirname, "../databases"); // Adjust to correct relative base path

                if (!collectionName) {
                        console.error("Collection name is required.");
                }

                // Correct path construction
                const folderPath = path.join(parentFolder, collectionName);
                const fileName = `${collectionName}.js`;

                try {
                        const filePath = path.join(folderPath, fileName); // Build full file path

                        // Require the schema file dynamically
                        const schema = require(filePath);

                        // Check if the schema contains valid fields
                        if (schema && schema.schema && schema.collectionName) {
                                return schema.schema;
                        } else {
                                console.error(
                                        `Schema file '${fileName}' does not contain valid schema information.`,
                                );
                                return null;
                        }
                } catch (err) {
                        console.error(`Error accessing '${folderPath}': ${err.message}`);
                        throw err;
                }
        }
        async deleteMany(filter = {}) {
                await this.connect();
                try {
                        // Delete all documents that match the filter
                        const result = await this.collection.deleteMany(filter);
                        return result;
                } catch (error) {
                        console.error("Error during deleteAll:", error);
                } finally {
                        await this.disconnect(); // Ensure disconnect
                }
        }
        async getRandomOne(filter = {}) {
                await this.connect();
                try {
                        const pipeline = [
                                { $match: filter }, // optional filtering before sampling
                                { $sample: { size: 1 } },
                        ];

                        const cursor = this.collection.aggregate(pipeline);
                        const results = await cursor.toArray();

                        return results[0] || null; // return the single random doc
                } catch (error) {
                        console.error("Error fetching random document:", error);
                        return null;
                } finally {
                        await this.disconnect();
                }
        }
}

module.exports = { Query };
