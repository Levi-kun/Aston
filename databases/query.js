const { MongoClient } = require("mongodb");
const fs = require("fs").promises; // Use promises-based fs functions
const mpath = require("mpath");
const path = require("path");
require("dotenv").config();

class Query {
	constructor(collectionName) {
		if (!collectionName) {
			console.error("Collection name is required.");
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
						`Invalid type for field '${key}'. Expected 'int', got '${typeof value}'`
					);
				}

				// Type mismatch
				if (expectedType !== actualType && expectedType !== "int") {
					console.error(
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
					console.error(`Unexpected field: '${dataKey}'`);
				}
			}
		}
	}

	// Insert one document into the collection
	async insertOne(data) {
		await this.connect(); // Ensure DB connection
		try {
			await this.validateData(data); // Validate data before inserting
			const result = await this.collection.insertOne(data);

			if(result.acknowledged === true) {
				this.readOne({_id: result.insertedId});
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
	async updateOne(filter, newData, options = {}) {
		await this.connect();
		try {
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
		} finally {
			await this.disconnect(); // Ensure disconnect
		}
	}

	/*
	 * Requires the MongoDB Node.js Driver
	 * https://mongodb.github.io/node-mongodb-native
	 */

	async aggregate(num, filter = false) {
		await this.connect();

		// Initialize the aggregation pipeline
		const stack = [];

		// Ensure num is valid
		if (!num || typeof num !== "number" || num <= 0) {
			console.error("Invalid 'num' parameter:", num);
			return [];
		}

		// Apply filter if provided
		if (filter) {
			filter = { rarity: parseInt(filter, 10) };
			stack.push({ $match: filter });
		}

		// Sort by version (highest first)
		stack.push({ $sort: { version: -1 } });

		// Group by name and pick the highest version
		stack.push({
			$group: {
				_id: "$name", // Group by the 'name' field
				lv: { $first: "$$ROOT" }, // Get the highest version document for each group
			},
		});

		// Randomly select 'num' documents
		stack.push({ $sample: { size: num } });

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

			// Check if all key-value pairs in the query match the result
			for (const key in query) {
				if (query[key] !== result[key]) {
					return false; // If any key doesn't match, return false
				}
			}

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
			return result;
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
			const result = await this.collection.find(query);
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

			// Update the guild document with the new channel information
			const result = await this.updateOne(
				{ id: guildId },
				updateData,
				{ upsert: true } // Insert document if it doesn't exist
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
