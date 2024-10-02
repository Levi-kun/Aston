const { dataBaseInteract } = require(`../classes/db.js`);

require("dotenv").config();

const uri = process.env.MONGODB_URI;
const fs = require(`fs`);
const client = new dataBaseInteract(uri);

async function collectSchemasAndCreateDB(folderpath) {
    await client.connect();

    const folders = fs
        .readdir(folderpath)
        .filter((file) =>
            fs.lstatSync(path.join(folderPath, file)).isDirectory()
        );

    for (const folder of folders) {
        const folderPath = path.join(folderpath, folder);
        const files = fs.readdirSync(folderPath);

        for (const file of files) {
            const filepath = path.join(folderPath, file);
            if (file.endsWith(".js")) {
                const schema = require(filePath);
                if (schema && schema.collectionName && schema.schema) {
                    await client.create_collection(
                        schema.collectionName,
                        schema.schema
                    );
                }
            }
        }
    }

    await client.closeConnection();
}

const folderPath = "../databases";

collectSchemasAndCreateDB(folderPath)
    .then(() => console.log(`Database Setup Complete`))
    .catch((e) => console.log(`Error setting up database:`, err));

module.exports = {
    collectSchemasAndCreateDB,
};
