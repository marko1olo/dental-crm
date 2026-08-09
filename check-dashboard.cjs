const { getDashboardFromDb } = require("./apps/api/dist/db/dashboardQuery.js");

async function check() {
	const orgId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
	try {
		const dashboard = await getDashboardFromDb(orgId);
		console.log("Success");
	} catch (err) {
		console.error("Dashboard error:", err);
	}
	process.exit(0);
}
check().catch(console.error);
