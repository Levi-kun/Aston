const { MongoClient } = require("mongodb");
const fs = require("fs").promises; // Use promises-based fs functions
const mpath = require("mpath");
const path = require("path");
require("dotenv").config();

class Query {
    constructor(collectionName) {
        if (!collectionName) {
            throw new Error("Collection name is required.");
        }
        this.collectionName = collectionName;
        this.schema = this._collectionSchema(collectionName); // Use the passed schema for validation
        this.client = new MongoClient(process.env.MONGODB_URI);
        this.dbName = process.env.MONGODB_NAME; // Replace with your actual DB name
    }

    // Connect to the MongoDB
    async connect() {
        if (!this.client.isConnected && this.client.connect) {
            await this.client.connect();
        }
        this.db = this.client.db(this.dbName);
        this.collection = this.db.collection(this.collectionName);
    }

    // Validate the data against the schema
    validateData(data) {
        const { schema } = this;
        const requiredFields = schema.required || [];

        // Ensure required fields are present
        for (let field of requiredFields) {
            if (!mpath.get(field, data)) {
                throw new Error(`Missing required field: ${field}`);
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
                    throw new Error(
                        `Invalid type for field '${key}'. Expected 'int', got '${typeof value}'`
                    );
                }

                // Type mismatch
                if (expectedType !== actualType && expectedType !== "int") {
                    throw new Error(
                        `Invalid type for field '${key}'. Expected '${expectedType}', got '${actualType}'`
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
                    throw new Error(`Unexpected field: '${dataKey}'`);
                }
            }
        }
    }

    // Insert one document into the collection
    async insertOne(data) {
        await this.connect(); // Ensure DB connection
        await this.validateData(data); // Validate data before inserting
        const result = await this.collection.insertOne(data);
        return result;
    }

    // Remove one document from the collection
    async removeOne(query) {
        await this.connect();
        const result = await this.collection.deleteOne(query);
        return result;
    }

    // Update one document in the collection
    async updateOne(filter, newData, options = {}) {
        await this.connect();
        if (options.upsert !== false) {
            options.upsert = true;
        }
        // Validate new data before updating
        if (options.validateData !== false) {
            this.validateData(newData); // Add an option to skip validation if needed
        }

        // Pass in options like arrayFilters, upsert
        const result = await this.collection.updateOne(
            filter,
            { $set: newData },
            options
        );

        return result;
    }
    async aggregate(num) {
        await this.connect();
        return this.collection
            .aggregate([{ $sample: { size: num } }])
            .toArray();
    }
    // Update all documents that match the filter
    async updateAll(filter, newData) {
        await this.connect();
        this.validateData(newData); // Validate new data before updating
        const result = await this.collection.updateMany(filter, {
            $set: newData,
        });
        return result;
    }

    async checkOne(query) {
        await this.connect();
        const result = await this.readOne(query);

        if (!result) return false; // No document found, return false

        // Check if all key-value pairs in the query match the result
        for (const key in query) {
            if (query[key] !== result[key]) {
                return false; // If any key doesn't match, return false
            }
        }

        return true; // If all key-value pairs match, return true
    }

    // Find one document that matches the query
    async readOne(query) {
        await this.connect();
        const result = await this.collection.findOne(query);
        return result;
    }

    async readMany(query) {
        await this.connect();
        const result = await this.collection.findMany(query);
        return result;
    }

    // Create a new instance of the Query class for the guildDataBase
    async updateChannelId(guildId, channelId, channelType = "default") {
        try {
            // Connect to the database
            await this.connect();

            // Prepare the dynamic channel field based on the type
            const channelField = `channelInformation.${channelType}`;

            // Prepare the update data
            const updateData = {
                [channelField]: { _id: channelId, _type: channelType }, // Set channel ID and type based on channelType
            };

            // Update the guild document with the new channel information
            const result = await this.updateOne(
                { id: guildId },
                updateData,
                { upsert: true } // Insert document if it doesn't exist
            );

            if (result.modifiedCount === 0 && result.upsertedCount === 0) {
                throw new Error("No document was updated or inserted.");
            }
        } catch (error) {
            console.error("Error updating channel ID:", error.message);
        }
    }

    async _collectionSchema(collectionName) {
        const parentFolder = path.join(__dirname, "../databases"); // Adjust to correct relative base path

        if (!collectionName) {
            throw new Error("Collection name is required.");
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
                    `Schema file '${fileName}' does not contain valid schema information.`
                );
                return null;
            }
        } catch (err) {
            console.error(`Error accessing '${folderPath}': ${err.message}`);
            throw err;
        }
    }
}

module.exports = { Query };
