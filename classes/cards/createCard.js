export class cardCreation {
        constructor(
                parentQuery,
                variantQuery,
                spawnedQuery,
                playerQuery,
                eventQuery,
        ) {
                this.playerQuery = parentQuery;
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

                return 1;
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

                const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);

                const random = Math.random() * totalWeight;

                let cumulative = 0;
                for (const item of weights) {
                        cumulative += item.weight;
                        if (random < cumulative) {
                                return item.value;
                        }
                }
        }

        async getPlayer(userId, guildId) {
                const player = await this.playerQuery.readOne({
                        userId: userId,
                        guildId: guildId,
                });

                if (!player) return;

                return player;
        }

        async getBaseLevel(userId, guildId) {
                const player = await this.getPlayer(userId, guildId);

                const baseLevel = 0;
                if (player.type !== 0) {
                        baseLevel = 200;
                } else {
                        baseLevel = 100;
                }

                return baseLevel;
        }

        async triggerCardCreation() {
                const parentCard = await this.parentQuery.getRandomOne({
                        baseRarity: pickCard(),
                });

                if (!parentCard) return;

                const variantCard = await this.variantQuery.getRandomOne({
                        refParentCard: parentCard._id,
                        rarityType: this.rollRarity(),
                });
                if (!variantCard) return;

                const insertSpawnedCard = {
                        moveset: await this.generateMoveSet(),
                        refVariantCard: variantCard._id,
                };

                const spawnedCard = this.spawnedQuery.insert(insertSpawnedCard);

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

                this.eventId = event._id;
                this.spawnCardId = spawnedCard._id;

                return spawnedCard;
        }

        async compilePlayerCard(userId, guildId) {
                if (!this.spawnCardId) return;
                if (!this.eventId) return;

                const spawned = await this.spawnedQuery.readOne({
                        _id: this.spawnCardId,
                });
                if (!spawned) return;

                const variant = await this.variantQuery({ _id: spawned.refParentCard });
                if (!variant) return;

                const parent = await this.parentQuery({ _id: variant.refParentCard });
                if (!parent) return;

                const compiled = {
                        title: variant.title || parent.name,
                        description: variant.description || parent.description,
                        rarityType: variant.rarityType,
                        moveSet: spawned.moveSet,
                        type: parent.type,
                        photoRef: variant.photoRef || parent.photoRef,
                        refPreviousCard: spawned.refPreviousCard || null,
                        createdAt: spawned.createdAt || new Date(),
                        claimedAt: new Date(),
                        basestats: {
                                level: spawned.stats.level,
                                power: spawned.stats.power,
                                defense: spawned.stats.defense,
                                slotCapacity: spawned.stats.slotCapacity,
                        },
                };

                return compiled;
        }

        async claimedSpawnCard(userId, guildId) {
                const userCard = await this.compilePlayerCard(userId, guildId);

                userCard.player_id = await this.getPlayer(userId, guildId)._id;

                this.playerQuery.insertOne();
        }
}
