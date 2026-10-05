const sql = require(`../../databases/index.js`);

class Card { 
 constructor(row) {
    Object.assign(this, row)
 }

 static async spawn(cardId) {
    return await new Card(await this.grabCardData(cardId));
 }


async grabCardData(cardId) {
  const [cardData] = await sql`SELECT * FROM cards WHERE id = ${cardId}`;
  return cardData;
}

   clone() {
   return new Card(structuredClone({...this}));
}

}

module.exports = Card;