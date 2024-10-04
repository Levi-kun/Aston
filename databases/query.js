const { MongoClient } = require("mongodb");
const { guildDataBasetSchema } = require("./schema"); // Import your schema
const fs = require("fs");
const mpath = require("mpath");
require("dotenv").config();

class Query {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.schema = this._collectionSchema(collectionName); // Use the passed schema for validation
        this.client = new MongoClient(process.env.MONGODB_URI); // MongoDB connection URI
        this.dbName = process.env.MONGODB_NAME; // Replace with your actual DB name
    }

    // Connect to the MongoDB
    async connect() {
        if (!this.client.isConnected()) {
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

    async _collectionSchema(collectionName) {
        const parentFolder = "./"; // Base path
        const folderPath = path.join(parentFolder, collectionName); // Corrected typo: "path.jon" to "path.join"
        const fileName = `${collectionName}.js`; // The expected schema file name

        try {
            // Read the contents of the folder
            const files = await fs.readdir(folderPath);

            // Check if the expected file exists in the folder
            if (files.includes(fileName)) {
                console.log(
                    `Schema file '${fileName}' exists in '${folderPath}'.`
                );
                // Optionally, you can read the file here
                const schema = await fs.readFile(
                    path.join(folderPath, fileName),
                    "utf8"
                );
                return schema; // Return the schema content
            } else {
                console.error(
                    `Schema file '${fileName}' not found in '${folderPath}'.`
                );
                return null; // Or handle it as needed
            }
        } catch (err) {
            console.error(
                `Error reading directory '${folderPath}': ${err.message}`
            );
            throw err; // Rethrow the error if you want to handle it higher up
        }
    }
}

module.exports = Query;
