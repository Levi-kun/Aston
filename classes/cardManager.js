const sql = require(`../databases/index.js`);

class Card { 
 constructor(row) {
    Object.assign(this, row)
 }

 static async spawn(CardId) {
    return await createCard(cardId);
 }

}

function createCard(cardId) {

    const [cardData] = sql`SELECT * FROM cards WHERE id = ${cardId}`;
    const newCard = new Card(cardData);
    return newCard;
}