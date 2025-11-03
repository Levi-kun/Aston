import { Timestamp } from "mongodb";

export class cardCreation {
        constructor(variantQuery, spawnedQuery, playerQuery, eventQuery) {
                this.variantQuery = variantQuery;
                this.spawnedQuery = spawnedQuery;
                this.playerQuery = playerQuery;
                this.eventQuery = eventQuery;
        }

        /**
         *
         *    rollRarity() returns number between 1-10
         *
         * **/

        rollRarity() {
                const weights = [60, 20, 10, 6, 2, 1, 0.5, 0.3, 0.2];
                const total = weights.reduce((sum, w) => sum + w, 0);
                const r = Math.random() * total;
                let cumulative = 0;

                for (let i = 0; i < weights.length; i++) {
                        cumulative += weights[i];
                        if (r < cumulative) return i + 1;
                }

                return 1; // fallback
        }

        /**
         *
         * pickCard() returns a number between 1-5
         *
         * **/

        pickCard() {
                // Define weights
                const weights = [
                        { value: 1, weight: 40 },
                        { value: 2, weight: 30 },
                        { value: 3, weight: 20 },
                        { value: 4, weight: 8 },
                        { value: 5, weight: 2 },
                ];

                // Compute total weight
                const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);

                // Pick a random number between 0 and totalWeight
                const random = Math.random() * totalWeight;

                // Find which value the random number falls into
                let cumulative = 0;
                for (const item of weights) {
                        cumulative += item.weight;
                        if (random < cumulative) {
                                return item.value;
                        }
                }
        }

        async triggerCardCreation() {
                const variantCard = await this.spawnedQuery.getRandomOne({
                        baseRarity: pickCard(),
                });

                const spawnedCard = await this.variantQuery.getRandomOne({
                        refParentCard: variantCard,
                        rarityType: this.rollRarity(),
                });

                return spawnedCard;
        }

        async triggerSpawnEvent(channelId, guildId) {
                const spawnedCard = await this.triggerCardCreation();

                const event = await this.eventQuery.insertOne({
                        channel_id: channelId,
                        guild_id: guildId,
                        timestamp: new Date(),
                        spawnedCard_id: spawnedCard._id,
                });

                this.eventId = event._id

                return spawnedCard;
        }

        async claimedSpawnCard()
}
