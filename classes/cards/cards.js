const sql = require(`../../databases/index.js`);

class Card { 
 constructor(row) {
    Object.assign(this, row)
 }

 static async spawn(cardId) {
    return await new Card(await grabCardData(cardId));
 }


async grabCardData(cardId) {
  const [cardData] = await sql`SELECT * FROM cards WHERE id = ${cardId}`;
  return cardData;
}

}

module.exports = Card;