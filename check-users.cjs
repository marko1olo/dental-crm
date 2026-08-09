const { db } = require("./apps/api/dist/db/client.js");
const { users } = require("./apps/api/dist/db/schema.js");

async function check() {
	const allUsers = await db.select().from(users);
	console.log("Users:", allUsers);
	process.exit(0);
}
check().catch(console.error);
