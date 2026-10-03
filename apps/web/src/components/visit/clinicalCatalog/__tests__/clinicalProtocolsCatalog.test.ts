import assert from "node:assert/strict";
import test from "node:test";
import {
	ALL_CLINICAL_CHUNKS_1142,
	GROUPED_CLINICAL_PROCEDURES,
	SPECIALTY_CATEGORIES_META,
	searchClinicalChunks,
	searchGroupedProcedures,
	buildProcedureVisitNotePatch,
	buildChunkVisitNotePatch,
} from "../clinicalProtocolsCatalog.js";

test("Clinical Protocols 1142 Catalog - verifies total chunks and categories", () => {
	assert.equal(ALL_CLINICAL_CHUNKS_1142.length, 1142, "Must contain exactly 1142 chunks");
	
	const totalMetaCount = SPECIALTY_CATEGORIES_META
		.filter((m) => m.key !== "all")
		.reduce((sum, m) => sum + m.count, 0);
	assert.equal(totalMetaCount, 1142, "Specialty categories must sum to 1142");

	assert.ok(GROUPED_CLINICAL_PROCEDURES.length > 50, "Grouped procedures should be created");
});

test("Clinical Protocols 1142 Catalog - search functionality", () => {
	const cariesResults = searchClinicalChunks("кариес");
	assert.ok(cariesResults.length > 10, "Should find multiple caries chunks");

	const surgeryResults = searchClinicalChunks("имплантация", "surgery");
	assert.ok(surgeryResults.length > 0, "Should find surgery implantation chunks");

	const groupedTherapy = searchGroupedProcedures("кариес дентина", "therapy");
	assert.ok(groupedTherapy.length > 0, "Should find grouped procedure for caries dentina");
	
	const procedure = groupedTherapy[0];
	assert.ok(procedure, "Procedure must exist");
	assert.ok(procedure.treatment?.text || procedure.fullTemplate?.text, "Procedure should have treatment");
});

test("Clinical Protocols 1142 Catalog - buildProcedureVisitNotePatch 1-click", () => {
	const procedure = GROUPED_CLINICAL_PROCEDURES.find((p) =>
		p.procedureName.toLowerCase().includes("кариес дентина"),
	);
	assert.ok(procedure, "Caries dentina procedure must exist");

	const patch = buildProcedureVisitNotePatch(procedure, {}, 16);
	assert.ok(patch.complaint, "Should have complaints");
	assert.ok(patch.treatmentPlan, "Should have treatment plan");
	assert.ok(patch.diagnosis, "Should have diagnosis");
	assert.match(patch.diagnosis!, /K02\.1/, "Diagnosis should match K02.1");
});

test("Clinical Protocols 1142 Catalog - buildChunkVisitNotePatch for individual chunk", () => {
	const complaintsChunk = ALL_CLINICAL_CHUNKS_1142.find(
		(c) => c.chunkType === "complaints",
	);
	assert.ok(complaintsChunk, "Complaints chunk must exist");

	const patch = buildChunkVisitNotePatch(complaintsChunk, { complaint: "Старая жалоба" });
	assert.ok(patch.complaint?.includes("Старая жалоба"), "Should keep existing complaints");
	assert.ok(patch.complaint?.includes(complaintsChunk.text), "Should append new complaints");
});
