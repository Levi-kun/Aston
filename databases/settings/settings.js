const { BSONType } = require("mongodb");
const { schema } = require("../animeCardMoves/animeCardMoves");

const settings = {
	collectionName: "settings",
	schema: {
		bsonType: "object",
		additionalProperties: true,
		properties: {
			_id: {
				bsonType: "objectId",
				description:
					"unique identifier for the settings, dk just wanna store something here",
			},
		},
	},
};

module.exports = settings;
