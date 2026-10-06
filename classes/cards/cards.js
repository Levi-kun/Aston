const sql = require(`../../databases/index.js`);

class Card { 
 constructor(row) {
    Object.assign(this, row)
 }

 static async spawn(cardId) {
    return await new Card(await this.grabCardData(cardId));
 }


static async grabCardData(cardId) {
  const [cardData] = await sql`SELECT * FROM cards WHERE id = ${cardId}`;
  return cardData;
}

   clone() {
   return new CloneCard(structuredClone({...this}));
}

}

class CloneCard extends Card {
   constructor(row) {
      super(row);
      this.temporary = true;
   }
}

module.exports = Card;