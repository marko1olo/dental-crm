import * as dotenv from "dotenv";

dotenv.config();

import { TOKEN_SECRET } from "../apps/api/src/routes/auth.js";
import { signToken } from "../apps/api/src/utils/cryptoHelper.js";

const DEMO_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const DEMO_CLINIC_NAME = "Демонстрационная клиника";
const DEMO_STAFF_ID = "8356141b-7cfa-4221-95f7-70f47e7344b1"; // doctor
const DEMO_STAFF_ROLE = "doctor";

const clinicToken = signToken(
	{ organizationId: DEMO_ORG_ID, clinicName: DEMO_CLINIC_NAME },
	TOKEN_SECRET(),
	60 * 60 * 24,
);

const staffToken = signToken(
	{ userId: DEMO_STAFF_ID, role: DEMO_STAFF_ROLE, organizationId: DEMO_ORG_ID },
	TOKEN_SECRET(),
	60 * 60 * 12,
);

console.log("CLINIC_TOKEN=" + clinicToken);
console.log("STAFF_TOKEN=" + staffToken);
