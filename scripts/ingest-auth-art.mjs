#!/usr/bin/env node

/**
 * scripts/ingest-auth-art.mjs
 *
 * Ingestion and optimization pipeline for authentication background art:
 * - Reads 2K images from C:\Users\Admin\Downloads\
 * - Semantic pack classification: anime, dental-epic, abstract, nature
 * - Time-of-day slot assignment: morning, day, evening, night (with balanced distribution)
 * - Sharp processing:
 *   * Resize max width 1920px (fit: 'inside', withoutEnlargement: true)
 *   * AVIF: quality 60, effort 4
 *   * WebP: quality 82, effort 4
 *   * LQIP: 24x14px base64 WebP (data:image/webp;base64,...)
 *   * Dominant color: mean RGB hex (#rrggbb)
 *   * Output to apps/web/public/auth-art/<pack>/<slot>/<sanitized_name>-<hash8>.<ext>
 * - Updates apps/web/public/auth-art/manifest.json merging new 248 entries with existing 248 (total 496).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

const DOWNLOADS_DIR = "C:/Users/Admin/Downloads";
const REPO_ROOT = resolve(".");
const AUTH_ART_DIR = join(REPO_ROOT, "apps/web/public/auth-art");
const MANIFEST_PATH = join(AUTH_ART_DIR, "manifest.json");

const CONCURRENCY = 4;
const AVIF_QUALITY = 60;
const WEBP_QUALITY = 82;
const ENCODE_EFFORT = 4;
const MAX_WIDTH = 1920;

function classifyPack(fileName) {
	const n = fileName.toLowerCase();

	// 1. Dental-epic
	if (
		n.includes("dental") ||
		n.includes("implant") ||
		n.includes("jaw") ||
		n.includes("tooth") ||
		n.includes("teeth") ||
		n.includes("crown") ||
		n.includes("inlay") ||
		n.includes("veneer") ||
		n.includes("molar") ||
		n.includes("surgical") ||
		n.includes("oral") ||
		n.includes("porcelain") ||
		n.startsWith("platinum_dental_") ||
		n.startsWith("rose-gold_dental_") ||
		n.startsWith("surgical_instruments_") ||
		n.startsWith("water_droplets_on_dental_")
	) {
		return "dental-epic";
	}

	// 2. Anime
	if (
		n.startsWith("shinobu_") ||
		n.startsWith("zero_two_") ||
		n.startsWith("petite_") ||
		n.startsWith("woman_") ||
		n.startsWith("young_woman_") ||
		n.startsWith("anime_") ||
		n.startsWith("надпись_") ||
		n.startsWith("asuka_") ||
		n.startsWith("character_") ||
		n.startsWith("figure_") ||
		n.startsWith("girl_") ||
		n.startsWith("blonde_girl_") ||
		n.startsWith("blue-haired_woman_") ||
		n.startsWith("female_") ||
		n.startsWith("person_") ||
		n.startsWith("crouched_") ||
		n.includes("anime") ||
		n.includes("jack-o") ||
		n.startsWith("image.png") ||
		n.startsWith("image_stylized_") ||
		n.startsWith("1eb9e9f59d83203bb9c98c95b25f122d") ||
		n.startsWith("sample_3decae3aa26fd3f0f0f909e59b72145a") ||
		n.startsWith("photo_15_")
	) {
		return "anime";
	}

	// 3. Abstract
	if (
		n.startsWith("molten_liquid_gold_") ||
		n.startsWith("neon_particles_") ||
		n.startsWith("peach_and_teal_") ||
		n.startsWith("sapphire_crystal") ||
		n.startsWith("soft_iridescent_") ||
		n.startsWith("swirling_silver_") ||
		n.startsWith("translucent_") ||
		n.startsWith("pink_and_teal_") ||
		n.startsWith("abstract_") ||
		n.startsWith("blue_glass_") ||
		n.startsWith("flowing_") ||
		n.startsWith("geometric_ice_") ||
		n.startsWith("glass_shards_") ||
		n.startsWith("glowing_") ||
		n.startsWith("iridescent_") ||
		n.startsWith("layered_translucent_") ||
		n.startsWith("liquid_") ||
		n.startsWith("soft_light_trails_") ||
		n.startsWith("crystal_") ||
		n.startsWith("dark_obsidian_") ||
		n.startsWith("emerald_and_violet_") ||
		n.includes("silk")
	) {
		return "abstract";
	}

	// 4. Nature
	if (
		n.startsWith("misty_") ||
		n.startsWith("moonlit_") ||
		n.startsWith("morning_mist_") ||
		n.startsWith("northern_lights_") ||
		n.startsWith("river_flowing_") ||
		n.startsWith("sunset_over_") ||
		n.startsWith("sun_") ||
		n.startsWith("white_sand_") ||
		n.startsWith("alpine_") ||
		n.startsWith("grand_canyon_") ||
		n.startsWith("green_forest_") ||
		n.startsWith("green_summer_") ||
		n.startsWith("melting_ice_") ||
		n.startsWith("milky_way_") ||
		n.startsWith("minimalist_") ||
		n.startsWith("mist_rising_") ||
		n.startsWith("morning_park_") ||
		n.startsWith("morning_sunbeams_") ||
		n.startsWith("morning_sun_") ||
		n.startsWith("mountain_") ||
		n.startsWith("purple_horizon_") ||
		n.startsWith("red_sunset_") ||
		n.startsWith("snowy_mountain_") ||
		n.startsWith("starry_night_") ||
		n.startsWith("street_lamps_") ||
		n.startsWith("summer_field_") ||
		n.startsWith("sunbeams_") ||
		n.startsWith("train_window_") ||
		n.startsWith("vast_green_canyon_") ||
		n.startsWith("cherry_blossoms_") ||
		n.startsWith("clouds_") ||
		n.startsWith("dawn_sky_")
	) {
		return "nature";
	}

	return "abstract";
}

function getExplicitSlot(fileName) {
	const n = fileName.toLowerCase();

	// morning: dawn, sunrise, morning, dewy, sunbeams
	if (
		n.includes("dawn") ||
		n.includes("sunrise") ||
		n.includes("morning") ||
		n.includes("dewy") ||
		n.includes("sunbeams")
	) {
		return "morning";
	}

	// evening: sunset, evening, golden_hour, red_sunset, horizon, dusk, twilight
	if (
		n.includes("sunset") ||
		n.includes("evening") ||
		n.includes("golden_hour") ||
		n.includes("red_sunset") ||
		n.includes("horizon") ||
		n.includes("dusk") ||
		n.includes("twilight")
	) {
		return "evening";
	}

	// night: night, starry, moonlit, dark, neon, aurora, northern_lights, void
	if (
		n.includes("night") ||
		n.includes("starry") ||
		n.includes("moonlit") ||
		n.includes("dark") ||
		n.includes("neon") ||
		n.includes("aurora") ||
		n.includes("northern_lights") ||
		n.includes("void") ||
		n.includes("milky_way")
	) {
		return "night";
	}

	// day: day, summer, park, grass, field
	if (
		n.includes("day") ||
		n.includes("summer") ||
		n.includes("park") ||
		n.includes("grass") ||
		n.includes("field")
	) {
		return "day";
	}

	return null;
}

function sanitizeName(fileName) {
	let name = fileName.replace(/\.(jpeg|jpg|png|webp)$/i, "");
	name = name.replace(/…/g, "...");
	name = name.replace(/надпись/gi, "nadpis").replace(/тгач/gi, "tgach");
	name = name.toLowerCase();
	name = name.replace(/[^a-z0-9_.-]/g, "_");
	name = name.replace(/_+/g, "_");
	if (name.length > 41) {
		name = name.slice(0, 41);
	}
	name = name.replace(/[_.-]+$/, "");
	return name;
}

async function run() {
	console.log("=== INGEST AUTH ART PIPELINE ===");

	// 1. Read existing manifest
	if (!existsSync(MANIFEST_PATH)) {
		throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
	}
	const existingManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
	console.log(`Loaded existing manifest entries: ${existingManifest.length}`);

	// 2. Discover download files
	const allFiles = readdirSync(DOWNLOADS_DIR);
	const imageFiles = allFiles
		.filter((f) => /\.(jpeg|jpg|png|webp)$/i.test(f))
		.sort();
	console.log(`Discovered source images in Downloads: ${imageFiles.length}`);

	if (imageFiles.length === 0) {
		throw new Error("No source images found in Downloads directory!");
	}

	// 3. Plan pack and slot distribution
	const byPack = { "dental-epic": [], anime: [], abstract: [], nature: [] };
	for (const file of imageFiles) {
		const pack = classifyPack(file);
		byPack[pack].push(file);
	}

	const taskPlan = [];
	const slotsOrder = ["morning", "day", "evening", "night"];

	for (const [pack, pFiles] of Object.entries(byPack)) {
		const slotCounts = { morning: 0, day: 0, evening: 0, night: 0 };
		const unassigned = [];

		for (const file of pFiles) {
			const explicit = getExplicitSlot(file);
			if (explicit) {
				slotCounts[explicit]++;
				taskPlan.push({ file, pack, slot: explicit });
			} else {
				unassigned.push(file);
			}
		}

		// Distribute unassigned evenly to balance slots
		for (const file of unassigned) {
			let minSlot = slotsOrder[0];
			let minCount = slotCounts[minSlot];
			for (const s of slotsOrder) {
				if (slotCounts[s] < minCount) {
					minCount = slotCounts[s];
					minSlot = s;
				}
			}
			slotCounts[minSlot]++;
			taskPlan.push({ file, pack, slot: minSlot });
		}

		console.log(`Pack '${pack}' plan (${pFiles.length} items):`, JSON.stringify(slotCounts));
	}

	console.log(`Total tasks planned: ${taskPlan.length}`);

	// 4. Execution with worker pool
	const newEntries = [];
	let processedCount = 0;
	let totalAvifBytes = 0;
	let totalWebpBytes = 0;

	async function processTask(task, index) {
		const filePath = join(DOWNLOADS_DIR, task.file);
		const sourceBuffer = readFileSync(filePath);
		const hash8 = createHash("sha256").update(sourceBuffer).digest("hex").slice(0, 8);
		const baseName = sanitizeName(task.file);
		const finalName = `${baseName}-${hash8}`;

		// Inspect metadata
		const img = sharp(sourceBuffer);
		const meta = await img.metadata();

		let resizedBuffer;
		let finalWidth = meta.width;
		let finalHeight = meta.height;

		if (meta.width > MAX_WIDTH) {
			resizedBuffer = await sharp(sourceBuffer)
				.resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: "inside" })
				.toBuffer();
			const resizedMeta = await sharp(resizedBuffer).metadata();
			finalWidth = resizedMeta.width;
			finalHeight = resizedMeta.height;
		} else {
			resizedBuffer = sourceBuffer;
		}

		// AVIF
		const avifBuffer = await sharp(resizedBuffer)
			.avif({ quality: AVIF_QUALITY, effort: ENCODE_EFFORT })
			.toBuffer();

		// WebP
		const webpBuffer = await sharp(resizedBuffer)
			.webp({ quality: WEBP_QUALITY, effort: ENCODE_EFFORT })
			.toBuffer();

		// LQIP 24x14px base64 WebP
		const lqipBuffer = await sharp(resizedBuffer)
			.resize(24, 14, { fit: "fill" })
			.webp({ quality: 40 })
			.toBuffer();
		const lqip = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;

		// Dominant color
		const stats = await sharp(resizedBuffer).stats();
		const dominantColor = `#${stats.channels
			.slice(0, 3)
			.map((c) => Math.round(c.mean).toString(16).padStart(2, "0"))
			.join("")
			.toLowerCase()}`;

		// Ensure target directory exists
		const targetDir = join(AUTH_ART_DIR, task.pack, task.slot);
		mkdirSync(targetDir, { recursive: true });

		// Save files
		const avifRelative = `${task.pack}/${task.slot}/${finalName}.avif`;
		const webpRelative = `${task.pack}/${task.slot}/${finalName}.webp`;
		writeFileSync(join(AUTH_ART_DIR, avifRelative), avifBuffer);
		writeFileSync(join(AUTH_ART_DIR, webpRelative), webpBuffer);

		totalAvifBytes += avifBuffer.length;
		totalWebpBytes += webpBuffer.length;
		processedCount++;

		if (processedCount % 25 === 0 || processedCount === taskPlan.length) {
			console.log(
				`[${processedCount}/${taskPlan.length}] Processed: ${avifRelative} (AVIF: ${Math.round(
					avifBuffer.length / 1024,
				)} KB, WebP: ${Math.round(webpBuffer.length / 1024)} KB)`,
			);
		}

		return {
			pack: task.pack,
			slot: task.slot,
			avif: avifRelative,
			webp: webpRelative,
			lqip,
			dominantColor,
			width: finalWidth,
			height: finalHeight,
			avifBytes: avifBuffer.length,
			avifQuality: AVIF_QUALITY,
		};
	}

	// Process tasks with concurrency pool
	const queue = taskPlan.map((task, index) => ({ task, index }));
	const results = [];

	async function worker() {
		while (queue.length > 0) {
			const item = queue.shift();
			if (!item) break;
			const res = await processTask(item.task, item.index);
			results.push(res);
		}
	}

	const workers = Array.from({ length: CONCURRENCY }, () => worker());
	await Promise.all(workers);

	console.log(`\nCompleted processing ${results.length} images.`);

	// 5. Merge manifest
	const existingAvifSet = new Set(existingManifest.map((x) => x.avif));
	const deduplicatedNew = results.filter((x) => !existingAvifSet.has(x.avif));
	console.log(`New non-duplicate entries to append: ${deduplicatedNew.length}`);

	const mergedManifest = [...existingManifest, ...deduplicatedNew];
	console.log(`Merged total manifest entries: ${mergedManifest.length}`);

	writeFileSync(MANIFEST_PATH, `${JSON.stringify(mergedManifest, null, "\t")}\n`, "utf8");
	console.log(`Successfully updated ${MANIFEST_PATH}`);

	// 6. Summary stats
	const avgAvifKB = Math.round(totalAvifBytes / results.length / 1024);
	const avgWebpKB = Math.round(totalWebpBytes / results.length / 1024);
	const totalMB = ((totalAvifBytes + totalWebpBytes) / (1024 * 1024)).toFixed(2);

	console.log("\n=== INGESTION SUMMARY ===");
	console.log(`Total new images processed: ${results.length}`);
	console.log(`Total AVIF storage: ${(totalAvifBytes / (1024 * 1024)).toFixed(2)} MB (avg ${avgAvifKB} KB)`);
	console.log(`Total WebP storage: ${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB (avg ${avgWebpKB} KB)`);
	console.log(`Total combined storage: ${totalMB} MB`);
}

run().catch((err) => {
	console.error("FATAL ERROR in ingest pipeline:", err);
	process.exit(1);
});
