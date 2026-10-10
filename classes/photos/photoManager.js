const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { Photo } = require("./photos.js");

const RENDERER_VERSION = 1;

function stableValue(value) {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value && typeof value === "object") {
		return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
	}
	return value;
}

function fingerprint(value) {
	return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function parseVariation(value) {
	if (!value) return {};
	if (typeof value !== "string") return value;
	try { return JSON.parse(value); } catch { return {}; }
}

async function isAttachmentUsable(location) {
	if (typeof location !== "string" || !/^https?:\/\//i.test(location)) return false;
	try {
		const response = await fetch(location, { method: "HEAD" });
		return response.ok;
	} catch {
		return false;
	}
}

class PhotoManager {
	constructor({ sql, photoFactory = () => new Photo(), uploadAttachment, attachmentCheck = isAttachmentUsable, projectRoot = process.cwd() } = {}) {
		this.sql = sql;
		this.photoFactory = photoFactory;
		this.uploadAttachment = uploadAttachment;
		this.attachmentCheck = attachmentCheck;
		this.projectRoot = projectRoot;
		this.imageRoot = path.resolve(projectRoot, "images", "cards");
		this._schemaReady = null;
	}

	_getSql() {
		if (!this.sql) this.sql = require("../../databases/index.js");
		return this.sql;
	}

	async _ensureSchema() {
		if (!this._schemaReady) {
			const sql = this._getSql();
			this._schemaReady = (async () => {
				await sql`CREATE TABLE IF NOT EXISTS card_base_renders (
					card_id INT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
					fingerprint TEXT NOT NULL,
					location TEXT NOT NULL,
					updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				)`;
				await sql`CREATE TABLE IF NOT EXISTS card_renders (
					card_id INT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
					fingerprint TEXT NOT NULL,
					location TEXT NOT NULL,
					attachment_url TEXT,
					created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				)`;
				await sql`ALTER TABLE card_base_renders ADD COLUMN IF NOT EXISTS location TEXT`;
				await sql`DO $$
					BEGIN
						IF EXISTS (
							SELECT 1 FROM information_schema.columns
							WHERE table_name = 'card_base_renders' AND column_name = 'rendered'
						) THEN
							ALTER TABLE card_base_renders ALTER COLUMN rendered DROP NOT NULL;
						END IF;
					END
				$$`;
				await sql`CREATE TABLE IF NOT EXISTS historical_card_data (
					id BIGSERIAL PRIMARY KEY,
					card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
					fingerprint TEXT NOT NULL,
					state JSONB NOT NULL,
					image_path TEXT NOT NULL,
					attachment_url TEXT,
					created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				)`;
				await sql`ALTER TABLE card_renders ADD COLUMN IF NOT EXISTS attachment_url TEXT`;
				await sql`ALTER TABLE historical_card_data ADD COLUMN IF NOT EXISTS image_path TEXT`;
				await sql`ALTER TABLE historical_card_data ADD COLUMN IF NOT EXISTS attachment_url TEXT`;
				await sql`UPDATE historical_card_data
					SET image_path = COALESCE(image_path, to_jsonb(historical_card_data)->>'attachment_location'),
						attachment_url = COALESCE(attachment_url, to_jsonb(historical_card_data)->>'attachment_location')
					WHERE image_path IS NULL OR attachment_url IS NULL`;
				await sql`ALTER TABLE historical_card_data DROP COLUMN IF EXISTS attachment_location`;
				await sql`CREATE INDEX IF NOT EXISTS historical_card_render_lookup
					ON historical_card_data (card_id, fingerprint, created_at DESC)`
			})();
		}
		return this._schemaReady;
	}

	/**
	 * 
	 * @param {*} cardId This is the id for the card
	 * @param {*} userId This is the user id for the card
	 * @returns It returns, if succesfull, a js object with 
	 * {id, user_id, master_card_id, alt_version, description, shine, xp, 
	 *  mint, name, rarity, modification, photo_id, photo_location, likes, titles.{id, name}}
	 * 
	 */
	async _loadCard(cardId, userId) {
		const [row] = await this.sql`
			SELECT c.id, cl.user_id, c.card_id AS master_card_id, c.alt_version, c.description,
				c.shine, c.xp, c.level, c.mint, mc.name, av.rarity,
				av.modification, p.id AS photo_id, p.location AS photo_location,
				COALESCE(l.count, 0) AS likes,
				COALESCE(
					json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name))
					FILTER (WHERE t.id IS NOT NULL), '[]'::json
				) AS titles
			FROM cards AS c
				JOIN claiming AS cl ON cl.card_id = c.id AND cl.user_id = ${userId}
			JOIN master_cards AS mc ON mc.id = c.card_id
			LEFT JOIN alt_version AS av ON av.id = c.alt_version
			LEFT JOIN photo_per_card AS ppc ON ppc.alt_version = c.alt_version
			LEFT JOIN photos AS p ON p.id = ppc.photo_id
			LEFT JOIN likes AS l ON l.card_id = c.id
			LEFT JOIN title_to_card AS tc ON tc.card_id = c.id
			LEFT JOIN titles AS t ON t.id = tc.title_id
			WHERE c.id = ${cardId}
			GROUP BY c.id, cl.user_id, mc.name, av.rarity, av.modification, p.id, p.location, l.count
		`;
		if (!row) throw new Error(`Card ${cardId} was not found`);
		if (!row.photo_id || !row.photo_location) throw new Error(`Card ${cardId} has no photo for variation ${row.alt_version}`);
		return row;
	}

	_createPhoto(row) {
		return this.photoFactory()
			.setRarity(Number(row.rarity ?? 0))
			.addPhoto(row.photo_location)
			.addName(row.name || "")
			.addDescription(row.description || "")
			.addShine(Number(row.shine ?? 0))
			.addLevel(Number(row.level ?? 1))
			.addMint(row.mint ?? 0)
			.addLikes(Number(row.likes ?? 0))
			.addTitles(row.titles || [])
			.setVariation(parseVariation(row.modification));
	}

	_baseState(row, photo) {
		return {
			rendererVersion: RENDERER_VERSION,
			photoId: row.photo_id,
			photoLocation: row.photo_location,
			masterCardId: row.master_card_id,
			name: row.name || "",
			description: row.description || "",
			shine: Number(row.shine ?? 0),
			likes: Number(row.likes ?? 0),
			mint: String(row.mint ?? 0),
			rarity: photo.rarity,
			variation: photo.variation,
		};
	}

	_finalState(row, baseFingerprint) {
		return {
			rendererVersion: RENDERER_VERSION,
			baseFingerprint,
			level: Number(row.level ?? 1),
			titles: (row.titles || []).map(title => title.name).filter(Boolean),
		};
	}

	async _usableImagePath(location) {
		if (!location || /^https?:\/\//i.test(location)) return false;
		const absolutePath = path.resolve(this.projectRoot, location);
		const relativePath = path.relative(this.imageRoot, absolutePath);
		if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return false;
		try {
			await fs.access(absolutePath);
			return true;
		} catch {
			return false;
		}
	}

	async _cachedImage(cardId, finalFingerprint) {
		const [historical] = await this.sql`
			SELECT image_path AS location, attachment_url
			FROM historical_card_data
			WHERE card_id = ${cardId} AND fingerprint = ${finalFingerprint}
			ORDER BY created_at DESC
			LIMIT 1
		`;
		const [current] = historical ? [] : await this.sql`
			SELECT location, attachment_url
			FROM card_renders
			WHERE card_id = ${cardId} AND fingerprint = ${finalFingerprint}
			LIMIT 1
		`;
		const saved = historical || current;
		if (!saved) return null;
		if (saved.attachment_url && await this.attachmentCheck(saved.attachment_url)) {
			return { kind: "attachment", location: saved.attachment_url };
		}
		if (await this._usableImagePath(saved.location)) return { kind: "file", location: saved.location };
		return null;
	}

	async _safeSegment(value, label) {
		const segment = String(value);
		if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new TypeError(`Invalid ${label} for image storage`);
		return segment;
	}

	async _writeImage(userId, cardId, filename, buffer, exclusive = false) {
		const userSegment = await this._safeSegment(userId, "user ID");
		const cardSegment = await this._safeSegment(cardId, "card ID");
		const directory = path.join(this.imageRoot, userSegment, cardSegment);
		await fs.mkdir(directory, { recursive: true });
		const absolutePath = path.join(directory, filename);
		await fs.writeFile(absolutePath, buffer, exclusive ? { flag: "wx" } : undefined);
		return path.relative(this.projectRoot, absolutePath).split(path.sep).join("/");
	}

	async _writeFinalJpeg(userId, cardId, buffer) {
		const jpg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
		const date = new Date().toISOString().replace(/[:.]/g, "-");
		let suffix = 0;
		while (true) {
			const filename = `${date}${suffix ? `-${suffix}` : ""}.jpg`;
			try {
				const location = await this._writeImage(userId, cardId, filename, jpg, true);
				return { location, buffer: jpg };
			} catch (error) {
				if (error.code !== "EEXIST") throw error;
				suffix++;
			}
		}
	}

	_paramExists(arg) {
		if (arg == null || arg === "") {

			new TypeError("PhotoManager.requestPhoto() has a missing argument")
			return false;
		
		} else {
			return true;
		}
	}

	async requestPhoto(cardId, userId) {
		
		if(!this._paramExists(userId)) return;
		if(!this._paramExists(cardId)) return;

		await this._ensureSchema();

		const row = await this._loadCard(cardId, userId);
		const photo = this._createPhoto(row);
		const baseState = this._baseState(row, photo);
		const baseFingerprint = fingerprint(baseState);
		const finalState = this._finalState(row, baseFingerprint);
		const finalFingerprint = fingerprint(finalState);
		const cachedImage = await this._cachedImage(row.id, finalFingerprint);

		if (cachedImage) return { ...cachedImage, reused: true, cardId: row.id, fingerprint: finalFingerprint };

		let buffer;
		if (photo.animated) {
			buffer = await photo.render();
		} else {
			const [cachedBase] = await this.sql`
				SELECT fingerprint, location
				FROM card_base_renders
				WHERE card_id = ${row.id}
				LIMIT 1
			`;
			let baseBuffer;
			if (cachedBase?.fingerprint === baseFingerprint && await this._usableImagePath(cachedBase.location)) {
				baseBuffer = await fs.readFile(path.resolve(this.projectRoot, cachedBase.location));
			} else {
				baseBuffer = await photo.renderBase();
				const location = await this._writeImage(row.user_id, row.id, `base-${baseFingerprint}.png`, baseBuffer);
				await this.sql`
					INSERT INTO card_base_renders (card_id, fingerprint, location)
					VALUES (${row.id}, ${baseFingerprint}, ${location})
					ON CONFLICT (card_id) DO UPDATE SET
						fingerprint = EXCLUDED.fingerprint,
						location = EXCLUDED.location,
						updated_at = NOW()
				`;
			}
			buffer = await photo.renderFinal(baseBuffer);
		}

		const result = {
			kind: "render",
			buffer,
			reused: false,
			cardId: row.id,
			fingerprint: finalFingerprint,
			state: finalState,
			userId: row.user_id,
		};
		const saved = await this._writeFinalJpeg(row.user_id, row.id, buffer);
		result.location = saved.location;
		result.buffer = saved.buffer;
		await this._saveRenderedImage(result);
		if (this.uploadAttachment) {
			const attachmentUrl = await this.uploadAttachment(saved.buffer, {
				cardId: row.id,
				userId: row.user_id,
				fingerprint: finalFingerprint,
				filePath: path.resolve(this.projectRoot, saved.location),
			});
			await this.recordAttachment(result, attachmentUrl);
			return { kind: "attachment", location: attachmentUrl, filePath: saved.location, reused: false, cardId: row.id, fingerprint: finalFingerprint };
		}
		return { kind: "file", location: saved.location, buffer: saved.buffer, reused: false, cardId: row.id, fingerprint: finalFingerprint };
	}

	async _saveRenderedImage(renderResult) {
		await this._ensureSchema();
		await this.sql.begin(async transaction => {
			await transaction`
				INSERT INTO card_renders (card_id, fingerprint, location, attachment_url)
				VALUES (${renderResult.cardId}, ${renderResult.fingerprint}, ${renderResult.location}, NULL)
				ON CONFLICT (card_id) DO UPDATE SET
					fingerprint = EXCLUDED.fingerprint,
					location = EXCLUDED.location,
					attachment_url = NULL,
					created_at = NOW()
			`;
			await transaction`
				INSERT INTO historical_card_data (card_id, fingerprint, state, image_path)
				VALUES (${renderResult.cardId}, ${renderResult.fingerprint}, ${transaction.json(renderResult.state)}, ${renderResult.location})
			`;
		});
	}

	async recordAttachment(renderResult, attachmentUrl) {
		if (!renderResult || renderResult.kind !== "render" || !renderResult.state) throw new TypeError("recordAttachment() expects a render result from requestPhoto()");
		if (typeof attachmentUrl !== "string" || !attachmentUrl) throw new TypeError("recordAttachment() expects an attachment URL");
		await this.sql.begin(async transaction => {
			await transaction`
				UPDATE card_renders
				SET attachment_url = ${attachmentUrl}
				WHERE card_id = ${renderResult.cardId} AND fingerprint = ${renderResult.fingerprint}
			`;
			await transaction`
				UPDATE historical_card_data
				SET attachment_url = ${attachmentUrl}
				WHERE id = (
					SELECT id FROM historical_card_data
					WHERE card_id = ${renderResult.cardId} AND fingerprint = ${renderResult.fingerprint}
					ORDER BY created_at DESC LIMIT 1
				)
			`;
		});
	}
}

module.exports = { PhotoManager, fingerprint };