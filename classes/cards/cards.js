const sql = require("../../databases/index.js");
const { PhotoManager } = require("../photos/photoManager.js");

class Card { 
 constructor(row) {
    Object.assign(this, row)
 }

 static async spawn(cardId, userId) {
      return await new Card(await this.grabCardData(cardId, userId));
 }


static async grabCardData(cardId, userId) {
  const [cardData] = await sql`
    SELECT cards.*, master_cards.name, claiming.user_id AS owner_id
    FROM cards
    JOIN master_cards ON master_cards.id = cards.card_id
      LEFT JOIN claiming ON claiming.card_id = cards.id
         AND (${userId ?? null}::varchar IS NULL OR claiming.user_id = ${userId ?? null})
      WHERE cards.id = ${cardId}
      ORDER BY claiming.created_at
      LIMIT 1;
  `;
  return cardData;
}

   clone() {
   return new CloneCard(structuredClone({...this}));
}

   async _grab_photo() {
    const [photo] = await sql`
        SELECT photos.location
        FROM photos
        JOIN photo_per_card
            ON photo_per_card.photo_id = photos.id
        WHERE photo_per_card.card_id = ${this.card_id}
        LIMIT 1;
    `;

    return photo?.location ?? null;
}

async _find_likes() {
    const [likes] = await sql`
        SELECT count
        FROM likes
        WHERE card_id = ${this.id};
    `;

    return likes?.count ?? null;
}

async _grab_variation() {
    const [variation] = await sql`
        SELECT modification
        FROM alt_Version
        WHERE id = ${this.alt_version};
    `;

    return variation?.modification ?? null;
}

async _grab_rarity() {
    const [rarity] = await sql`
        SELECT rarity
        FROM alt_Version
        WHERE id = ${this.alt_version};
    `;

    return rarity?.rarity ?? null;
}

   async change_card_state() {
      const [query] = sql`UPDATE enabled_cards SET enabled = NOT enabled WHERE card_id = ${this.id} AND user_id = ${this.owner_id}`
      return query;
   }

   async render_card(userId = this.owner_id) {
      return new PhotoManager().requestPhoto(this.id, userId);
   }

   // TODO! ADD A CONTRIBTUION CALCULATOR TO PLAYER'S XP
   /**
    *    XP = 5%
    *    SHINE = 10%
    *    BASE_SPAWN_RATE = 40%
    *    RARITY = 40%
    *    LIKES = 5%
    * 
    *    Augmented by:
    *    - Titles [multipliers]
    *    - User Based Boosts
    *    
    */

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