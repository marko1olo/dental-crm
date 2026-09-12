import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	validateMediaClassification,
	assertValidMediaClassification,
	isMediaSubtypeValid,
	getAvailableSubtypes,
	pairPhotos,
	unpairPhoto,
	findPairCandidates,
	filterPairedPhotos,
	clinicalPhotoMetadataSchema,
	clinicalPhotoRecordSchema,
	photoPairInputSchema,
	beforeAfterComparisonPairSchema,
	MEDIA_KINDS,
	MEDIA_CATEGORIES,
	MEDIA_SUBTYPES,
	MEDIA_SUBTYPE_LABELS_RU,
	type ClinicalPhotoRecord,
	type MinimalPhotoItem,
} from "../photoProtocol.js";

describe("Clinical Photo Protocol & Media Taxonomy (DentalPin Adapter)", () => {
	describe("Taxonomy & Classification Validation", () => {
		it("validates legitimate intraoral photos", () => {
			const res1 = validateMediaClassification("photo", "intraoral", "frontal");
			assert.equal(res1.valid, true);

			const res2 = validateMediaClassification("photo", "intraoral", "occlusal_upper");
			assert.equal(res2.valid, true);

			const res3 = validateMediaClassification("photo", "intraoral", "lateral_left_45");
			assert.equal(res3.valid, true);

			const res4 = validateMediaClassification("photo", "intraoral", "enamel_macro");
			assert.equal(res4.valid, true);
		});

		it("validates legitimate extraoral / portrait photos", () => {
			const res1 = validateMediaClassification("photo", "extraoral", "smile");
			assert.equal(res1.valid, true);

			const res2 = validateMediaClassification("photo", "extraoral", "rest");
			assert.equal(res2.valid, true);

			const res3 = validateMediaClassification("photo", "extraoral", "profile_right");
			assert.equal(res3.valid, true);
		});

		it("validates legitimate xray examinations", () => {
			const res1 = validateMediaClassification("xray", "xray", "cbct");
			assert.equal(res1.valid, true);

			const res2 = validateMediaClassification("xray", null, "periapical");
			assert.equal(res2.valid, true);

			const res3 = validateMediaClassification("xray", "xray", "panoramic");
			assert.equal(res3.valid, true);
		});

		it("allows document / scan / video with empty category and subtype", () => {
			const docRes = validateMediaClassification("document", null, null);
			assert.equal(docRes.valid, true);

			const scanRes = validateMediaClassification("scan", undefined, undefined);
			assert.equal(scanRes.valid, true);

			const videoRes = validateMediaClassification("video", null, null);
			assert.equal(videoRes.valid, true);
		});

		it("rejects document carrying category or subtype", () => {
			const res = validateMediaClassification("document", "intraoral", "frontal");
			assert.equal(res.valid, false);
			assert.match(res.error ?? "", /категория и подтип должны быть пустыми/);
		});

		it("rejects photo missing category", () => {
			const res = validateMediaClassification("photo", null, null);
			assert.equal(res.valid, false);
			assert.match(res.error ?? "", /требует указания media_category/);
		});

		it("rejects photo using xray category instead of media_kind xray", () => {
			const res = validateMediaClassification("photo", "xray", "panoramic");
			assert.equal(res.valid, false);
			assert.match(res.error ?? "", /Используйте media_kind='xray'/);
		});

		it("rejects invalid media_kind", () => {
			const res = validateMediaClassification("unknown_kind", "intraoral", "frontal");
			assert.equal(res.valid, false);
			assert.match(res.error ?? "", /Недопустимый media_kind/);
		});

		it("rejects subtype from wrong category", () => {
			// 'smile' belongs to extraoral, not intraoral
			const res = validateMediaClassification("photo", "intraoral", "smile");
			assert.equal(res.valid, false);
			assert.match(res.error ?? "", /Недопустимый media_subtype/);
		});

		it("assertValidMediaClassification throws on invalid input and succeeds on valid", () => {
			assert.doesNotThrow(() => {
				assertValidMediaClassification("photo", "intraoral", "frontal");
			});

			assert.throws(
				() => {
					assertValidMediaClassification("invalid_kind");
				},
				{ message: /Недопустимый media_kind/ },
			);
		});

		it("isMediaSubtypeValid correctly identifies subtype category membership", () => {
			assert.equal(isMediaSubtypeValid("intraoral", "frontal"), true);
			assert.equal(isMediaSubtypeValid("intraoral", "occlusal_lower"), true);
			assert.equal(isMediaSubtypeValid("intraoral", "smile"), false);
			assert.equal(isMediaSubtypeValid("extraoral", "smile"), true);
			assert.equal(isMediaSubtypeValid("extraoral", "cbct"), false);
			assert.equal(isMediaSubtypeValid("xray", "cbct"), true);
		});

		it("getAvailableSubtypes returns array of options with Russian labels", () => {
			const intraoralList = getAvailableSubtypes("intraoral");
			assert.ok(intraoralList.length >= 8);
			const frontal = intraoralList.find((item) => item.id === "frontal");
			assert.ok(frontal);
			assert.equal(frontal.labelRu, "Фронтальная с ретрактором (окклюзия)");

			const xrayList = getAvailableSubtypes("xray");
			assert.ok(xrayList.length >= 5);
			const cbct = xrayList.find((item) => item.id === "cbct");
			assert.ok(cbct);
			assert.equal(cbct.labelRu, "КЛКТ 3D томография");
		});
	});

	describe("Zod Schemas Validation", () => {
		it("validates clinicalPhotoMetadataSchema with defaults", () => {
			const parsed = clinicalPhotoMetadataSchema.parse({
				title: "Фронтальный снимок до лечения",
				media_category: "intraoral",
				media_subtype: "frontal",
			});

			assert.equal(parsed.media_kind, "photo");
			assert.equal(parsed.stage, "before");
			assert.deepEqual(parsed.tags, []);
			assert.equal(parsed.rotation_degrees, 0);
			assert.equal(parsed.flip_horizontal, false);
			assert.equal(parsed.title, "Фронтальный снимок до лечения");
		});

		it("validates clinicalPhotoRecordSchema", () => {
			const record = clinicalPhotoRecordSchema.parse({
				id: "doc-uuid-12345",
				image_url: "https://clinic.dente.ru/photos/pat1_before.webp",
				media_kind: "photo",
				media_category: "intraoral",
				media_subtype: "frontal",
				stage: "before",
				paired_document_id: "doc-uuid-67890",
				paired_photo_id: "doc-uuid-67890",
				detected_vita_shade: "A3",
			});

			assert.equal(record.id, "doc-uuid-12345");
			assert.equal(record.paired_document_id, "doc-uuid-67890");
			assert.equal(record.detected_vita_shade, "A3");
		});

		it("validates photoPairInputSchema", () => {
			const input = photoPairInputSchema.parse({
				photo_id_a: "uuid-1",
				photo_id_b: "uuid-2",
				projection: "frontal",
			});
			assert.equal(input.photo_id_a, "uuid-1");
			assert.equal(input.photo_id_b, "uuid-2");
		});

		it("validates beforeAfterComparisonPairSchema", () => {
			const pair = beforeAfterComparisonPairSchema.parse({
				id: "pair-1",
				projection_key: "frontal",
				projection_label_ru: "Фронтальная окклюзия",
				before_photo: {
					id: "photo-before-1",
					image_url: "https://clinic.dente.ru/before.webp",
					media_kind: "photo",
					media_category: "intraoral",
					media_subtype: "frontal",
					stage: "before",
					tags: [],
				},
				after_photo: {
					id: "photo-after-1",
					image_url: "https://clinic.dente.ru/after.webp",
					media_kind: "photo",
					media_category: "intraoral",
					media_subtype: "frontal",
					stage: "after",
					tags: [],
				},
				stage_before: "before",
				stage_after: "after",
				is_complete: true,
			});

			assert.equal(pair.is_complete, true);
			assert.equal(pair.before_photo?.stage, "before");
			assert.equal(pair.after_photo?.stage, "after");
		});
	});

	describe("Paired Before / After Photo Helpers", () => {
		const photo1: MinimalPhotoItem = {
			id: "photo-01",
			title: "До лечения",
			media_kind: "photo",
			media_category: "intraoral",
			media_subtype: "frontal",
			stage: "before",
		};

		const photo2: MinimalPhotoItem = {
			id: "photo-02",
			title: "После лечения",
			media_kind: "photo",
			media_category: "intraoral",
			media_subtype: "frontal",
			stage: "after",
		};

		const photo3: MinimalPhotoItem = {
			id: "photo-03",
			title: "ОПТГ до",
			media_kind: "xray",
			media_category: "xray",
			media_subtype: "panoramic",
			stage: "before",
		};

		it("pairPhotos mutually links two photos with reciprocal IDs", () => {
			const { before, after } = pairPhotos(photo1, photo2);

			assert.equal(before.paired_document_id, photo2.id);
			assert.equal(before.paired_photo_id, photo2.id);
			assert.equal(before.stage, "before");

			assert.equal(after.paired_document_id, photo1.id);
			assert.equal(after.paired_photo_id, photo1.id);
			assert.equal(after.stage, "after");
		});

		it("unpairPhoto unlinks photo and its partner across collection", () => {
			const { before, after } = pairPhotos(photo1, photo2);
			const collection = [before, after, photo3];

			const unlinked = unpairPhoto(before.id, collection);
			const unlinkedBefore = unlinked.find((p) => p.id === before.id);
			const unlinkedAfter = unlinked.find((p) => p.id === after.id);

			assert.equal(unlinkedBefore?.paired_document_id, null);
			assert.equal(unlinkedBefore?.paired_photo_id, null);
			assert.equal(unlinkedAfter?.paired_document_id, null);
			assert.equal(unlinkedAfter?.paired_photo_id, null);
		});

		it("findPairCandidates finds eligible unpaired photos", () => {
			const { before, after } = pairPhotos(photo1, photo2);
			const unpairedPhoto4: MinimalPhotoItem = {
				id: "photo-04",
				media_kind: "photo",
				media_category: "intraoral",
				media_subtype: "frontal",
				stage: "after",
			};

			const list = [before, after, photo3, unpairedPhoto4];
			const candidates = findPairCandidates(photo3, list);

			assert.ok(candidates.some((c) => c.id === "photo-04"));
			assert.ok(!candidates.some((c) => c.id === "photo-01")); // already paired
			assert.ok(!candidates.some((c) => c.id === "photo-02")); // already paired
			assert.ok(!candidates.some((c) => c.id === "photo-03")); // cannot pair with self
		});

		it("filterPairedPhotos extracts deduplicated before/after couples with projection label", () => {
			const { before, after } = pairPhotos(photo1, photo2);
			const list = [before, after, photo3];

			const pairs = filterPairedPhotos(list);
			assert.equal(pairs.length, 1);
			const firstPair = pairs[0];
			assert.ok(firstPair);
			assert.equal(firstPair.before.id, "photo-01");
			assert.equal(firstPair.after.id, "photo-02");
			assert.equal(firstPair.projectionKey, "frontal");
			assert.equal(firstPair.projectionLabelRu, "Фронтальная с ретрактором (окклюзия)");
		});
	});
});
