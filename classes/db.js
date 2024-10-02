const { MongoClient } = require("mongodb");

const failure_messages = require(`./standardizeMessages`);

class dataBaseInteract {
    constructor(uri, dbName) {
        this.uri = uri;
        this.dbName = dbName;
        this.client = null;
        this.db - null;
    }

    async connect() {
        try {
            this.client = new MongoClient(this.uri);
            await this.client.connect();
            this.db = this.client.db(this.db_name);

            return failure_messages.CONNECTED_SUCCESS;
        } catch (e) {
            return `${failure_messages.CONNECTED_FAILURE} to MongoDB: ${e}`;
        }
    }

    async insert_document(collection_name, document) {
        if (this._checkIfdbConnected()) {
            return this._checkIfdbConnected();
        }

        try {
            collection = this.db[collection_name];
            result = collection.insertOne(document);
        } catch (e) {
            console.log(`${failure_messages.DOCUMENT_FAILED}: ${e}`);
        }
    }

    async create_collection(name, schema) {
        if (!this.client) return failure_message.CONNECTED_FAILURE;
        try {
            this.db.createCollection(name, { clusteredIndex: schema });
        } catch (e) {
            console.log(`${failure_message.FAILURE_AT} create collection`);
        }
    }

    async find_document(collection_name, query) {
        if (this._checkIfdbConnected()) {
            return this._checkIfdbConnected();
        }

        try {
            collection = this.db[collection_name];
            result = collection.findOne(query);

            if (!result) {
                return "No matching document found.";
            } else {
                return result;
            }
        } catch (e) {
            console.log(`${failure_messages.FAILURE_AT} find document ${e}`);
        }
    }

    async update_document(collection_name, query, update_data) {
        if (this._checkIfdbConnected()) {
            return this._checkIfdbConnected();
        }

        try {
            collection = this.db[collection_name];

            result = collection.updateOne(query, { $set: update_data });

            if (result.modifiedCount > 0) {
                return failure_messages.CONNECTED_SUCESS;
            } else {
                return (
                    failure_messages.FAILURE_AT +
                    ` update document: No documents matched the query`
                );
            }
        } catch (e) {
            return failure_messages.failure_messages + " update document";
        }
    }

    async delete_document(collection_name, query) {
        if (this._checkIfdbConnected()) {
            return this._checkIfdbConnected;
        }

        try {
            collection = this.db[collection_name];

            result = collection.deleteOne(query);
        } catch (e) {
            console.log(`${failure_messages.DOCUMENT_FAILED}: ${e}`);
        }
    }

    async closeConnection() {
        if (this.client) {
            await this.client.close();

            return `Ended DB connection`;
        }
    }

    // Interal functions

    _checkIfdbConnected() {
        if (!this.db) return failure_messages.INSTANCE_NO_CLIENT;
        return null;
    }
}

module.exports = {
    dataBaseInteract,
};
