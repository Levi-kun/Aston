const sql = require(`../../databases/index.js`);
const { Photo } = require(`../photos/photos.js`)

class Card { 
 constructor(row) {
    Object.assign(this, row)
 }

 static async spawn(cardId) {
    return await new Card(await this.grabCardData(cardId));
 }


static async grabCardData(cardId) {
  const [cardData] = await sql`SELECT cards.*, master_cards.name FROM cards JOIN master_cards ON master_cards.id = cards.card_id WHERE cards.id = ${cardId};`;
  return cardData;
}

   clone() {
   return new CloneCard(structuredClone({...this}));
}

   async _grab_photo () {
      const [query] = await sql`SELECT location FROM photos JOIN photo_per_card.photo_id = photos.id WHERE photo_per_card.card_id = ${this.card_id};`

      return query;
   }

   async _find_likes() {
      const [query] = await sql`SELECT count FROM likes WHERE card_id = ${this.id}`
   
      return query;
   }

   async _grab_variation() {
      const [query] = await sql`SELECT modification FROM alt_Version WHERE id = ${this.alt_version}`
      
      return query;
   }

   async _grab_rarity() {
      const [query] = await sql`SELECT rarity FROM alt_Version WHERE id = ${this.alt_version}`
      
      return query;
   }

   async render_card() {
      const card = new Photo()
      .addPhoto(await this._grab_photo())
      .setRarity(await this._find_rarity())      
      .addName(this.name)
      .addDescription(this.description)
      .addShine(this.shine)                   
      .addLevel(this.level)
      .addMint(await this.mint)
      .addLikes(await this._find_Likes())
      .setVariation(await this._grab_variation());
      
      const buf = await card.render();   
      
      return buf;
   }

}

class CloneCard extends Card {
   constructor(row) {
      super(row);
      this.temporary = true;
   }

   modifyName(name) {
      this.name = name;
   }
}

module.exports = Card;