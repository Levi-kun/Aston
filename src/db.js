const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);


const failure_messages = Object.freeze({
    CONNECTED_SUCESS: 'Connected',
    CONNECTED_FAILURE: 'Failed to connect',
    FAILURE_AT: 'Failed to'

})

class mConnection {
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
            this.db = this.client.db(this.db_name)

            return failure_messages.CONNECTED_SUCESS
        } catch (e) {
            return `${failure_messages.CONNECTED_FAILURE} to MongoDB: ${e}`;
        }
    }

    async insert_document(collection_name, document) {
        if (!this.db) {
            return ("Not connected to the database");
        }

        try {
            collection = this.db[collection_name];
            result = collection.insertOne(document);
        } catch (e) {
            console.log(`Failed to insert document: ${e}`);
        }
    }

    find_document(collection_name, query) {
        if (!this.db) {
            return console.log(`Not connected to the database`);
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
            console.log(`Failed at find document ${e}`);
        }
    }

    update_document (collection_name,query,update_data) {
        if(!this.db) {
            return console.log("Not connected to the database")
        }

        try {
            collection= this.db[collection_name]

            result = collection.updateOne(query, {`$set`: update_data})

            if result.modifiedCount {

            }
        }
    }
}

module.exports = {
    mConnection,
};
