import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	PatientPhotoProtocolService,
	MANDATORY_PHOTO_VIEWS,
	type PhotoViewType,
} from "./PatientPhotoProtocolService.js";

describe("PatientPhotoProtocolService — Feature #286 12-Frame Dental Photo Protocol", () => {
	test("1. Returns 100% completeness when all 12 mandatory views are present", () => {
		const result = PatientPhotoProtocolService.validateProtocol([...MANDATORY_PHOTO_VIEWS]);
		assert.equal(result.isFullyComplete, true);
		assert.equal(result.completenessPercentage, 100.0);
		assert.equal(result.missingViews.length, 0);
	});

	test("2. Detects missing occlusal mirror shots and calculates partial completeness", () => {
		const partialViews: PhotoViewType[] = [
			"face_rest",
			"face_smile",
			"profile_90",
			"intraoral_frontal_occlusion",
			"intraoral_right_occlusion",
			"intraoral_left_occlusion",
			"smile_45_right",
			"smile_45_left",
			"overjet_12_oclock",
		]; // 9 out of 12 (missing maxillary_occlusal, mandibular_occlusal, rest_lip_line)

		const result = PatientPhotoProtocolService.validateProtocol(partialViews);
		assert.equal(result.isFullyComplete, false);
		assert.equal(result.presentCount, 9);
		assert.equal(result.completenessPercentage, 75.0);
		assert.equal(result.missingViews.length, 3);
		assert.ok(result.missingViews.includes("maxillary_occlusal"));
	});
});