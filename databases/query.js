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

            // Check for type validation
            if (expectedType) {
                const actualType = Array.isArray(value)
                    ? "array"
                    : typeof value;

                if (actualType !== expectedType) {
                    throw new Error(
                        `Invalid type for field '${key}'. Expected '${expectedType}', got '${actualType}'`
                    );
                }
            }

            // Validate nested objects if they exist
            if (propertySchema.properties) {
                if (typeof value !== "object" || Array.isArray(value)) {
                    throw new Error(`Field '${key}' should be an object.`);
                }
                // Recursively validate nested properties
                this.validateData(value); // Recursion for nested object validation
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
    }

    // Insert one document into the collection
    async insertOne(data) {
        await this.connect(); // Ensure DB connection
        this.validateData(data); // Validate data before inserting
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
    async updateOne(filter, newData) {
        await this.connect();
        this.validateData(newData); // Validate new data before updating
        const result = await this.collection.updateOne(filter, {
            $set: newData,
        });
        return result;
    }
    async aggergate(num) {
        await this.connect();
        return this.collection.aggergate([{ $sample: { size: num } }]);
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
            console.log(`Loading schema from: ${filePath}`);

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
