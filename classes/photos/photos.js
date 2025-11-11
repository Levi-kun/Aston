import fs from "fs";
import path from "path";
import sharp from "sharp";
import axios from "axios";

export class photo {
        constructor(photoQuery) {
                this.photoQuery = photoQuery;
        }

        async __getPhoto(photoId) {
                const photoData = await this.photoQuery.readOne({ _id: photoId });
                return photoData || null;
        }

        __generatePaths(name, version, rarity, id) {
                const relativePath = `${name}/${version}/${rarity}/${id}.png`;
                return {
                        id,
                        relativePath,
                        absolutePath: path.resolve(`../photos/${relativePath}`),
                };
        }

        async __createPhotoRecord(name, version, rarity) {
                // Create an empty record to get its MongoDB _id
                const result = await this.photoQuery.insertOne({
                        name,
                        version,
                        rarity,
                        createdAt: new Date(),
                });
                return result.insertedId; // MongoDB ObjectId
        }

        async __updatePhotoPath(photoId, relativePath) {
                await this.photoQuery.updateOne(
                        { _id: photoId },
                        { $set: { path: relativePath } },
                );
        }

        async __downloadFromUrl(url) {
                const response = await axios.get(url, { responseType: "arraybuffer" });
                return Buffer.from(response.data);
        }

        async __compressImage(input, outputPath) {
                try {
                        const dir = path.dirname(outputPath);
                        fs.mkdirSync(dir, { recursive: true });

                        await sharp(input)
                                .png({ compressionLevel: 6, adaptiveFiltering: true })
                                .toFile(outputPath);
                } catch (error) {
                        console.error("Compression error:", error);
                }
        }

        /**
         * Saves a photo and returns DB record and file path
         */
        async savePhoto(name, version, rarity, photoInput) {
                // 1️⃣ Create DB record first to get ObjectId
                const photoId = await this.__createPhotoRecord(name, version, rarity);
                const paths = this.__generatePaths(name, version, rarity, photoId);

                // 2️⃣ Normalize input → Buffer
                let inputBuffer;
                if (Buffer.isBuffer(photoInput)) {
                        inputBuffer = photoInput;
                } else if (
                        typeof photoInput === "string" &&
                        photoInput.startsWith("http")
                ) {
                        inputBuffer = await this.__downloadFromUrl(photoInput);
                } else if (
                        typeof photoInput === "string" &&
                        fs.existsSync(photoInput)
                ) {
                        inputBuffer = fs.readFileSync(photoInput);
                } else {
                        throw new Error("Invalid photo input type");
                }

                // 3️⃣ Compress + save
                await this.__compressImage(inputBuffer, paths.absolutePath);

                // 4️⃣ Update DB record with path
                await this.__updatePhotoPath(photoId, paths.relativePath);

                // 5️⃣ Return info
                return {
                        id: photoId,
                        name,
                        version,
                        rarity,
                        path: paths.relativePath,
                };
        }

        /**
         * Finds the newest version of a photo for a given rarity.
         * It sorts versions like v3 > v2 > v1 and returns the highest one.
         */
        async getPhotoByRarity(name, rarity) {
                const photos = await this.photoQuery.readMany({ name, rarity });

                if (!photos || photos.length === 0) return null;

                // Extract the version number from "v1", "v2", etc.
                const sorted = photos.sort((a, b) => {
                        const numA = parseInt(a.version.replace("v", "")) || 0;
                        const numB = parseInt(b.version.replace("v", "")) || 0;
                        return numB - numA; // Highest version first
                });

                const latest = sorted[0];
                const absolutePath = path.resolve(`../photos/${latest.path}`);

                return {
                        record: latest,
                        path: absolutePath,
                };
        }
}
