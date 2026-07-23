import { getRecentPatientHistoryFromDb } from "../apps/api/src/db/recentPatientHistoryQuery.js";
import { getCustomCrmTaskTypesFromDb } from "../apps/api/src/db/customCrmTaskTypesQuery.js";
import { getCrmEmailDispatchLogsFromDb } from "../apps/api/src/db/crmEmailDispatchLogsQuery.js";
import { getCancellationReasonsTwoLevelFromDb } from "../apps/api/src/db/cancellationReasonsTwoLevelQuery.js";
import { getAdvanceDepositTaggingsFromDb } from "../apps/api/src/db/advanceDepositTaggingsQuery.js";

async function main() {
	const org = "00000000-0000-0000-0000-000000000001";
	try {
		console.log("1:", await getRecentPatientHistoryFromDb(org));
	} catch (e) { console.error("ERR 1:", e); }

	try {
		console.log("2:", await getCustomCrmTaskTypesFromDb(org));
	} catch (e) { console.error("ERR 2:", e); }

	try {
		console.log("3:", await getCrmEmailDispatchLogsFromDb(org));
	} catch (e) { console.error("ERR 3:", e); }

	try {
		console.log("4:", await getCancellationReasonsTwoLevelFromDb(org));
	} catch (e) { console.error("ERR 4:", e); }

	try {
		console.log("5:", await getAdvanceDepositTaggingsFromDb(org));
	} catch (e) { console.error("ERR 5:", e); }
}

main();
