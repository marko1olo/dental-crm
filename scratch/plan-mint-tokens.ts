/**
 * Свежие токены входа для снимка картотеки. НИ ОДНОЙ ЗАПИСИ В БАЗУ.
 *
 * ЗАЧЕМ. .ops-shot-tokens.json выдан 28.07 в 19:07, а срок жизни токена —
 * 3600 с (apps/api/src/scripts/seedOpsScreenshotDemo.ts:502-507). К прогону
 * снимков в 00:46 он был просрочен почти на пять часов, и приложение зависало на
 * заглушке «Загрузка рабочей смены» — без единого слова об отказе. Пересевать
 * демо-организацию нельзя: это запись в общую живую базу без согласования.
 * Организация d0000000-…-d001 уже есть (проверено запросом: 14 пациентов),
 * поэтому нужна только подпись — чистая криптография над существующими строками.
 *
 * Токены печатаются в stdout и нигде не сохраняются: вызывающий сценарий держит
 * их в памяти процесса.
 */
import { authTokenSecret } from "../apps/api/src/security/authSecret.js";
import { signToken } from "../apps/api/src/utils/cryptoHelper.js";

const ORG_ID = "d0000000-0000-4000-8000-00000000d001";
const ADMIN_USER = "d0000000-0000-4000-8000-00000000d007";
const TTL_SECONDS = 3600;

const secret = authTokenSecret();
const clinicToken = signToken(
	{ organizationId: ORG_ID, clinicName: "Демо-клиника для снимков" },
	secret,
	TTL_SECONDS,
);
const staffToken = signToken(
	{
		userId: ADMIN_USER,
		fullName: "Администратор клиники",
		role: "administrator",
		organizationId: ORG_ID,
	},
	secret,
	TTL_SECONDS,
);

process.stdout.write(JSON.stringify({ organizationId: ORG_ID, clinicToken, staffToken }));
