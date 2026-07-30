/**
 * Свежие токены для замера вёрстки картотеки в headless-браузере.
 *
 * Ничего не пишет в базу: только подписывает пару токенов для УЖЕ существующей
 * демо-организации (её создал src/scripts/seedOpsScreenshotDemo.ts, повторно
 * гонять посев не нужно и не моя зона). Прежний .ops-shot-tokens.json живёт час
 * и к моменту замера истёк — просроченный токен даёт экран входа, а снимок
 * экрана входа под именем картотеки был бы ложным доказательством.
 *
 * ЗАПУСК (cwd apps/api — оттуда поднимается DATABASE_URL и секрет подписи):
 *   cd apps/api && node --import tsx ../../scratch/recon-sign-shot-tokens.ts > ../../.ops-shot-tokens.json
 *
 * Сам секрет в вывод не попадает — только подпись.
 */

import { authTokenSecret } from "../apps/api/src/security/authSecret.js";
import { signToken } from "../apps/api/src/utils/cryptoHelper.js";

const ORG_ID = "d0000000-0000-4000-8000-00000000d001";
const STAFF_ID = "d0000000-0000-4000-8000-00000000d007";
const TTL_SECONDS = 3600;

const secret = authTokenSecret();
const clinicToken = signToken(
	{ organizationId: ORG_ID, clinicName: "Демо-клиника для снимков" },
	secret,
	TTL_SECONDS,
);
const staffToken = signToken(
	{
		userId: STAFF_ID,
		fullName: "Администратор клиники",
		role: "administrator",
		organizationId: ORG_ID,
	},
	secret,
	TTL_SECONDS,
);

console.log(JSON.stringify({ organizationId: ORG_ID, clinicToken, staffToken }));
