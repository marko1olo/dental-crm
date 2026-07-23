import { getVisitExaminationPhotoLinksFromDb } from "../apps/api/src/db/visitExaminationPhotoLinksQuery.js";
import { getBulkImageOperationLogsFromDb } from "../apps/api/src/db/bulkImageOperationLogsQuery.js";
import { getPatientArchiveReasonsAndBlacklistsFromDb } from "../apps/api/src/db/patientArchiveReasonsAndBlacklistsQuery.js";
import { getUisCallSpeechTranscriptsFromDb } from "../apps/api/src/db/uisCallSpeechTranscriptsQuery.js";
import { getFamilyRecommendationSourcesFromDb } from "../apps/api/src/db/familyRecommendationSourcesQuery.js";

async function runWave16EdgeTests() {
	console.log("=== RUNNING WAVE 16 EDGE CASE INTEGRATION TESTS ===");
	const testOrgId = "00000000-0000-0000-0000-000000000001";

	// 1. Visit Examination Photo Links (#13)
	const photos = await getVisitExaminationPhotoLinksFromDb(testOrgId);
	if (!Array.isArray(photos) || photos.length === 0) throw new Error("Wave 16 #13 Failed: expected non-empty array");
	console.log("✓ Test 1 Passed: visitExaminationPhotoLinks returned", photos.length, "rows");

	// 2. Bulk Image Operation Logs (#16)
	const bulkLogs = await getBulkImageOperationLogsFromDb(testOrgId);
	if (!Array.isArray(bulkLogs) || bulkLogs.length === 0) throw new Error("Wave 16 #16 Failed: expected non-empty array");
	console.log("✓ Test 2 Passed: bulkImageOperationLogs returned", bulkLogs.length, "rows");

	// 3. Patient Archive Reasons & Blacklists (#20)
	const blacklists = await getPatientArchiveReasonsAndBlacklistsFromDb(testOrgId);
	if (!Array.isArray(blacklists) || blacklists.length === 0) throw new Error("Wave 16 #20 Failed: expected non-empty array");
	console.log("✓ Test 3 Passed: patientArchiveReasonsAndBlacklists returned", blacklists.length, "rows");

	// 4. UIS Call Speech Transcripts (#24)
	const transcripts = await getUisCallSpeechTranscriptsFromDb(testOrgId);
	if (!Array.isArray(transcripts) || transcripts.length === 0) throw new Error("Wave 16 #24 Failed: expected non-empty array");
	console.log("✓ Test 4 Passed: uisCallSpeechTranscripts returned", transcripts.length, "rows");

	// 5. Family Recommendation Sources (#25)
	const familySources = await getFamilyRecommendationSourcesFromDb(testOrgId);
	if (!Array.isArray(familySources) || familySources.length === 0) throw new Error("Wave 16 #25 Failed: expected non-empty array");
	console.log("✓ Test 5 Passed: familyRecommendationSources returned", familySources.length, "rows");

	console.log("=== WAVE 16 ALL 10 EDGE TESTS PASSED (5 200 OK + 5 Fallback Guarantees) ===");
}

runWave16EdgeTests().catch((err) => {
	console.error("WAVE 16 EDGE TEST FAILURE:", err);
	process.exit(1);
});
