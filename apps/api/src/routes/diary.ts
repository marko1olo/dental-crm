import crypto from "crypto";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; [key: string]: any };
	}
}

import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	clinicalAuditLogs,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentItems,
	sterilizationLogs,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../db/schema.js";
import { clinicNotIdentifiedMessage } from "../utils/clinicSessionRefusal.js";
import { verifyCredential } from "../utils/cryptoHelper.js";

/**
 * Р”РќР•Р’РќРРљ РџР РРЃРњРђ РћРўРљРђР—Р«Р’РђР› РљРћР”РћРњ, Рђ РќР• РџР РР§РРќРћР™.
 *
 * Р§РўРћ Р‘Р«Р›Рћ. Р”РѕРєР°Р·Р°РЅРѕ Р·Р°РїСЂРѕСЃРѕРј РІ РїСЂРѕС†РµСЃСЃРµ (`app.inject`, РЅРµ РґРµРІ-СЃРµСЂРІРµСЂ): С‡С‚РµРЅРёРµ
 * РґРЅРµРІРЅРёРєР°, С‡С‚РµРЅРёРµ РёСЃС‚РѕСЂРёРё РїСЂР°РІРѕРє, СЃРѕС…СЂР°РЅРµРЅРёРµ РґРЅРµРІРЅРёРєР° Рё РµРіРѕ РёСЃРїСЂР°РІР»РµРЅРёРµ
 * РѕС‚РІРµС‡Р°Р»Рё С‚РµР»РѕРј `{"error":"OrgRequired"}` вЂ” Р±РµР· РїРѕР»СЏ `message`. РџСЏС‚Р°СЏ РІРµС‚РєР°, РІ
 * РїРѕРґРїРёСЃР°РЅРёРё (`/lock`), С‚РµРєСЃС‚ РёРјРµР»Р°, РЅРѕ РЎР’РћР™, С‚СЂРµС‚СЊРµР№ РєРѕРїРёРµР№ С‚РѕР№ Р¶Рµ С„СЂР°Р·С‹ РІ
 * РґРµСЂРµРІРµ.
 *
 * Р§Р•Рњ Р­РўРћ РџР›РћРҐРћ Р”Р›РЇ РљР›РРќРРљР. Р–РёРІРѕР№ РєР»РёРµРЅС‚ РїРѕРґРїРёСЃР°РЅРёСЏ
 * (`apps/web/src/components/useVisitDiaryLogic.ts:530-540`) РїРµС‡Р°С‚Р°РµС‚ РїРѕР»Рµ
 * `message` С‚РѕСЃС‚РѕРј Р”РћРЎР›РћР’РќРћ, Р° Р±РµР· РЅРµРіРѕ СЃС‚СЂРѕРёС‚ РїРѕРґСЃРєР°Р·РєСѓ РїРѕ РєРѕРґСѓ РѕС‚РІРµС‚Р°. Р”Р»СЏ 403
 * СЌС‚Рѕ В«РІРѕР№РґРёС‚Рµ РІ СЃРјРµРЅСѓ Р·Р°РЅРѕРІРѕ РёР»Рё РїРѕРїСЂРѕСЃРёС‚Рµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РѕС‚РєСЂС‹С‚СЊ РґРѕСЃС‚СѓРїВ» вЂ”
 * Р»РѕР¶РЅРѕРµ СѓРєР°Р·Р°РЅРёРµ: СЃРјРµРЅР° С‚СѓС‚ РЅРµ РїСЂРё С‡С‘Рј, РЅРµ РѕРїСЂРµРґРµР»С‘РЅ РєР°Р±РёРЅРµС‚ РєР»РёРЅРёРєРё. Р”РЅРµРІРЅРёРє
 * РїСЂРёС‘РјР° вЂ” СЋСЂРёРґРёС‡РµСЃРєРёР№ РґРѕРєСѓРјРµРЅС‚, Рё РІСЂР°С‡, РЅРµ РїРѕРЅСЏРІС€РёР№ РѕС‚РєР°Р·, Р»РёР±Рѕ С‚РµСЂСЏРµС‚
 * РЅР°Р±СЂР°РЅРЅС‹Р№ С‚РµРєСЃС‚, Р»РёР±Рѕ РїРµСЂРµРїРёСЃС‹РІР°РµС‚ РµРіРѕ РІРѕ РІС‚РѕСЂРѕР№ Р·Р°РїРёСЃРё.
 *
 * Р§Р•Р“Рћ РЎР•Р Р’Р•Р  РќР• Р—РќРђР•Рў, РўРћР“Рћ Р РќР• РЈРўР’Р•Р Р–Р”РђР•Рў. `resolveOrganizationId` РІРѕР·РІСЂР°С‰Р°РµС‚
 * null Рё РєРѕРіРґР° С‚РѕРєРµРЅР° РєР°Р±РёРЅРµС‚Р° РЅРµС‚, Рё РєРѕРіРґР° `verifyToken` РµРіРѕ РѕС‚РІРµСЂРі
 * (`security/identity.ts`): СЂР°Р·Р»РёС‡РёС‚СЊ СЌС‚Рё РґРІР° СЃРѕСЃС‚РѕСЏРЅРёСЏ Р·РґРµСЃСЊ РЅРµС‡РµРј. РџРѕСЌС‚РѕРјСѓ
 * С‚РµРєСЃС‚ РЅР°Р·С‹РІР°РµС‚ РѕР±Рµ РІРѕР·РјРѕР¶РЅС‹Рµ РїСЂРёС‡РёРЅС‹ Рё РѕРґРЅРѕ РґРµР№СЃС‚РІРёРµ, РєРѕС‚РѕСЂРѕРµ Р»РµС‡РёС‚ Р»СЋР±СѓСЋ.
 *
 * РљРѕРґС‹ РѕС‚РІРµС‚Р° Рё Р·РЅР°С‡РµРЅРёСЏ РїРѕР»СЏ `error` СЃРѕС…СЂР°РЅРµРЅС‹ РґРѕСЃР»РѕРІРЅРѕ. РўРµРєСЃС‚ Р¶РёРІС‘С‚ РІ РѕР±С‰РµРј
 * РґРѕРјРµ `utils/clinicSessionRefusal.ts`, С‡С‚РѕР±С‹ С‡РµС‚РІС‘СЂС‚РѕР№ РєРѕРїРёРё РЅРµ РїРѕСЏРІРёР»РѕСЃСЊ.
 */
const DIARY_CLINIC_UNKNOWN_READ_MESSAGE = clinicNotIdentifiedMessage(
	"РґРЅРµРІРЅРёРє РїСЂРёС‘РјР° РЅРµ РѕС‚РєСЂС‹С‚СЊ",
);
const DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE = clinicNotIdentifiedMessage(
	"РёСЃС‚РѕСЂРёСЋ РїСЂР°РІРѕРє РґРЅРµРІРЅРёРєР° РЅРµ РїРѕРєР°Р·Р°С‚СЊ",
);
const DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE = clinicNotIdentifiedMessage(
	"РґРЅРµРІРЅРёРє РїСЂРёС‘РјР° РЅРµ СЃРѕС…СЂР°РЅРёС‚СЊ",
	"РЅР°Р±СЂР°РЅРЅС‹Р№ С‚РµРєСЃС‚ РѕСЃС‚Р°С‘С‚СЃСЏ РЅР° СЌРєСЂР°РЅРµ, РЅРµ Р·Р°РєСЂС‹РІР°Р№С‚Рµ РїСЂРёС‘Рј",
);
const DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE = clinicNotIdentifiedMessage(
	"РїРѕРґРїРёСЃР°С‚СЊ РґРЅРµРІРЅРёРє РЅРµР»СЊР·СЏ",
	"РЅР°Р±СЂР°РЅРЅС‹Р№ С‚РµРєСЃС‚ РѕСЃС‚Р°С‘С‚СЃСЏ РЅР° СЌРєСЂР°РЅРµ",
);
const DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE = clinicNotIdentifiedMessage(
	"РёСЃРїСЂР°РІРёС‚СЊ РїРѕРґРїРёСЃР°РЅРЅС‹Р№ РґРЅРµРІРЅРёРє РЅРµР»СЊР·СЏ",
);

/**
 * В«Р”РЅРµРІРЅРёРєР° РЅРµС‚В» РЅР° С‡С‚РµРЅРёРё РёСЃС‚РѕСЂРёРё Рё РЅР° РёСЃРїСЂР°РІР»РµРЅРёРё. РџСЂРёС‡РёРЅР° Сѓ СЃРµСЂРІРµСЂР°
 * СѓСЃС‚Р°РЅРѕРІР»РµРЅР° С‚РѕС‡РЅРѕ: СЃС‚СЂРѕРєРё СЃ С‚Р°РєРёРј РЅРѕРјРµСЂРѕРј РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ РЅРµ СЃСѓС‰РµСЃС‚РІСѓРµС‚.
 * Р”РµР№СЃС‚РІРёРµ РЅР°Р·РІР°РЅРѕ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ РѕРЅРѕ РµСЃС‚СЊ Рё РѕРЅРѕ РѕРґРЅРѕ вЂ” РѕС‚РєСЂС‹С‚СЊ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ;
 * РїСЂРµР¶РЅРёР№ РіРѕР»С‹Р№ 404 РєР»РёРµРЅС‚ РїСЂРµРІСЂР°С‰Р°Р» РІ В«РїСЂРѕРіСЂР°РјРјР° РєР»РёРЅРёРєРё РѕР±РЅРѕРІР»РµРЅР° РЅРµ
 * РїРѕР»РЅРѕСЃС‚СЊСЋ, СЃРѕРѕР±С‰РёС‚Рµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂСѓВ», С‚Рѕ РµСЃС‚СЊ РѕС‚РїСЂР°РІР»СЏР» РІСЂР°С‡Р° РЅРµ С‚СѓРґР°.
 */
const DIARY_NOT_FOUND_REVISIONS_MESSAGE =
	"Р”РЅРµРІРЅРёРє СЌС‚РѕРіРѕ РїСЂРёС‘РјР° РЅРµ РЅР°Р№РґРµРЅ РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ, РїРѕСЌС‚РѕРјСѓ РёСЃС‚РѕСЂРёРё РїСЂР°РІРѕРє Сѓ РЅРµРіРѕ РЅРµС‚. РўР°Рє Р±С‹РІР°РµС‚, РµСЃР»Рё СЃС‚СЂР°РЅРёС†Р° РїСЂРёС‘РјР° РѕС‚РєСЂС‹С‚Р° РґР°РІРЅРѕ Рё РґРЅРµРІРЅРёРє СЃ С‚РµС… РїРѕСЂ СѓРґР°Р»С‘РЅ РёР»Рё Р·Р°РІРµРґС‘РЅ Р·Р°РЅРѕРІРѕ. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ Рё РїРѕСЃРјРѕС‚СЂРёС‚Рµ РёСЃС‚РѕСЂРёСЋ РµС‰С‘ СЂР°Р·.";
const DIARY_NOT_FOUND_REVISE_MESSAGE =
	"Р”РЅРµРІРЅРёРє СЌС‚РѕРіРѕ РїСЂРёС‘РјР° РЅРµ РЅР°Р№РґРµРЅ РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ, РёСЃРїСЂР°РІР»СЏС‚СЊ РЅРµС‡РµРіРѕ. РўР°Рє Р±С‹РІР°РµС‚, РµСЃР»Рё СЃС‚СЂР°РЅРёС†Р° РїСЂРёС‘РјР° РѕС‚РєСЂС‹С‚Р° РґР°РІРЅРѕ Рё РґРЅРµРІРЅРёРє СЃ С‚РµС… РїРѕСЂ СѓРґР°Р»С‘РЅ РёР»Рё Р·Р°РІРµРґС‘РЅ Р·Р°РЅРѕРІРѕ. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ Рё РїРѕРІС‚РѕСЂРёС‚Рµ РёСЃРїСЂР°РІР»РµРЅРёРµ.";

const diaryUpsertSchema = z.object({
	visitId: z.string().uuid(),
	patientId: z.string().uuid(),
	anamnesis: z.string().optional(),
	statusLocalis: z.string().optional(),
	diagnosisIcd10: z.string().optional(),
	diagnosisTooth: z.string().optional(),
	treatmentDescription: z.string().optional(),
	complications: z.string().optional(),
	comorbidities: z.string().optional(),
	organizationId: z.string().uuid().optional(),
	status: z.enum(["draft", "signed"]).optional(),
	instrumentTrayBarcode: z.string().optional(),
	/**
	 * РЈРљР­Рџ РІСЂР°С‡Р°. Р Р°РЅСЊС€Рµ РїРѕР»Рµ РїСЂРёРЅРёРјР°Р» С‚РѕР»СЊРєРѕ РјР°СЂС€СЂСѓС‚ /lock, РїРѕСЌС‚РѕРјСѓ РїРѕРґРїРёСЃСЊ
	 * С‡РµСЂРµР· POST С„РёР·РёС‡РµСЃРєРё РЅРµ РјРѕРіР»Р° СЃРѕС…СЂР°РЅРёС‚СЊ РѕС‚С‚РёСЃРє РІ crypto_signature_pkcs7:
	 * РґРЅРµРІРЅРёРє РїРѕРјРµС‡Р°Р»СЃСЏ РїРѕРґРїРёСЃР°РЅРЅС‹Рј Р±РµР· СЃР°РјРѕР№ РїРѕРґРїРёСЃРё.
	 */
	pkcs7Signature: z.string().optional(),
});

/**
 * POST /api/diaries/:id/lock Рё /revise: С‚РµР»Р° СЂР°РЅСЊС€Рµ вЂ” bare cast.
 * Zod safeParse РїРѕСЃР»Рµ requireClinicalMutationAccess (+ role/org gates РіРґРµ РѕРЅРё
 * СЃС‚РѕСЏС‚ СЂР°РЅСЊС€Рµ С‡С‚РµРЅРёСЏ РїРѕР»РµР№) в†’ 400 РїСЂРё non-object; РїРѕР»СЏ РѕСЃС‚Р°СЋС‚СЃСЏ optional.
 */
const diaryLockBodySchema = z.object({
	pkcs7Signature: z.unknown().optional(),
});

const diaryReviseBodySchema = z.object({
	anamnesis: z.unknown().optional(),
	statusLocalis: z.unknown().optional(),
	diagnosisIcd10: z.unknown().optional(),
	diagnosisTooth: z.unknown().optional(),
	treatmentDescription: z.unknown().optional(),
	/*
	 * complications / comorbidities вЂ” РїРѕР»СЏ visit_diaries Рё UI 043/Сѓ.
	 * Р‘Р«Р›Рћ: СЃС…РµРјР° revise РёС… РЅРµ РїСЂРёРЅРёРјР°Р»Р°, handler РЅРµ РїРёСЃР°Р». РђРґРјРёРЅ РїСЂР°РІРёР»
	 * В«РћСЃР»РѕР¶РЅРµРЅРёСЏВ»/В«РЎРѕРїСѓС‚СЃС‚РІСѓСЋС‰РёРµВ» вЂ” РїРѕСЃР»Рµ СЃРѕС…СЂР°РЅРµРЅРёСЏ РѕСЃС‚Р°РІР°Р»СЃСЏ СЃС‚Р°СЂС‹Р№
	 * С‚РµРєСЃС‚; РІ РїРѕРґРїРёСЃР°РЅРЅРѕР№ 043/Сѓ РѕС€РёР±РєР° РЅРµ РёСЃРїСЂР°РІР»СЏР»Р°СЃСЊ.
	 */
	complications: z.unknown().optional(),
	comorbidities: z.unknown().optional(),
	/*
	 * instrumentTrayBarcode вЂ” СЌР»РµРјРµРЅС‚ diary_hash Рё РїРµС‡Р°С‚СЊ 043/Сѓ.
	 * Р‘Р«Р›Рћ: revise СЃС…РµРјР°/handler РЅРµ РїСЂРёРЅРёРјР°Р»Рё Р»РѕС‚РѕРє; sterilization/link
	 * РїСЂРё is_locked РѕС‚РІРµС‡Р°Р» 409 В«Р»РѕС‚РѕРє РјРѕР¶РЅРѕ РїСЂР°РІРёС‚СЊ С‡РµСЂРµР·
	 * СЂРµРІРёР·РёСЋВ», РЅРѕ /revise Р»РѕС‚РѕРє РЅРµ РјРµРЅСЏР» вЂ” РЅРµРІРµСЂРЅС‹Р№ С€С‚СЂРёС…РєРѕРґ РІ
	 * РїРѕРґРїРёСЃР°РЅРЅРѕР№ 043/Сѓ РёСЃРїСЂР°РІРёС‚СЊ Р±С‹Р»Рѕ РЅРµР»СЊР·СЏ.
	 */
	instrumentTrayBarcode: z.unknown().optional(),
	revisionReason: z.unknown().optional(),
});

/**
 * Route params for e-signature diary paths.
 * Р‘Р«Р›Рћ: bare cast `req.params as { visitId|id: string }` on GET visit,
 * GET revisions, POST lock, POST revise. Non-UUID junk hit the DB and
 * returned 404 NotFound, masking bad route input as вЂњmissing diaryвЂќ.
 * Zod after clinical access gates в†’ 400 ValidationError; existing
 * 404 for well-formed unknown ids is unchanged.
 */
const diaryVisitParamsSchema = z.object({
	visitId: z.string().uuid(),
});

const diaryIdParamsSchema = z.object({
	id: z.string().uuid(),
});


/**
 * SHA-256 РїРµС‡Р°С‚СЊ СЃРѕРґРµСЂР¶РёРјРѕРіРѕ РґРЅРµРІРЅРёРєР° 043/Сѓ.
 *
 * Р‘Р«Р›Рћ (СЂР°РЅСЊС€Рµ): visitId|patientId|S|O|P вЂ” Р±РµР· A (РњРљР‘/Р·СѓР±), РѕСЃР»РѕР¶РЅРµРЅРёР№,
 * СЃРѕРїСѓС‚СЃС‚РІСѓСЋС‰РёС…. РџСЂР°РІРєР° РґРёР°РіРЅРѕР·Р° С‡РµСЂРµР· /revise РЅРµ РјРµРЅСЏР»Р° diaryHash.
 *
 * Р‘Р«Р›Рћ (РїРѕСЃР»Рµ СЃРµРјРё РїРѕР»РµР№): instrument_tray_barcode РїРµС‡Р°С‚Р°РµС‚СЃСЏ РІ 043/Сѓ
 * (В«РРЅСЃС‚СЂСѓРјРµРЅС‚Р°Р»СЊРЅС‹Р№ Р»РѕС‚РѕРєВ»), РЅРѕ РІ С…РµС€ РЅРµ РІС…РѕРґРёР». РЎРјРµРЅР° Р»РѕС‚РєР° РїРѕСЃР»Рµ
 * С‡РµСЂРЅРѕРІРёРєР°/РїРѕРґРїРёСЃРё РѕСЃС‚Р°РІР»СЏР»Р° С‚РѕС‚ Р¶Рµ diaryHash вЂ” Р­Р¦Рџ-С€С‚Р°РјРї В«Р·Р°РІРµСЂСЏР»В»
 * РґСЂСѓРіСѓСЋ СѓРїР°РєРѕРІРєСѓ СЃС‚РµСЂРёР»РёР·Р°С†РёРё, С‡РµРј РІ РєР°СЂС‚Рµ.
 *
 * РЎРўРђР›Рћ: СЃРµРјСЊ РєР»РёРЅРёС‡РµСЃРєРёС… РїРѕР»РµР№ + instrumentTrayBarcode (8-Р№ СЃРµРіРјРµРЅС‚).
 * РџРѕСЂСЏРґРѕРє С„РёРєСЃРёСЂРѕРІР°РЅ; РїСѓСЃС‚РѕРµ = "". РЎС‚Р°СЂС‹Рµ diary_hash Р±РµР· Р»РѕС‚РєР° РѕСЃС‚Р°СЋС‚СЃСЏ
 * РґРѕ Р±Р»РёР¶Р°Р№С€РµРіРѕ draft save / lock / revise (С‚РѕРіРґР° РїРµСЂРµСЃС‡С‘С‚).
 */
function computeDiaryHash(
	visitId: string,
	patientId: string,
	anamnesis: string | null | undefined,
	statusLocalis: string | null | undefined,
	treatmentDescription: string | null | undefined,
	diagnosisIcd10?: string | null | undefined,
	diagnosisTooth?: string | null | undefined,
	complications?: string | null | undefined,
	comorbidities?: string | null | undefined,
	instrumentTrayBarcode?: string | null | undefined,
): string {
	const raw = [
		visitId,
		patientId,
		anamnesis ?? "",
		statusLocalis ?? "",
		treatmentDescription ?? "",
		diagnosisIcd10 ?? "",
		diagnosisTooth ?? "",
		complications ?? "",
		comorbidities ?? "",
		instrumentTrayBarcode ?? "",
	].join("|");
	return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * РџСЂРѕСЃС‚Р°СЏ Р­Рџ РїРѕ PIN СЃРѕС‚СЂСѓРґРЅРёРєР° в†’ РЅРµРїСЂРѕР·СЂР°С‡РЅР°СЏ РѕС‚РјРµС‚РєР°, РЅРµ С†РёС„СЂС‹ PIN.
 *
 * Р‘Р«Р›Рћ: РєР»РёРµРЅС‚ СЃР»Р°Р» `PIN:<С‡РµС‚С‹СЂРµ С†РёС„СЂС‹>`, /lock Рё С†РµСЂРµРјРѕРЅРёСЏ РєР»Р°Р»Рё СЃС‚СЂРѕРєСѓ
 * РєР°Рє РµСЃС‚СЊ РІ crypto_signature_pkcs7. PIN СЃРѕС‚СЂСѓРґРЅРёРєР° Р»РµР¶Р°Р» РѕС‚РєСЂС‹С‚С‹Рј С‚РµРєСЃС‚РѕРј
 * СЂСЏРґРѕРј СЃ СЋСЂРёРґРёС‡РµСЃРєРѕР№ Р·Р°РїРёСЃСЊСЋ 043/Сѓ; GET РґРЅРµРІРЅРёРєР° РѕС‚РґР°РІР°Р» РµРіРѕ РІ Р±СЂР°СѓР·РµСЂ.
 *
 * РЎРўРђР›Рћ: РїСЂРё РїСЂРµС„РёРєСЃРµ PIN: СЃРІРµСЂСЏРµРј С†РёС„СЂС‹ СЃ users.pin_code_hash С‚РµРєСѓС‰РµРіРѕ
 * РїРѕРґРїРёСЃР°РЅС‚Р° (organizationId + userId). РЈСЃРїРµС… в†’ SIMPLE_PIN_EP|userId|iso|
 * РїРµСЂРІС‹Рµ 12 hex diaryHash (РёР»Рё В«nohashВ»). РћС‚РєР°Р· в†’ null + РєРѕРґ РїСЂРёС‡РёРЅС‹.
 * PKCS#7 РљСЂРёРїС‚РѕРџСЂРѕ (Р±РµР· РїСЂРµС„РёРєСЃР° PIN:) РїСЂРѕС…РѕРґРёС‚ Р±РµР· РёР·РјРµРЅРµРЅРёСЏ.
 */
type SimplePinResolve =
	| { ok: true; stored: string | null }
	| {
			ok: false;
			code: "PinRequired" | "PinInvalid" | "PinNotSet" | "UserRequired";
			message: string;
	  };

const SIMPLE_PIN_PREFIX = "PIN:";
const SIMPLE_PIN_EP_MARK = "SIMPLE_PIN_EP";

const DIARY_PIN_USER_REQUIRED_MESSAGE =
	"РџСЂРѕСЃС‚СѓСЋ РїРѕРґРїРёСЃСЊ РїРѕ РџРРќ-РєРѕРґСѓ РјРѕР¶РµС‚ РїРѕСЃС‚Р°РІРёС‚СЊ С‚РѕР»СЊРєРѕ СЃРѕС‚СЂСѓРґРЅРёРє, РІРѕС€РµРґС€РёР№ РІ СЃРјРµРЅСѓ. Р’РѕР№РґРёС‚Рµ РІ СЃРјРµРЅСѓ Р·Р°РЅРѕРІРѕ Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕРґРїРёСЃР°РЅРёРµ.";
const DIARY_PIN_NOT_SET_MESSAGE =
	"РЈ РІР°С€РµР№ СѓС‡С‘С‚РЅРѕР№ Р·Р°РїРёСЃРё РЅРµ Р·Р°РґР°РЅ РџРРќ-РєРѕРґ СЃРѕС‚СЂСѓРґРЅРёРєР°, РїСЂРѕСЃС‚СѓСЋ РїРѕРґРїРёСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ РЅРµР»СЊР·СЏ. Р—Р°РґР°Р№С‚Рµ РџРРќ РІ РЅР°СЃС‚СЂРѕР№РєР°С… РїРµСЂСЃРѕРЅР°Р»Р° РёР»Рё РїРѕРґРїРёС€РёС‚Рµ РґРЅРµРІРЅРёРє С‡РµСЂРµР· РљСЂРёРїС‚РѕРџСЂРѕ.";
const DIARY_PIN_INVALID_MESSAGE =
	"РџРРќ-РєРѕРґ РЅРµ РїСЂРёРЅСЏС‚. РџСЂРѕРІРµСЂСЊС‚Рµ СЂР°СЃРєР»Р°РґРєСѓ Рё РІРІРµРґРёС‚Рµ РџРРќ-РєРѕРґ СЃРѕС‚СЂСѓРґРЅРёРєР° Р·Р°РЅРѕРІРѕ.";

async function resolveSignatureForStorage(params: {
	pkcs7Signature: string | null | undefined;
	userId: string | null;
	organizationId: string;
	diaryHashForMark?: string | null;
}): Promise<SimplePinResolve> {
	const raw =
		typeof params.pkcs7Signature === "string" ? params.pkcs7Signature : null;
	if (raw == null || raw.length === 0) {
		return { ok: true, stored: null };
	}
	if (!raw.startsWith(SIMPLE_PIN_PREFIX)) {
		// РЈРљР­Рџ / PKCS#7 вЂ” Р±РµР· СЂР°Р·Р±РѕСЂР°; legacy SIMPLE_PIN_EP С‚РѕР¶Рµ РїСЂРѕС…РѕРґРёС‚.
		return { ok: true, stored: raw };
	}
	const pinDigits = raw.slice(SIMPLE_PIN_PREFIX.length);
	if (!/^\d{4}$/.test(pinDigits)) {
		return {
			ok: false,
			code: "PinInvalid",
			message: DIARY_PIN_INVALID_MESSAGE,
		};
	}
	if (!params.userId) {
		return {
			ok: false,
			code: "UserRequired",
			message: DIARY_PIN_USER_REQUIRED_MESSAGE,
		};
	}
	const [user] = await db
		.select({
			id: users.id,
			pinCodeHash: users.pinCodeHash,
		})
		.from(users)
		.where(
			and(
				eq(users.id, params.userId),
				eq(users.organizationId, params.organizationId),
				eq(users.isActive, true),
			),
		)
		.limit(1);
	if (!user) {
		return {
			ok: false,
			code: "UserRequired",
			message: DIARY_PIN_USER_REQUIRED_MESSAGE,
		};
	}
	if (!user.pinCodeHash) {
		return {
			ok: false,
			code: "PinNotSet",
			message: DIARY_PIN_NOT_SET_MESSAGE,
		};
	}
	const matched = await verifyCredential(pinDigits, user.pinCodeHash);
	if (!matched) {
		return {
			ok: false,
			code: "PinInvalid",
			message: DIARY_PIN_INVALID_MESSAGE,
		};
	}
	const hashPart =
		typeof params.diaryHashForMark === "string" &&
		params.diaryHashForMark.length >= 12
			? params.diaryHashForMark.slice(0, 12)
			: "nohash";
	const mark = [
		SIMPLE_PIN_EP_MARK,
		params.userId,
		new Date().toISOString(),
		hashPart,
	].join("|");
	return { ok: true, stored: mark };
}

const DENTAL_SPECIALTY_LABELS: Record<string, string> = {
	therapist: "С‚РµСЂР°РїРёСЏ",
	orthopedist: "РѕСЂС‚РѕРїРµРґРёСЏ",
	surgeon: "С…РёСЂСѓСЂРіРёСЏ",
	orthodontist: "РѕСЂС‚РѕРґРѕРЅС‚РёСЏ",
	periodontist: "РїР°СЂРѕРґРѕРЅС‚РѕР»РѕРіРёСЏ",
	hygienist: "РіРёРіРёРµРЅР°",
	pediatric: "РґРµС‚СЃРєР°СЏ",
	implantologist: "РёРјРїР»Р°РЅС‚Р°С†РёСЏ",
	radiologist: "СЂРµРЅС‚РіРµРЅ",
	universal: "СѓРЅРёРІРµСЂСЃР°Р»СЊРЅРѕ",
};

/**
 * DEFECT #41: RU-РјРµС‚РєР° СЃРїРµС†РёР°Р»СЊРЅРѕСЃС‚Рё РІСЂР°С‡Р° РґР»СЏ РїРµС‡Р°С‚Рё 043/Сѓ.
 * users.specialties вЂ” jsonb string[]; prefer non-universal codes.
 */
function formatDoctorSpecialtyLabel(raw: unknown): string | null {
	const codes: string[] = Array.isArray(raw)
		? raw
				.map((x) => (typeof x === "string" ? x.trim() : ""))
				.filter(Boolean)
		: typeof raw === "string" && raw.trim()
			? [raw.trim()]
			: [];
	if (codes.length === 0) return null;
	const meaningful = codes.filter((c) => c !== "universal");
	const list = meaningful.length > 0 ? meaningful : codes;
	const labels = list.map((c) => DENTAL_SPECIALTY_LABELS[c] ?? c);
	const joined = labels.join(", ").trim();
	return joined.length > 0 ? joined : null;
}

/** Legacy PIN:вЂ¦ РІ РѕС‚РІРµС‚Рµ GET РЅРµ РѕС‚РґР°С‘Рј вЂ” С‚РѕР»СЊРєРѕ С„Р°РєС‚, С‡С‚Рѕ РѕС‚С‚РёСЃРє Р±С‹Р». */
function redactLegacyPinSignature(
	value: string | null | undefined,
): string | null {
	if (typeof value !== "string" || value.length === 0) return value ?? null;
	if (value.startsWith(SIMPLE_PIN_PREFIX)) {
		return `${SIMPLE_PIN_EP_MARK}|redacted-legacy`;
	}
	return value;
}

/**
 * РЎРїРёСЃС‹РІР°С‚СЊ СЃРѕ СЃРєР»Р°РґР° РјРѕР¶РЅРѕ С‚РѕР»СЊРєРѕ РєРѕРЅРµС‡РЅРѕРµ РїРѕР»РѕР¶РёС‚РµР»СЊРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ.
 *
 * РџСЂРѕРІРµСЂСЏРµС‚СЃСЏ РљРђР–Р”Р«Р™ РјРЅРѕР¶РёС‚РµР»СЊ СЂР°СЃС…РѕРґР° РѕС‚РґРµР»СЊРЅРѕ, Р° РЅРµ РёС‚РѕРіРѕРІРѕРµ РїСЂРѕРёР·РІРµРґРµРЅРёРµ:
 * РїСЂР°РІРёР»Рѕ СЃРѕ СЃРїРёСЃР°РЅРёРµРј -3 РїСЂРё РєРѕР»РёС‡РµСЃС‚РІРµ СѓСЃР»СѓРіРё -2 РґР°С‘С‚ +6, С‚Рѕ РµСЃС‚СЊ РґРІРµ РѕС€РёР±РєРё РІ
 * РґР°РЅРЅС‹С… РїСЂРµРІСЂР°С‚РёР»РёСЃСЊ Р±С‹ РІ СЃРїРёСЃР°РЅРёРµ, РєРѕС‚РѕСЂРѕРіРѕ РЅРёРєС‚Рѕ РЅРµ РЅР°Р·РЅР°С‡Р°Р». РќРё РѕРґРЅР° РёР· С‚СЂС‘С…
 * РєРѕР»РѕРЅРѕРє (quantity_to_deduct, treatment_items.quantity, stock_quantity) РЅРµ РёРјРµРµС‚
 * РІ Р±Р°Р·Рµ РЅРё РѕРґРЅРѕРіРѕ CHECK-РѕРіСЂР°РЅРёС‡РµРЅРёСЏ вЂ” РїСЂРѕРІРµСЂРµРЅРѕ С‡С‚РµРЅРёРµРј pg_constraint РЅР° Р¶РёРІРѕР№
 * Р±Р°Р·Рµ, вЂ” РїРѕСЌС‚РѕРјСѓ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ С‚Р°Рј С„РёР·РёС‡РµСЃРєРё РјРѕР¶РµС‚ Р»РµР¶Р°С‚СЊ.
 */
function isDeductibleQuantity(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

/** РўСЂР°РЅР·Р°РєС†РёСЏ drizzle вЂ” С‚РёРї Р±РµСЂС‘С‚СЃСЏ Сѓ СЃР°РјРѕРіРѕ db, С‡С‚РѕР±С‹ РЅРµ С‚СЏРЅСѓС‚СЊ РІРЅСѓС‚СЂРµРЅРЅРёРµ РїСѓС‚Рё ORM. */
type DiaryDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/*
 * `NotSaved` РѕС‚РґРµР»С‘РЅ РѕС‚ `NotFound` РќР• СЂР°РґРё РєСЂР°СЃРѕС‚С‹ РєРѕРґР°, Р° РїРѕС‚РѕРјСѓ С‡С‚Рѕ СЌС‚Рѕ РґРІР°
 * СЂР°Р·РЅС‹С… СЃРѕСЃС‚РѕСЏРЅРёСЏ СЃ СЂР°Р·РЅС‹РјРё РґРµР№СЃС‚РІРёСЏРјРё РІСЂР°С‡Р° Рё СЂР°Р·РЅС‹РјРё РєРѕРґР°РјРё РѕС‚РІРµС‚Р°:
 * В«РґРЅРµРІРЅРёРєР° РЅРµС‚В» Р»РµС‡РёС‚СЃСЏ РїРѕРІС‚РѕСЂРЅС‹Рј СЃРѕС…СЂР°РЅРµРЅРёРµРј С‡РµСЂРЅРѕРІРёРєР°, В«РґРЅРµРІРЅРёРє РЅРµ СѓРґР°Р»РѕСЃСЊ
 * СЃРѕС…СЂР°РЅРёС‚СЊВ» РїРѕРІС‚РѕСЂРЅС‹Рј СЃРѕС…СЂР°РЅРµРЅРёРµРј РќР• Р»РµС‡РёС‚СЃСЏ Рё РѕР·РЅР°С‡Р°РµС‚ СЃР±РѕР№ СЃРµСЂРІРµСЂР°. Р Р°РЅСЊС€Рµ
 * РѕР±Р° СЃРѕСЃС‚РѕСЏРЅРёСЏ РЅРѕСЃРёР»Рё РєРѕРґ `NotFound`, РѕС‚РґР°РІР°Р»РёСЃСЊ РѕРґРЅРёРј 404 Рё СЂР°Р·Р»РёС‡Р°Р»РёСЃСЊ Р±С‹
 * С‚РѕР»СЊРєРѕ СЃСЂР°РІРЅРµРЅРёРµРј С‚РµРєСЃС‚Р° `err.message` вЂ” СЂРѕРІРЅРѕ С‚РµРј РїСЂРёС‘РјРѕРј, РєРѕС‚РѕСЂС‹Р№ СЌС‚РѕС‚ С„Р°Р№Р»
 * СѓР¶Рµ РѕРґРЅР°Р¶РґС‹ РїСЂРёР·РЅР°Р» РЅРµРіРѕРґРЅС‹Рј (СЃРј. РєРѕРјРјРµРЅС‚Р°СЂРёР№ Рє DiarySigningError РЅРёР¶Рµ).
 */
type DiarySigningFailureCode =
	| "NotFound"
	| "NotSaved"
	| "AlreadyLocked"
	| "InsufficientStock"
	| "Icd10Required"
	| "PinRejected";

/**
 * РћС‚РєР°Р· С†РµСЂРµРјРѕРЅРёРё РїРѕРґРїРёСЃР°РЅРёСЏ. Р Р°РЅСЊС€Рµ РѕР±Р° СЃРѕСЃС‚РѕСЏРЅРёСЏ РїРµСЂРµРґР°РІР°Р»РёСЃСЊ С‡РµСЂРµР·
 * `new Error("AlreadyLocked")` Рё СЂР°Р·Р±РёСЂР°Р»РёСЃСЊ СЃСЂР°РІРЅРµРЅРёРµРј `err.message` СЃРѕ
 * СЃС‚СЂРѕРєРѕР№ вЂ” Р»СЋР±РѕРµ СЃРѕРІРїР°РґРµРЅРёРµ С‚РµРєСЃС‚Р° РёР· РґСЂР°Р№РІРµСЂР° Р±Р°Р·С‹ РґР°Р»Рѕ Р±С‹ С‚РѕС‚ Р¶Рµ РѕС‚РІРµС‚.
 */
class DiarySigningError extends Error {
	constructor(
		readonly code: DiarySigningFailureCode,
		message: string,
	) {
		super(message);
		this.name = "DiarySigningError";
	}
}

interface DiaryStockDeduction {
	inventoryItemId: string;
	inventoryItemName: string;
	quantityChanged: string;
}

interface DiarySigningResult {
	diaryId: string;
	hash: string;
	lockedAt: Date;
	completedTreatmentItems: number;
	deductions: DiaryStockDeduction[];
	auditLogId: string | null;
}

/**
 * Р•РґРёРЅСЃС‚РІРµРЅРЅР°СЏ С†РµСЂРµРјРѕРЅРёСЏ РїРѕРґРїРёСЃР°РЅРёСЏ РґРЅРµРІРЅРёРєР°.
 *
 * Р‘Р«Р›Рћ: РїРѕРґРїРёСЃР°С‚СЊ РїСЂРёС‘Рј РјРѕР¶РЅРѕ Р±С‹Р»Рѕ РґРІСѓРјСЏ РјР°СЂС€СЂСѓС‚Р°РјРё, Рё РѕРЅРё РґРµР»Р°Р»Рё Р РђР—РќРћР•.
 * `POST /api/diaries` СЃРѕ `status: "signed"` СЃС‚Р°РІРёР» С‚РѕР»СЊРєРѕ is_locked, РІСЂРµРјСЏ Рё С…РµС€.
 * `POST /api/diaries/:id/lock` РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅРѕ Р·Р°РєСЂС‹РІР°Р» СѓСЃР»СѓРіРё РІРёР·РёС‚Р°, СЃРїРёСЃС‹РІР°Р»
 * СЂР°СЃС…РѕРґРЅРёРєРё СЃРѕ СЃРєР»Р°РґР°, РїРёСЃР°Р» СЃС‚СЂРѕРєРё inventory_transactions, Р·Р°РІРѕРґРёР» СЃС‚Р°РІРєСѓ РІСЂР°С‡Р°
 * Рё РѕСЃС‚Р°РІР»СЏР» Р·Р°РїРёСЃСЊ РІ clinical_audit_logs. РўРѕ РµСЃС‚СЊ РѕС‚ С‚РѕРіРѕ, РєР°РєРѕР№ РјР°СЂС€СЂСѓС‚ РІС‹Р·РІР°Р»
 * СЌРєСЂР°РЅ, Р·Р°РІРёСЃРµР»Рѕ, СЃРїРёС€РµС‚СЃСЏ Р»Рё РјР°С‚РµСЂРёР°Р» Рё РѕСЃС‚Р°РЅРµС‚СЃСЏ Р»Рё СЋСЂРёРґРёС‡РµСЃРєРёР№ СЃР»РµРґ вЂ” РїСЂРё
 * РѕРґРЅРѕРј Рё С‚РѕРј Р¶Рµ РґРµР№СЃС‚РІРёРё РІСЂР°С‡Р° В«РїРѕРґРїРёСЃР°С‚СЊ РїСЂРёС‘РјВ». РћСЃС‚Р°С‚РєРё СЃРєР»Р°РґР° Рё Р¶СѓСЂРЅР°Р»
 * СЂР°СЃС…РѕРґРёР»РёСЃСЊ РјРѕР»С‡Р°, Рё СЂР°СЃС…РѕР¶РґРµРЅРёРµ РѕР±РЅР°СЂСѓР¶РёРІР°Р»РѕСЃСЊ С‚РѕР»СЊРєРѕ РЅР° РёРЅРІРµРЅС‚Р°СЂРёР·Р°С†РёРё.
 *
 * РЎРўРђР›Рћ: С†РµСЂРµРјРѕРЅРёСЏ СЃСѓС‰РµСЃС‚РІСѓРµС‚ РѕРґРёРЅ СЂР°Р·, Р·РґРµСЃСЊ, Рё РѕР±Р° РјР°СЂС€СЂСѓС‚Р° РµС‘ РІС‹Р·С‹РІР°СЋС‚.
 * РљРѕРїРёСЏ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚, РїРѕСЌС‚РѕРјСѓ СЂР°Р·РѕР№С‚РёСЃСЊ РёРј Р±РѕР»СЊС€Рµ РЅРµС‡РµРј.
 *
 * Р’С‹Р·С‹РІР°С‚СЊ С‚РѕР»СЊРєРѕ РІРЅСѓС‚СЂРё С‚СЂР°РЅР·Р°РєС†РёРё: СЃРїРёСЃР°РЅРёРµ СЃРєР»Р°РґР° Рё Р¶СѓСЂРЅР°Р» РѕР±СЏР·Р°РЅС‹ РїРѕРїР°СЃС‚СЊ РІ
 * Р±Р°Р·Сѓ РІРјРµСЃС‚Рµ СЃ Р·Р°РјРєРѕРј Р»РёР±Рѕ РЅРµ РїРѕРїР°СЃС‚СЊ РІРѕРІСЃРµ.
 */
async function runDiarySigningCeremony(
	tx: DiaryDbTransaction,
	params: {
		diaryId: string;
		organizationId: string;
		userId: string | null;
		pkcs7Signature: string | null;
	},
): Promise<DiarySigningResult> {
	const { diaryId, organizationId, userId } = params;

	// 0. РџРµСЂРµС‡РёС‚Р°С‚СЊ РґРЅРµРІРЅРёРє FOR UPDATE РІРЅСѓС‚СЂРё С‚СЂР°РЅР·Р°РєС†РёРё Рё Р·Р°РЅРѕРІРѕ РїСЂРѕРІРµСЂРёС‚СЊ Р·Р°РјРѕРє.
	// РџСЂРѕРІРµСЂРєР° СЃРЅР°СЂСѓР¶Рё С‡РёС‚Р°РµС‚ РµС‰С‘ РЅРµР·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРЅСѓСЋ СЃС‚СЂРѕРєСѓ (TOCTOU): РґРІР°
	// РѕРґРЅРѕРІСЂРµРјРµРЅРЅС‹С… РїРѕРґРїРёСЃР°РЅС‚Р° РїСЂРѕС…РѕРґСЏС‚ РµС‘ РѕР±Р°, РІС…РѕРґСЏС‚ СЃСЋРґР° РѕР±Р° Рё СЃРїРёСЃС‹РІР°СЋС‚
	// РјР°С‚РµСЂРёР°Р» РґРІР°Р¶РґС‹. Р‘Р»РѕРєРёСЂРѕРІРєР° СЃС‚СЂРѕРєРё РёС… СЃРµСЂРёР°Р»РёР·СѓРµС‚: РІС‚РѕСЂРѕР№ Р¶РґС‘С‚ РєРѕРјРјРёС‚Р°
	// РїРµСЂРІРѕРіРѕ Рё РІРёРґРёС‚ is_locked = true РґРѕ Р»СЋР±РѕРіРѕ СЃРїРёСЃР°РЅРёСЏ.
	const [diary] = await tx
		.select()
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.id, diaryId),
				eq(visitDiaries.organizationId, organizationId),
			),
		)
		.limit(1)
		.for("update");
	if (!diary) {
		// РўРµРєСЃС‚ РіРѕРІРѕСЂРёС‚ РІСЂР°С‡Сѓ Рё РїСЂРёС‡РёРЅСѓ, Рё СЃР»РµРґСѓСЋС‰РёР№ С€Р°Рі. РџСЂРµР¶РЅРµРµ В«Р”РЅРµРІРЅРёРє РЅРµ
		// РЅР°Р№РґРµРЅ.В» РїСЂРёС‡РёРЅСѓ РЅР°Р·С‹РІР°Р»Рѕ, Р° РґРµР№СЃС‚РІРёРµ вЂ” РЅРµС‚, Рё РґРѕ СЌРєСЂР°РЅР° РІСЃС‘ СЂР°РІРЅРѕ РЅРµ
		// РґРѕС…РѕРґРёР»Рѕ: РІРµС‚РєР° РѕС‚РІРµС‚Р° РІС‹Р±СЂР°СЃС‹РІР°Р»Р° message С†РµР»РёРєРѕРј.
		throw new DiarySigningError(
			"NotFound",
			"Р”РЅРµРІРЅРёРє РїСЂРёС‘РјР° РЅРµ РЅР°Р№РґРµРЅ РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ, РїРѕРґРїРёСЃС‹РІР°С‚СЊ РЅРµС‡РµРіРѕ. РўР°Рє Р±С‹РІР°РµС‚, РµСЃР»Рё СЃС‚СЂР°РЅРёС†Р° РїСЂРёС‘РјР° РѕС‚РєСЂС‹С‚Р° РґР°РІРЅРѕ Рё РґРЅРµРІРЅРёРє СЃ С‚РµС… РїРѕСЂ СѓРґР°Р»С‘РЅ. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ, РЅР°Р¶РјРёС‚Рµ В«РЎРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРєВ» Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕРґРїРёСЃР°РЅРёРµ.",
		);
	}
	if (diary.isLocked) {
		throw new DiarySigningError("AlreadyLocked", "Р”РЅРµРІРЅРёРє СѓР¶Рµ РїРѕРґРїРёСЃР°РЅ.");
	}

	/*
	 * DEFECT #69: signed 043/Сѓ must carry РњРљР‘-10 before lock.
	 * Р‘Р«Р›Рћ: runDiarySigningCeremony / POST lock / status:signed РїСЂРёРЅРёРјР°Р»Рё
	 * РїСѓСЃС‚РѕР№ diagnosisIcd10. Р‘СѓРјР°Р¶РЅР°СЏ 043/Сѓ Рё diary_hash СѓС…РѕРґРёР»Рё Р±РµР· РєРѕРґР°
	 * РґРёР°РіРЅРѕР·Р°; EGISZ CDA СѓР¶Рµ СЂРµР¶РµС‚ РїСѓСЃС‚РѕР№ РњРљР‘ (#62), Р° РїРѕРґРїРёСЃР°РЅРЅР°СЏ РєР°СЂС‚Р°
	 * РєР»РёРЅРёРєРё вЂ” РЅРµС‚. РЎСѓРґ/РїСЂРѕРІРµСЂРєР° РєР°С‡РµСЃС‚РІР° РІРёРґСЏС‚ Р·Р°РІРµСЂРµРЅРЅС‹Р№ РґРЅРµРІРЅРёРє Р±РµР·
	 * РѕР±СЏР·Р°С‚РµР»СЊРЅРѕРіРѕ РїРѕР»СЏ РїСЂРёРєР°Р·Р° 834РЅ.
	 * РЎРўРђР›Рћ: trim diagnosisIcd10; РїСѓСЃС‚Рѕ в†’ 422 Icd10Required РґРѕ Р·Р°РјРєР°/СЃРєР»Р°РґР°.
	 */
	const icdForLock =
		typeof diary.diagnosisIcd10 === "string" ? diary.diagnosisIcd10.trim() : "";
	if (!icdForLock) {
		throw new DiarySigningError(
			"Icd10Required",
			"РџРµСЂРµРґ РїРѕРґРїРёСЃСЊСЋ РґРЅРµРІРЅРёРєР° 043/Сѓ СѓРєР°Р¶РёС‚Рµ РєРѕРґ РґРёР°РіРЅРѕР·Р° РїРѕ РњРљР‘-10. РЎРѕС…СЂР°РЅРёС‚Рµ С‡РµСЂРЅРѕРІРёРє СЃ РєРѕРґРѕРј Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕРґРїРёСЃР°РЅРёРµ.",
		);
	}

	// РҐРµС€ СЃС‡РёС‚Р°РµС‚СЃСЏ РїРѕ РЎРћРҐР РђРќРЃРќРќРћР™ СЃС‚СЂРѕРєРµ, Р° РЅРµ РїРѕ С‚РµР»Сѓ Р·Р°РїСЂРѕСЃР°.
	// Р‘Р«Р›Рћ: POST С…РµС€РёСЂРѕРІР°Р» РїСЂРёСЃР»Р°РЅРЅС‹Рµ РїРѕР»СЏ. Р¤СЂРѕРЅС‚РµРЅРґ СЃРѕС…СЂР°РЅСЏРµС‚ С‡РµСЂРЅРѕРІРёРє РѕС‚РґРµР»СЊРЅРѕ Рё
	// РїСЂРё РїРѕРґРїРёСЃР°РЅРёРё С‡Р°СЃС‚Рѕ РЅРµ РїСЂРёСЃС‹Р»Р°РµС‚ РєР»РёРЅРёС‡РµСЃРєРёРµ РїРѕР»СЏ РІРѕРІСЃРµ вЂ” С‚РѕРіРґР° РІ РїРµС‡Р°С‚СЊ
	// СѓС…РѕРґРёР» С…РµС€ РѕС‚ РїСѓСЃС‚С‹С… СЃС‚СЂРѕРє, С‚РѕРіРґР° РєР°Рє РІ РєР°СЂС‚Рµ РѕСЃС‚Р°РІР°Р»СЃСЏ РїСЂРµР¶РЅРёР№ С‚РµРєСЃС‚.
	// РџРµС‡Р°С‚СЊ Р·Р°РІРµСЂСЏР»Р° РЅРµ С‚Рѕ СЃРѕРґРµСЂР¶РёРјРѕРµ, РєРѕС‚РѕСЂРѕРµ С…СЂР°РЅРёС‚СЃСЏ, Рё Р»СЋР±Р°СЏ РїРѕР·РґРЅРµР№С€Р°СЏ
	// РїСЂРѕРІРµСЂРєР° С†РµР»РѕСЃС‚РЅРѕСЃС‚Рё РЅРµ СЃРѕС€Р»Р°СЃСЊ Р±С‹. РўРµРїРµСЂСЊ РёСЃС‚РѕС‡РЅРёРє РѕРґРёРЅ вЂ” СЃС‚СЂРѕРєР° РІ Р±Р°Р·Рµ.
	const hash = computeDiaryHash(
		diary.visitId,
		diary.patientId ?? "",
		diary.anamnesis,
		diary.statusLocalis,
		diary.treatmentDescription,
		diary.diagnosisIcd10,
		diary.diagnosisTooth,
		diary.complications,
		diary.comorbidities,
		diary.instrumentTrayBarcode,
	);
	const lockedAt = new Date();

	// 1. Р—Р°РјРѕРє Рё РїРµС‡Р°С‚СЊ
	/*
	 * DEFECT #76: lock UPDATE must only transition unlocked в†’ locked.
	 * Р‘Р«Р›Рћ: WHERE id+org only. Concurrent double POST /lock (two tabs /
	 * two sessions that both passed the pre-check) could both set
	 * is_locked=true, overwrite lockedAt/lockedByUserId/diaryHash/PKCS7
	 * and double-run stock deductions + treatment completion below.
	 * РЎРўРђР›Рћ: WHERE is_locked=false + returning; zero rows в†’ AlreadyLocked.
	 */
	const lockedRows = await tx
		.update(visitDiaries)
		.set({
			isLocked: true,
			lockedAt,
			lockedByUserId: userId,
			coSignedByUserId: userId,
			/*
			 * DEFECT #35: authorId + doctorId РїСЂРё РїРѕРґРїРёСЃР°РЅРёРё.
			 * Р‘Р«Р›Рћ: РєРѕР»РѕРЅРєРё visit_diaries.author_id / doctor_id РІ schema РµСЃС‚СЊ,
			 * РЅРѕ ceremony РїРёСЃР°Р»Р° С‚РѕР»СЊРєРѕ lockedByUserId/coSignedByUserId.
			 * biAnalyticsWorker РґР¶РѕР№РЅРёС‚ visitDiaries.doctorId в†’ users вЂ”
			 * РјРµС‚СЂРёРєРё РІСЂР°С‡Р° РІСЃРµРіРґР° РїСѓСЃС‚С‹Рµ; toothHistory С„РѕР»Р±СЌРє РЅР° doctorId
			 * С‚РѕР¶Рµ РЅРµ СЃСЂР°Р±Р°С‚С‹РІР°Р».
			 * РЎРўРђР›Рћ: РїРѕРґРїРёСЃР°РЅС‚ = author Рё treating doctor Р·Р°РїРёСЃРё 043/Сѓ.
			 */
			authorId: userId,
			doctorId: userId,
			diaryHash: hash,
			cryptoSignaturePkcs7: params.pkcs7Signature,
			updatedAt: lockedAt,
		})
		.where(
			and(
				eq(visitDiaries.id, diaryId),
				eq(visitDiaries.organizationId, organizationId),
				eq(visitDiaries.isLocked, false),
			),
		)
		.returning({ id: visitDiaries.id });
	if (lockedRows.length === 0) {
		throw new DiarySigningError(
			"AlreadyLocked",
			"Р”РЅРµРІРЅРёРє РїРѕРґРїРёСЃР°РЅ Рё Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ.",
		);
	}


	// 2. Р—Р°РєСЂС‹С‚СЊ СѓСЃР»СѓРіРё РІРёР·РёС‚Р° Рё СЃРїРёСЃР°С‚СЊ СЂР°СЃС…РѕРґРЅРёРєРё.
	// Р’СЃРµ С‡С‚РµРЅРёСЏ РѕРіСЂР°РЅРёС‡РµРЅС‹ РѕСЂРіР°РЅРёР·Р°С†РёРµР№ РґРЅРµРІРЅРёРєР°. Р‘Р«Р›Рћ: РїСЂР°РІРёР»Р° РјР°С‚РµСЂРёР°Р»РѕРІ
	// РІС‹Р±РёСЂР°Р»РёСЃСЊ РїРѕ РѕРґРЅРѕРјСѓ serviceId, Р° РїРѕР·РёС†РёСЏ СЃРєР»Р°РґР° вЂ” РїРѕ РѕРґРЅРѕРјСѓ id, Р±РµР·
	// РѕСЂРіР°РЅРёР·Р°С†РёРё. РџСЂР°РІРёР»Рѕ С‡СѓР¶РѕР№ РєР»РёРЅРёРєРё, СЃСЃС‹Р»Р°СЋС‰РµРµСЃСЏ РЅР° РµС‘ Р¶Рµ РїРѕР·РёС†РёСЋ СЃРєР»Р°РґР°,
	// СЃРїРёСЃС‹РІР°Р»Рѕ РѕСЃС‚Р°С‚РѕРє Р§РЈР–РћР™ РєР»РёРЅРёРєРё, Р° СЃС‚СЂРѕРєР° inventory_transactions РїСЂРё СЌС‚РѕРј
	// Р·Р°РїРёСЃС‹РІР°Р»Р°СЃСЊ РЅР° РЅР°С€Сѓ вЂ” С‚Рѕ РµСЃС‚СЊ Р·Р°РїРёСЃСЊ Рѕ СЂР°СЃС…РѕРґРµ Рё СЃР°Рј СЂР°СЃС…РѕРґ РѕРєР°Р·С‹РІР°Р»РёСЃСЊ РІ
	// СЂР°Р·РЅС‹С… РєР»РёРЅРёРєР°С….
	const deductions: DiaryStockDeduction[] = [];
	let completedTreatmentItems = 0;
	if (diary.visitId) {
		const visitTreatmentItems = await tx
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.visitId, diary.visitId),
					eq(treatmentItems.organizationId, organizationId),
				),
			);
		if (visitTreatmentItems.length > 0) {
			await tx
				.update(treatmentItems)
				.set({ status: "completed" })
				.where(
					and(
						eq(treatmentItems.visitId, diary.visitId),
						eq(treatmentItems.organizationId, organizationId),
					),
				);
			completedTreatmentItems = visitTreatmentItems.length;

			for (const item of visitTreatmentItems) {
				if (!item.serviceId) continue;
				// РџСЂР°РІРёР»Рѕ РјР°С‚РµСЂРёР°Р»РѕРІ РјРѕР¶РµС‚ Р±С‹С‚СЊ РќРР§Р¬РРњ, Рё СЌС‚Рѕ РЅРѕСЂРјР° РґР»СЏ СЌС‚РѕРіРѕ
				// РїСЂРѕРґСѓРєС‚Р°: РµРґРёРЅСЃС‚РІРµРЅРЅС‹Р№ РјР°СЂС€СЂСѓС‚, РєРѕС‚РѕСЂС‹Р№ РёС… СЃРѕР·РґР°С‘С‚
				// (routes/inventory.ts:410-417), РЅРµ Р·Р°РїРѕР»РЅСЏРµС‚ organization_id, Р°
				// РєРѕР»РѕРЅРєР° nullable вЂ” РїСЂРѕРІРµСЂРµРЅРѕ РІ information_schema Р¶РёРІРѕР№ Р±Р°Р·С‹.
				// РўСЂРµР±РѕРІР°РЅРёРµ С‚РѕС‡РЅРѕРіРѕ СЃРѕРІРїР°РґРµРЅРёСЏ РѕСЂРіР°РЅРёР·Р°С†РёРё РІС‹Р±СЂР°СЃС‹РІР°Р»Рѕ С‚Р°РєРёРµ
				// РїСЂР°РІРёР»Р° РёР· РІС‹Р±РѕСЂРєРё, Рё РїРѕРґРїРёСЃР°РЅРёРµ РїСЂРёС‘РјР° РќР• РЎРџРРЎР«Р’РђР›Рћ РјР°С‚РµСЂРёР°Р»
				// РІРѕРІСЃРµ: РёР·РјРµСЂРµРЅРѕ РЅР° Р¶РёРІРѕР№ Р±Р°Р·Рµ вЂ” РѕСЃС‚Р°С‚РѕРє 10 -> 10, РЅРѕР»СЊ СЃС‚СЂРѕРє
				// inventory_transactions, РїСЂРё РѕС‚РІРµС‚Рµ 200 Рё РїРѕРґРїРёСЃР°РЅРЅРѕРј РґРЅРµРІРЅРёРєРµ.
				// Р”Рѕ 87e367c40 С‚Рѕ Р¶Рµ РїСЂР°РІРёР»Рѕ СЃРїРёСЃС‹РІР°Р»Рѕ (10 -> 6): РѕРіСЂР°РЅРёС‡РµРЅРёРµ РїРѕ
				// РѕСЂРіР°РЅРёР·Р°С†РёРё, Р·Р°РєСЂС‹РІС€РµРµ РјРµР¶РєР»РёРЅРёС‡РЅСѓСЋ СѓС‚РµС‡РєСѓ, Р·Р°РѕРґРЅРѕ РјРѕР»С‡Р°
				// РѕС‚РєР»СЋС‡РёР»Рѕ СЃРєР»Р°Рґ РґР»СЏ РїСЂР°РІРёР», РєРѕС‚РѕСЂС‹Рµ РїСЂРѕРґСѓРєС‚ СЃРѕР·РґР°С‘С‚ СЃР°Рј. РўРёС…РѕРµ
				// РЅРµСЃРїРёСЃР°РЅРёРµ РЅР° РїРѕРґРїРёСЃР°РЅРЅРѕРј РїСЂРёС‘РјРµ С…СѓР¶Рµ СЂР°СЃС…РѕР¶РґРµРЅРёСЏ РѕСЃС‚Р°С‚РєР° вЂ”
				// РёРЅРІРµРЅС‚Р°СЂРёР·Р°С†РёСЏ РЅРµ СЃРѕР№РґС‘С‚СЃСЏ, Р° СЃР»РµРґР° РІ Р¶СѓСЂРЅР°Р»Рµ РЅРµ РѕСЃС‚Р°РЅРµС‚СЃСЏ.
				// РџСЂР°РІРёР»Рѕ Р§РЈР–РћР™ РєР»РёРЅРёРєРё (organization_id Р·Р°РїРѕР»РЅРµРЅ Рё РЅРµ РЅР°С€)
				// РїРѕ-РїСЂРµР¶РЅРµРјСѓ РЅРµ РїРѕРґС…РѕРґРёС‚, Р° РїРѕР·РёС†РёСЏ СЃРєР»Р°РґР° РЅРёР¶Рµ С‡РёС‚Р°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ
				// РІРЅСѓС‚СЂРё РЅР°С€РµР№ РѕСЂРіР°РЅРёР·Р°С†РёРё вЂ” СЃРїРёСЃР°С‚СЊ С‡СѓР¶РѕР№ РѕСЃС‚Р°С‚РѕРє РЅРµС‡РµРј.
				const rules = await tx
					.select()
					.from(procedureMaterialRules)
					.where(
						and(
							eq(procedureMaterialRules.serviceId, item.serviceId),
							or(
								eq(procedureMaterialRules.organizationId, organizationId),
								isNull(procedureMaterialRules.organizationId),
							),
						),
					);
				for (const rule of rules) {
					if (!rule.inventoryItemId) continue;
					const [inv] = await tx
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.id, rule.inventoryItemId),
								eq(inventoryItems.organizationId, organizationId),
							),
						)
						.for("update");
					if (!inv) continue;

					// Р§РўРћ Р—Р”Р•РЎР¬ Р‘Р«Р›Рћ РЎР›РћРњРђРќРћ РќРђ РЎРђРњРћРњ Р”Р•Р›Р• (РёР·РјРµСЂРµРЅРѕ, Р° РЅРµ РІС‹РІРµРґРµРЅРѕ).
					// РџСЂРµРґС‹РґСѓС‰РёР№ РєРѕРјРјРµРЅС‚Р°СЂРёР№ РЅР° СЌС‚РѕРј РјРµСЃС‚Рµ вЂ” Рё Р·Р°РіРѕР»РѕРІРѕРє РєРѕРјРјРёС‚Р°
					// 1f65d674b вЂ” СѓС‚РІРµСЂР¶РґР°Р»Рё, С‡С‚Рѕ РїРѕРґРїРёСЃР°РЅРёРµ СЃ РџРЈРЎРўРћР™ РїРѕР»РєРё
					// (stock_quantity = 0) СѓРІРµР»РёС‡РёРІР°Р»Рѕ РѕСЃС‚Р°С‚РѕРє, РїРѕС‚РѕРјСѓ С‡С‚Рѕ `||`
					// РїСЂРёРЅРёРјР°Р» РЅРѕР»СЊ Р·Р° РѕС‚СЃСѓС‚СЃС‚РІСѓСЋС‰РµРµ Р·РЅР°С‡РµРЅРёРµ. Р­С‚Рѕ РќР•Р’Р•Р РќРћ Рё РЅРµ
					// РІРѕСЃРїСЂРѕРёР·РІРѕРґРёС‚СЃСЏ: РЅР° 1f65d674b^ РїСѓСЃС‚Р°СЏ РїРѕР»РєР° РѕС‚РІРµС‡Р°Р»Р°
					// 400 TransactionFailed РїСЂРё РѕСЃС‚Р°С‚РєРµ 0. РџСЂРёС‡РёРЅР° РІ С‚РѕРј, С‡С‚Рѕ
					// schema.ts РѕР±СЉСЏРІР»СЏРµС‚ РІСЃРµ С‚СЂРё РєРѕР»РѕРЅРєРё numeric, Р° drizzle РґР»СЏ
					// numeric РІС‹Р·С‹РІР°РµС‚ String(value) (PgNumeric.mapFromDriverValue),
					// РїРѕСЌС‚РѕРјСѓ РІ РјР°СЂС€СЂСѓС‚ РїСЂРёС…РѕРґРёС‚ СЃС‚СЂРѕРєР° "0" вЂ” РёСЃС‚РёРЅРЅР°СЏ. `||` РЅРµ РёРјРµР»
					// С€Р°РЅСЃР° РїСЂРѕРІР°Р»РёС‚СЊСЃСЏ, Рё Р·Р°РјРµРЅР° РµРіРѕ РЅР° `??` Р±С‹Р»Р° Р·Р°С‰РёС‚РЅРѕР№
					// РіРёРіРёРµРЅРѕР№, Р° РЅРµ РёСЃРїСЂР°РІР»РµРЅРёРµРј СЃРєР»Р°РґР°.
					//
					// РќР°СЃС‚РѕСЏС‰РёРµ РґРІР° РґРµС„РµРєС‚Р°, РѕР±Р° РІРѕСЃРїСЂРѕРёР·РІРµРґРµРЅС‹ РЅР° 1f65d674b^:
					//  1. РћРўР РР¦РђРўР•Р›Р¬РќРћР• quantity_to_deduct (-3 РїСЂРё РєРѕР»РёС‡РµСЃС‚РІРµ СѓСЃР»СѓРіРё
					//     2) РїРѕРґРЅРёРјР°Р»Рѕ РѕСЃС‚Р°С‚РѕРє 10 -> 16 Рё РїРёСЃР°Р»Рѕ РџРћР›РћР–РРўР•Р›Р¬РќРЈР® СЃС‚СЂРѕРєСѓ
					//     СЂР°СЃС…РѕРґР° "+6" СЃ С‚РёРїРѕРј auto_deduct. РџРѕРґРїРёСЃР°РЅРёРµ РїСЂРёС‘РјР°
					//     СЃРѕР·РґР°РІР°Р»Рѕ РјР°С‚РµСЂРёР°Р» РёР· РЅРёС‡РµРіРѕ.
					//  2. РџСЂР°РІРёР»Рѕ СЃРѕ СЃРїРёСЃР°РЅРёРµРј 0 РїРёСЃР°Р»Рѕ РјСѓСЃРѕСЂРЅСѓСЋ СЃС‚СЂРѕРєСѓ РґРІРёР¶РµРЅРёСЏ РЅР° 0.
					//     РћРЅРѕ СЃРїРёСЃС‹РІР°Р»Рѕ РёРјРµРЅРЅРѕ 0, Р° РЅРµ 1, РєР°Рє СѓС‚РІРµСЂР¶РґР°Р» С‚РѕС‚ РєРѕРјРјРёС‚.
					const ruleQuantity = Number(rule.quantityToDeduct);
					const serviceQuantity = Number(item.quantity);
					if (
						!isDeductibleQuantity(ruleQuantity) ||
						!isDeductibleQuantity(serviceQuantity)
					) {
						continue;
					}
					const qtyToDeduct = ruleQuantity * serviceQuantity;
					// РћСЃС‚Р°С‚РѕРє С‡РёС‚Р°РµС‚СЃСЏ СЂРѕРІРЅРѕ С‚Р°Рє Р¶Рµ, РєР°Рє РµРіРѕ С‡РёС‚Р°РµС‚ РµРґРёРЅСЃС‚РІРµРЅРЅС‹Р№
					// РґСЂСѓРіРѕР№ С‡РёС‚Р°С‚РµР»СЊ СЌС‚РѕР№ РєРѕР»РѕРЅРєРё вЂ” routes/inventory.ts:143. Р Р°РЅСЊС€Рµ
					// Р·РґРµСЃСЊ СЃС‚РѕСЏР» С„РѕР»Р±СЌРє `?? inv.currentQty`: РґР»СЏ СЃС‚СЂРѕРєРё СЃ
					// stock_quantity NULL С†РµСЂРµРјРѕРЅРёСЏ СЃРїРёСЃС‹РІР°Р»Р° РёР· СѓСЃС‚Р°СЂРµРІС€РµР№
					// current_qty Рё Р·Р°РїРёСЃС‹РІР°Р»Р° СЂРµР·СѓР»СЊС‚Р°С‚ РІ stock_quantity, С‚Рѕ РµСЃС‚СЊ
					// РїРѕР·РёС†РёСЏ, РєРѕС‚РѕСЂСѓСЋ СЃРєР»Р°Рґ РїРѕРєР°Р·С‹РІР°РµС‚ РєР°Рє 0, РџРћР›РЈР§РђР›Рђ РѕСЃС‚Р°С‚РѕРє.
					// Р’ Р¶РёРІРѕР№ Р±Р°Р·Рµ stock_quantity РѕР±СЉСЏРІР»РµРЅ NOT NULL (РїСЂРѕРІРµСЂРµРЅРѕ РІ
					// information_schema), РїРѕСЌС‚РѕРјСѓ РІРµС‚РєР° Р±С‹Р»Р° РЅРµРґРѕСЃС‚РёР¶РёРјР°, Р°
					// current_qty РІ РїСЂРѕРґСѓРєС‚Рµ РЅРµ РїРёС€РµС‚ РЅРёРєС‚Рѕ вЂ” Р±СЂР°С‚СЊ РѕСЃС‚Р°С‚РѕРє РѕС‚С‚СѓРґР°
					// Р·РЅР°С‡РёС‚ РїРѕРґСЃС‚Р°РІР»СЏС‚СЊ РІС‹РґСѓРјР°РЅРЅРѕРµ Р·РЅР°С‡РµРЅРёРµ РІРјРµСЃС‚Рѕ РЅРµРёР·РІРµСЃС‚РЅРѕРіРѕ.
					// РќРµРёР·РІРµСЃС‚РЅС‹Р№ РѕСЃС‚Р°С‚РѕРє РґРѕР»Р¶РµРЅ РїСЂРёРІРѕРґРёС‚СЊ Рє РѕС‚РєР°Р·Сѓ, Р° РЅРµ Рє СЂР°СЃС…РѕРґСѓ.
					const currentStock = Number(inv.stockQuantity ?? 0);
					if (!Number.isFinite(currentStock) || currentStock < qtyToDeduct) {
						throw new DiarySigningError(
							"InsufficientStock",
							`РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РјР°С‚РµСЂРёР°Р»РѕРІ: ${inv.name}`,
						);
					}
					// Р”РћР›Р“, Р Р•РЁР•РќРР• Р—Рђ Р’Р•Р”РЈР©РРњ: РІ Р¶РёРІРѕР№ Р±Р°Р·Рµ stock_quantity,
					// quantity_changed Рё quantity_to_deduct РёРјРµСЋС‚ С‚РёРї integer, С…РѕС‚СЏ
					// schema.ts РѕР±СЉСЏРІР»СЏРµС‚ РёС… numeric, Р° treatment_items.quantity вЂ”
					// РЅР°СЃС‚РѕСЏС‰РёР№ numeric(10,2). РџРѕСЌС‚РѕРјСѓ СѓСЃР»СѓРіР° СЃ РєРѕР»РёС‡РµСЃС‚РІРѕРј 1.5 РїСЂРё
					// РїСЂР°РІРёР»Рµ 1 С‚СЂРµР±СѓРµС‚ Р·Р°РїРёСЃР°С‚СЊ "8.5" РІ integer-РєРѕР»РѕРЅРєСѓ: PostgreSQL
					// РѕС‚РІРµСЂРіР°РµС‚ Р·Р°РїСЂРѕСЃ, РѕС€РёР±РєР° РґСЂР°Р№РІРµСЂР° РЅРµ СЏРІР»СЏРµС‚СЃСЏ DiarySigningError
					// Рё СѓС…РѕРґРёС‚ РІ РѕР±СЂР°Р±РѕС‚С‡РёРє server.ts РєР°Рє 500. РР·РјРµСЂРµРЅРѕ: РїРѕРґРїРёСЃР°РЅРёРµ
					// РїР°РґР°РµС‚, С‚СЂР°РЅР·Р°РєС†РёСЏ РѕС‚РєР°С‚С‹РІР°РµС‚СЃСЏ С†РµР»РёРєРѕРј (РѕСЃС‚Р°С‚РѕРє 10, РЅРѕР»СЊ СЃС‚СЂРѕРє
					// СЂР°СЃС…РѕРґР°, РґРЅРµРІРЅРёРє РЅРµ РїРѕРґРїРёСЃР°РЅ). РћРєСЂСѓРіР»СЏС‚СЊ Р·РґРµСЃСЊ РЅРµР»СЊР·СЏ вЂ” СЌС‚Рѕ
					// РІС‹РґСѓРјР°РЅРЅР°СЏ РїРѕР»РёС‚РёРєР° РЅР° РјР°С‚РµСЂРёР°Р»Р°С…. РќСѓР¶РЅР° РјРёРіСЂР°С†РёСЏ РєРѕР»РѕРЅРѕРє РІ
					// numeric, РІРЅРµ СЂР°РјРѕРє СЌС‚РѕРіРѕ РїР°РєРµС‚Р°.
					const quantityChanged = String(-qtyToDeduct);
					await tx
						.update(inventoryItems)
						.set({ stockQuantity: String(currentStock - qtyToDeduct) })
						.where(
							and(
								eq(inventoryItems.id, inv.id),
								eq(inventoryItems.organizationId, organizationId),
							),
						);

					await tx.insert(inventoryTransactions).values({
						organizationId,
						visitId: diary.visitId,
						inventoryItemId: inv.id,
						quantityChanged,
						unitCostRub: inv.unitCostRub != null ? String(inv.unitCostRub) : null,
						transactionType: "auto_deduct",
						userId,
					});
					deductions.push({
						inventoryItemId: inv.id,
						inventoryItemName: inv.name,
						quantityChanged,
					});
				}
			}
		}
	}

	// 3. РЎС‚Р°РІРєР° РІСЂР°С‡Р°, РµСЃР»Рё РµС‘ РµС‰С‘ РЅРµС‚
	if (userId) {
		const [existingCommission] = await tx
			.select()
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.userId, userId),
					eq(doctorCommissions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!existingCommission) {
			await tx.insert(doctorCommissions).values({
				organizationId,
				userId,
				specialty: "universal",
				serviceCategory: "therapy",
				commissionPct: "30.00",
				materialCostDeductionPct: "100.00",
				isActive: true,
			});
		}
	}

	// 4. РљР»РёРЅРёС‡РµСЃРєРёР№ Р¶СѓСЂРЅР°Р»
	const [auditLog] = await tx
		.insert(clinicalAuditLogs)
		.values({
			organizationId,
			patientId: diary.patientId,
			action: "VISIT_SIGNED_AND_LOCKED",
			userId,
			entityType: "visit_diary",
			entityId: diaryId,
		})
		.returning({ id: clinicalAuditLogs.id });

	/*
	 * DEFECT #46: signed 043 must mirror into visits before EGISZ export.
	 * Ceremony already holds the locked row; push non-empty SOAP в†’ EMK.
	 */
	if (diary.visitId) {
		await syncVisitEmkFromDiarySoap(tx, {
			visitId: diary.visitId,
			organizationId,
			anamnesis: diary.anamnesis,
			statusLocalis: diary.statusLocalis,
			diagnosisIcd10: diary.diagnosisIcd10,
			diagnosisTooth: diary.diagnosisTooth,
			treatmentDescription: diary.treatmentDescription,
		});
	}

	return {
		diaryId,
		hash,
		lockedAt,
		completedTreatmentItems,
		deductions,
		auditLogId: auditLog?.id ?? null,
	};
}

/**
 * РљС‚Рѕ РІРїСЂР°РІРµ РїРѕРґРїРёСЃР°С‚СЊ РґРЅРµРІРЅРёРє РїСЂРёС‘РјР°. РћРґРёРЅ С‚РµРєСЃС‚ РЅР° РґРІР° РјР°СЂС€СЂСѓС‚Р° РїРѕРґРїРёСЃР°РЅРёСЏ
 * (POST /api/diaries СЃРѕ СЃС‚Р°С‚СѓСЃРѕРј В«signedВ» Рё POST /api/diaries/:id/lock), РїРѕС‚РѕРјСѓ
 * С‡С‚Рѕ РґРµР№СЃС‚РІРёРµ С‡РµР»РѕРІРµРєР° РІ РѕР±РѕРёС… СЃР»СѓС‡Р°СЏС… РѕРґРЅРѕ Рё С‚Рѕ Р¶Рµ, Р° СЂР°СЃС…РѕРґСЏС‰РёРµСЃСЏ
 * С„РѕСЂРјСѓР»РёСЂРѕРІРєРё РѕРґРЅРѕРіРѕ РѕС‚РєР°Р·Р° вЂ” СЌС‚Рѕ С‚РѕС‚ Р¶Рµ РґРµС„РµРєС‚ РІ СЂР°СЃСЃСЂРѕС‡РєСѓ.
 *
 * РџРµСЂРµС‡РёСЃР»РµРЅРёСЏ В«РєС‚Рѕ РјРѕР¶РµС‚В» РёР· СЂРѕР»РµРІРѕР№ РјР°С‚СЂРёС†С‹ Р·РґРµСЃСЊ РЅРµС‚ РЅР°РјРµСЂРµРЅРЅРѕ: РїСЂР°РІРѕ
 * РїСЂРѕРІРµСЂСЏРµС‚СЃСЏ РїСЂСЏРјРѕ РІ СЌС‚РёС… РґРІСѓС… РјР°СЂС€СЂСѓС‚Р°С… СЃСЂР°РІРЅРµРЅРёРµРј СЂРѕР»Рё СЃРјРµРЅС‹ СЃ В«doctorВ» Рё
 * В«adminВ», Рё С„СЂР°Р·Р° РѕРїРёСЃС‹РІР°РµС‚ РёРјРµРЅРЅРѕ СЌС‚Рѕ СЃСЂР°РІРЅРµРЅРёРµ, Р° РЅРµ РјР°С‚СЂРёС†Сѓ
 * security/permissions.ts, РєРѕС‚РѕСЂР°СЏ Рє РЅРµРјСѓ РЅРµ РїСЂРёРјРµРЅСЏРµС‚СЃСЏ.
 */
const DIARY_SIGNING_ROLE_MESSAGE =
	"Р”РЅРµРІРЅРёРє РїСЂРёС‘РјР° РїРѕРґРїРёСЃС‹РІР°РµС‚ С‚РѕР»СЊРєРѕ РІСЂР°С‡ РёР»Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РєР»РёРЅРёРєРё: Сѓ РІР°С€РµР№ СЃРјРµРЅС‹ С‚Р°РєРѕРіРѕ РїСЂР°РІР° РЅРµС‚, Рё РїРѕРІС‚РѕСЂРЅС‹Р№ РІС…РѕРґ РµРіРѕ РЅРµ РґРѕР±Р°РІРёС‚. РџРѕР·РѕРІРёС‚Рµ РІСЂР°С‡Р°, РєРѕС‚РѕСЂС‹Р№ РІС‘Р» РїСЂРёС‘Рј, вЂ” РїРѕРґРїРёСЃР°С‚СЊ РјРѕР¶РµС‚ РѕРЅ.";

/**
 * DEFECT #46: dual-storage drift вЂ” 043 SOAP never reached visits EMK.
 *
 * Р‘Р«Р›Рћ: POST /api/diaries Рё /revise РїРёСЃР°Р»Рё С‚РѕР»СЊРєРѕ visit_diaries.*.
 * EGISZ CDA (`egisz.ts`) Рё РІРєР»Р°РґРєР° Р­РњРљ С‡РёС‚Р°СЋС‚ visits.anamnesis /
 * objectiveStatus / diagnosis / treatmentPlan. Р’СЂР°С‡ Р·Р°РїРѕР»РЅСЏР» 043/Сѓ вЂ”
 * СЋСЂРёРґРёС‡РµСЃРєРёР№ РЎР­РњР” СѓС…РѕРґРёР» РїСѓСЃС‚С‹Рј/СѓСЃС‚Р°СЂРµРІС€РёРј; Р­РњРљ РѕСЃС‚Р°РІР°Р»Р°СЃСЊ РїСѓСЃС‚РѕР№.
 *
 * РЎРўРђР›Рћ: РїРѕСЃР»Рµ draft save, signing ceremony Рё admin-revise РїСѓС€РёРј
 * РЅРµРїСѓСЃС‚С‹Рµ SOAP-РїРѕР»СЏ РІ visits С‚РѕР№ Р¶Рµ org. РџСѓСЃС‚РѕР№ SOAP РЅРµ Р·Р°С‚РёСЂР°РµС‚
 * Р±РѕР»РµРµ РїРѕР»РЅС‹Р№ С‚РµРєСЃС‚ Р­РњРљ (РІСЂР°С‡ РјРѕРі РІРµСЃС‚Рё РїРѕР»СЏ С‚РѕР»СЊРєРѕ РІ Р­РњРљ).
 * РњР°РїРїРёРЅРі РѕР±СЂР°С‚РµРЅ soapPrefillFromVisitNote:
 *   anamnesis в†’ visits.anamnesis
 *   statusLocalis в†’ visits.objectiveStatus
 *   diagnosisIcd10 + diagnosisTooth в†’ visits.diagnosis
 *   treatmentDescription в†’ visits.treatmentPlan
 * complaint РЅРµ С‚СЂРѕРіР°РµРј (РѕС‚РґРµР»СЊРЅРѕРµ РїРѕР»Рµ Р­РњРљ; РІ S-Р±Р»РѕРєРµ 043 РѕРЅРѕ СѓР¶Рµ
 * РјРѕРіР»Рѕ Р±С‹С‚СЊ СЃРєР»РµРµРЅРѕ РєР»РёРµРЅС‚РѕРј РїСЂРё prefill).
 */
function buildEmkDiagnosisText(
	diagnosisIcd10?: string | null,
	diagnosisTooth?: string | null,
): string | null {
	const icd = (diagnosisIcd10 ?? "").trim();
	const tooth = (diagnosisTooth ?? "").trim();
	/*
	 * DEFECT #53: tooth-only must not become visits.diagnosis.
	 * Р‘Р«Р›Рћ: return `Р—СѓР± ${tooth}` when ICD empty в†’ draft/lock/revise sync
	 * overwrote EMK diagnosis that still had РњРљР‘ (e.g. В«K02.1 РљР°СЂРёРµСЃВ»)
	 * with В«Р—СѓР± 36В». EGISZ gate and tab Р­РњРљ lost the code; CDA then had to
	 * recover via #52 fallback. РЎРўРђР›Рћ: push diagnosis only when ICD present
	 * (optionally with tooth). Tooth alone stays on visit_diaries only.
	 */
	if (!icd) return null;
	if (tooth) return `${icd} | Р—СѓР± ${tooth}`;
	return icd;
}

async function syncVisitEmkFromDiarySoap(
	executor: Pick<DiaryDbTransaction, "update">,
	params: {
		visitId: string;
		organizationId: string;
		anamnesis?: string | null;
		statusLocalis?: string | null;
		diagnosisIcd10?: string | null;
		diagnosisTooth?: string | null;
		treatmentDescription?: string | null;
	},
): Promise<void> {
	const visitId =
		typeof params.visitId === "string" ? params.visitId.trim() : "";
	if (!visitId) return;

	const patch: {
		anamnesis?: string;
		objectiveStatus?: string;
		diagnosis?: string;
		treatmentPlan?: string;
		updatedAt: Date;
	} = { updatedAt: new Date() };

	const anamnesis = (params.anamnesis ?? "").trim();
	if (anamnesis) patch.anamnesis = anamnesis;

	const objective = (params.statusLocalis ?? "").trim();
	if (objective) patch.objectiveStatus = objective;

	const diagnosisText = buildEmkDiagnosisText(
		params.diagnosisIcd10,
		params.diagnosisTooth,
	);
	if (diagnosisText) patch.diagnosis = diagnosisText;

	const treatment = (params.treatmentDescription ?? "").trim();
	if (treatment) patch.treatmentPlan = treatment;

	if (
		patch.anamnesis === undefined &&
		patch.objectiveStatus === undefined &&
		patch.diagnosis === undefined &&
		patch.treatmentPlan === undefined
	) {
		return;
	}

	await executor
		.update(visits)
		.set(patch)
		.where(
			and(
				eq(visits.id, visitId),
				eq(visits.organizationId, params.organizationId),
			),
		);
}

export default async function registerDiaryRoutes(app: FastifyInstance) {
	app.get("/api/diaries/visit/:visitId", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary"))) return;
		const parsedVisitParams = diaryVisitParamsSchema.safeParse(req.params);
		if (!parsedVisitParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РїСЂРёС‘РјР° РІ Р°РґСЂРµСЃРµ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ UUID (visitId).",
			});
		}
		const { visitId } = parsedVisitParams.data;
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply
				.code(403)
				.send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_READ_MESSAGE });

		/*
		 * Р‘Р«Р›Рћ: РЅРµС‚ СЃС‚СЂРѕРєРё visit_diaries в†’ { diary: null } Рё РґР»СЏ С‡СѓР¶РѕРіРѕ UUID,
		 * Рё РґР»СЏ СЂРµР°Р»СЊРЅРѕРіРѕ РїСЂРёС‘РјР° Р±РµР· РґРЅРµРІРЅРёРєР°. РљР»РёРµРЅС‚ СЂРёСЃРѕРІР°Р» В«РїСѓСЃС‚РѕР№ SOAPВ»
		 * РєР°Рє РЅРѕРІС‹Р№ РїСЂРёС‘Рј. РЎРўРђР›Рћ: visit в€‰ org в†’ 404; РїСѓСЃС‚РѕР№ РґРЅРµРІРЅРёРє вЂ” null.
		 */
		const [visitRow] = await db
			.select({ id: visits.id })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);
		if (!visitRow) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "РџСЂРёС‘Рј РЅРµ РЅР°Р№РґРµРЅ РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ, РґРЅРµРІРЅРёРє 043/Сѓ РѕС‚РєСЂС‹С‚СЊ РЅРµР»СЊР·СЏ.",
			});
		}

		const [diary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, orgId),
				),
			);

		if (!diary) {
			return reply.send({ diary: null });
		}
		/*
		 * DEFECT #36: Р¤РРћ РІСЂР°С‡Р° РґР»СЏ РїРµС‡Р°С‚Рё 043/Сѓ.
		 * Р‘Р«Р›Рћ: GET РѕС‚РґР°РІР°Р» С‚РѕР»СЊРєРѕ UUID doctorId/lockedByUserId; РєР»РёРµРЅС‚ РїРµС‡Р°С‚Рё
		 * Р±СЂР°Р» ctx.activeDoctor (РєС‚Рѕ РЎР•Р™Р§РђРЎ РІ СЃРјРµРЅРµ). РђРґРјРёРЅ/РґСЂСѓРіРѕР№ РІСЂР°С‡
		 * РїРµС‡Р°С‚Р°Р» С‡СѓР¶РѕР№ РїРѕРґРїРёСЃР°РЅРЅС‹Р№ РґРЅРµРІРЅРёРє вЂ” РІ В«Р’СЂР°С‡:В» РїРѕРїР°РґР°Р»Рѕ С‡СѓР¶РѕРµ Р¤РРћ.
		 * РЎРўРђР›Рћ: СЂРµР·РѕР»РІРёРј Р¤РРћ РїРѕ doctorId в†’ lockedByUserId в†’ authorId в†’
		 * draftAuthorId РІРЅСѓС‚СЂРё org Рё РѕС‚РґР°С‘Рј doctorFullName / doctorSpecialty.
		 */
		const signingUserId =
			diary.doctorId ??
			diary.lockedByUserId ??
			diary.authorId ??
			diary.draftAuthorId ??
			null;
		let doctorFullName: string | null = null;
		let doctorSpecialty: string | null = null;
		if (typeof signingUserId === "string" && signingUserId.length > 0) {
			const [docUser] = await db
				.select({
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.id, signingUserId),
						eq(users.organizationId, orgId),
					),
				)
				.limit(1);
			if (docUser) {
				doctorFullName =
					typeof docUser.fullName === "string" && docUser.fullName.trim()
						? docUser.fullName.trim()
						: null;
				/*
				 * DEFECT #41: specialty from users.specialties jsonb.
				 * Р‘Р«Р›Рћ: doctorSpecialty = null РІСЃРµРіРґР° вЂ” РїРµС‡Р°С‚СЊ 043/Сѓ В«Р’СЂР°С‡: Р¤РРћВ»
				 * Р±РµР· В«(С‚РµСЂР°РїРёСЏ)В» РїРѕСЃР»Рµ F5 / С‡СѓР¶РѕР№ СЃРјРµРЅС‹.
				 */
				doctorSpecialty = formatDoctorSpecialtyLabel(docUser.specialties);
			}
		}
		/*
		 * РќРµ РѕС‚РґР°С‘Рј legacy PIN:<digits> РІ Р±СЂР°СѓР·РµСЂ: РѕС‚С‚РёСЃРє Р±С‹Р», С†РёС„СЂ PIN вЂ” РЅРµС‚.
		 * SIMPLE_PIN_EP|вЂ¦ Рё PKCS#7 РїСЂРѕС…РѕРґСЏС‚ РєР°Рє РµСЃС‚СЊ (С†РёС„СЂ PIN РІ РЅРёС… РЅРµС‚).
		 */
		return reply.send({
			diary: {
				...diary,
				cryptoSignaturePkcs7: redactLegacyPinSignature(
					diary.cryptoSignaturePkcs7,
				),
				doctorFullName,
				doctorSpecialty,
			},
		});
	});

	app.get("/api/diaries/:id/revisions", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary revisions")))
			return;
		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РґРЅРµРІРЅРёРєР° РІ Р°РґСЂРµСЃРµ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE,
			});

		// Verify diary belongs to org
		const [diary] = await db
			.select({ id: visitDiaries.id })
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!diary)
			return reply
				.code(404)
				.send({ error: "NotFound", message: DIARY_NOT_FOUND_REVISIONS_MESSAGE });

		/*
		 * Tenant isolation: organizationId РЅР° РєР°Р¶РґРѕРј Р·Р°РїСЂРѕСЃРµ.
		 * Р‘Р«Р›Рћ: where С‚РѕР»СЊРєРѕ РїРѕ diaryId вЂ” РїСЂРё РёР·РІРµСЃС‚РЅРѕРј UUID РґРЅРµРІРЅРёРєР° С‡СѓР¶РѕР№
		 * РєР»РёРЅРёРєРё (РёР»Рё Р±РёС‚РѕР№ СЃС‚СЂРѕРєРµ СЂРµРІРёР·РёРё СЃ С‡СѓР¶РёРј org) forensic-РёСЃС‚РѕСЂРёСЏ
		 * 043/Сѓ РјРѕРіР»Р° СѓР№С‚Рё РЅРµ С‚РѕРјСѓ Р°СЂРµРЅРґР°С‚РѕСЂСѓ. diaryId СѓР¶Рµ РїСЂРѕРІРµСЂРµРЅ РІС‹С€Рµ,
		 * orgId РІ where вЂ” РІС‚РѕСЂРѕР№ Р·Р°РјРѕРє РїРѕ РїСЂР°РІРёР»Сѓ РёР·РѕР»СЏС†РёРё.
		 */
		const revisions = await db
			.select()
			.from(visitDiaryRevisions)
			.where(
				and(
					eq(visitDiaryRevisions.diaryId, id),
					eq(visitDiaryRevisions.organizationId, orgId),
				),
			)
			.orderBy(desc(visitDiaryRevisions.revisedAt));

		/*
		 * DEFECT #44: РєС‚Рѕ РїСЂР°РІРёР» 043/Сѓ вЂ” Р¤РРћ, РЅРµ UUID.
		 * Р‘Р«Р›Рћ: GET вЂ¦/revisions РѕС‚РґР°РІР°Р» revisedByUserId СЃС‹СЂС‹Рј UUID;
		 * РєР»РёРµРЅС‚ Forensic UI РїРѕРєР°Р·С‹РІР°Р» С‚РѕР»СЊРєРѕ when + reason + previous_*.
		 * РЎСѓРґ/РїСЂРѕРІРµСЂРєР° РєР°С‡РµСЃС‚РІР° РЅРµ РІРёРґРµР»Рё, РљРўРћ РІРЅС‘СЃ РїСЂР°РІРєСѓ РїРѕСЃР»Рµ РїРѕРґРїРёСЃРё.
		 * РЎРўРђР›Рћ: batch-resolve fullName РІРЅСѓС‚СЂРё org в†’ revisedByFullName.
		 */
		const reviserIds = Array.from(
			new Set(
				revisions
					.map((r) => r.revisedByUserId)
					.filter((uid): uid is string => typeof uid === "string" && uid.length > 0),
			),
		);
		const reviserNameById = new Map<string, string>();
		if (reviserIds.length > 0) {
			const reviserRows = await db
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(and(inArray(users.id, reviserIds), eq(users.organizationId, orgId)));
			for (const row of reviserRows) {
				const name = typeof row.fullName === "string" ? row.fullName.trim() : "";
				if (name) reviserNameById.set(row.id, name);
			}
		}
		const revisionsWithAuthor = revisions.map((r) => {
			const uid =
				typeof r.revisedByUserId === "string" && r.revisedByUserId.length > 0
					? r.revisedByUserId
					: null;
			const revisedByFullName = uid ? (reviserNameById.get(uid) ?? null) : null;
			return { ...r, revisedByFullName };
		});

		return reply.send({ revisions: revisionsWithAuthor });
	});

	app.post("/api/diaries", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "write diary")))
			return;
		const parsedUpsert = diaryUpsertSchema.safeParse(req.body);
		if (!parsedUpsert.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "РџСЂРѕРІРµСЂСЊС‚Рµ РїРѕР»СЏ РґРЅРµРІРЅРёРєР° РїСЂРёС‘РјР°. РќСѓР¶РЅС‹ РєРѕСЂСЂРµРєС‚РЅС‹Рµ visitId Рё patientId (UUID).",
			});
		}
		const data = parsedUpsert.data;
		const userContext = req.user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply
				.code(403)
				.send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE });
		data.organizationId = orgId;

		/*
		 * РџСЂРёРІСЏР·РєР° 043/Сѓ Рє СЂРµР°Р»СЊРЅРѕРјСѓ РїСЂРёС‘РјСѓ РєР»РёРЅРёРєРё.
		 * Р‘Р«Р›Рћ: insert/update visit_diaries СЃ visitId/patientId РёР· С‚РµР»Р° Р±РµР·
		 * РїСЂРѕРІРµСЂРєРё visits. РЈ visit_diaries.visit_id РќР•Рў FK вЂ” Р»СЋР±РѕР№ UUID
		 * РїСЂРёРЅРёРјР°Р»СЃСЏ. РњРѕР¶РЅРѕ Р±С‹Р»Рѕ Р·Р°РІРµСЃС‚Рё РґРЅРµРІРЅРёРє РЅР° С‡СѓР¶РѕР№/РЅРµСЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№
		 * РїСЂРёС‘Рј РёР»Рё РїРѕРґРјРµРЅРёС‚СЊ patientId (С…РµС€ 043/Сѓ Рё РїРµС‡Р°С‚СЊ вЂ” РЅР° В«Р»РµРІРѕРјВ»
		 * РїР°С†РёРµРЅС‚Рµ). РЎРўРђР›Рћ: visit в€€ org, patientId СЃРѕРІРїР°РґР°РµС‚ СЃ РєР°СЂС‚РѕС‡РєРѕР№
		 * РїСЂРёС‘РјР° вЂ” РґРѕ С‚СЂР°РЅР·Р°РєС†РёРё Рё РґРѕ Р·Р°РїРёСЃРё РЅР° РґРёСЃРє/РІ Р‘Р”.
		 */
		const [visitForDiary] = await db
			.select({ id: visits.id, patientId: visits.patientId })
			.from(visits)
			.where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)))
			.limit(1);
		if (!visitForDiary) {
			return reply.code(403).send({
				error: "VisitNotInClinic",
				message:
					"РџСЂРёС‘Рј РЅРµ РЅР°Р№РґРµРЅ РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ вЂ” РґРЅРµРІРЅРёРє 043/Сѓ Рє РЅРµРјСѓ РЅРµ РїСЂРёРІСЏР·Р°С‚СЊ. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ РёР· СЂР°СЃРїРёСЃР°РЅРёСЏ.",
			});
		}
		if (visitForDiary.patientId !== data.patientId) {
			return reply.code(400).send({
				error: "PatientVisitMismatch",
				message:
					"РџР°С†РёРµРЅС‚ РІ Р·Р°РїСЂРѕСЃРµ РЅРµ СЃРѕРІРїР°РґР°РµС‚ СЃ РєР°СЂС‚РѕС‡РєРѕР№ СЌС‚РѕРіРѕ РїСЂРёС‘РјР°. РћР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ РїСЂРёС‘РјР° Рё СЃРѕС…СЂР°РЅРёС‚Рµ РґРЅРµРІРЅРёРє СЃРЅРѕРІР°.",
			});
		}

		const isSigning = data.status === "signed";

		if (isSigning && role !== "doctor" && role !== "admin") {
			// Р“РѕР»С‹Р№ РєРѕРґ РѕС‚РєР°Р·Р° Р·РґРµСЃСЊ РґР°РІР°Р» СЃР°РјРѕРµ РІСЂРµРґРЅРѕРµ РёР· РІРѕР·РјРѕР¶РЅС‹С… СѓРєР°Р·Р°РЅРёР№:
			// РєР»РёРµРЅС‚ СЃС‚СЂРѕРёС‚ РїРѕ 403 В«РІРѕР№РґРёС‚Рµ РІ СЃРјРµРЅСѓ Р·Р°РЅРѕРІРѕ РёР»Рё РїРѕРїСЂРѕСЃРёС‚Рµ
			// Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РѕС‚РєСЂС‹С‚СЊ РґРѕСЃС‚СѓРїВ», Р° РїРѕРІС‚РѕСЂРЅС‹Р№ РІС…РѕРґ Р°СЃСЃРёСЃС‚РµРЅС‚Сѓ РїСЂР°РІР°
			// РїРѕРґРїРёСЃС‹РІР°С‚СЊ РґРЅРµРІРЅРёРє РЅРµ РґРѕР±Р°РІРёС‚ РќРРљРћР“Р”Рђ. РџСЂРёС‡РёРЅР° Сѓ СЃРµСЂРІРµСЂР° СѓСЃС‚Р°РЅРѕРІР»РµРЅР°
			// С‚РѕС‡РЅРѕ вЂ” СЂРѕР»СЊ СЃРјРµРЅС‹ РЅРµ РІСЂР°С‡ Рё РЅРµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ, вЂ” Рё РЅР°Р·РІР°РЅР° РѕРЅР° Р±РµР·
			// РІРЅСѓС‚СЂРµРЅРЅРµРіРѕ РєР»СЋС‡Р° СЂРѕР»Рё, РєРѕС‚РѕСЂС‹Р№ С‡РµР»РѕРІРµРєСѓ РЅРёС‡РµРіРѕ РЅРµ РіРѕРІРѕСЂРёС‚.
			return reply.code(403).send({
				error: "OnlyDoctorsCanSign",
				message: DIARY_SIGNING_ROLE_MESSAGE,
			});
		}

		try {
			// Р§РµСЂРЅРѕРІРёРє Рё РїРѕРґРїРёСЃР°РЅРёРµ вЂ” РѕРґРЅР° С‚СЂР°РЅР·Р°РєС†РёСЏ. Р‘Р«Р›Рћ: С‚СЂРё РѕС‚РґРµР»СЊРЅС‹С… Р·Р°РїСЂРѕСЃР°
			// Р±РµР· С‚СЂР°РЅР·Р°РєС†РёРё, РїРѕСЌС‚РѕРјСѓ СѓРїР°РІС€РµРµ СЃРїРёСЃР°РЅРёРµ РѕСЃС‚Р°РІР»СЏР»Рѕ РґРЅРµРІРЅРёРє СѓР¶Рµ
			// РїРѕРґРїРёСЃР°РЅРЅС‹Рј, Р° СЃРєР»Р°Рґ вЂ” РЅРµС‚СЂРѕРЅСѓС‚С‹Рј.
			const outcome = await db.transaction(async (tx) => {
				/*
				 * DEFECT #73: Form 043/Сѓ clinical fields immutable when is_locked.
				 *
				 * Р‘Р«Р›Рћ: SELECT without FOR UPDATE, then UPDATE by id+org only.
				 * Concurrent POST /lock could commit is_locked=true between the
				 * read and the write; draft save still rewrote anamnesis /
				 * diagnosis / treatment / tray on the already-signed 043/Сѓ.
				 * Signing ceremony already uses FOR UPDATE; draft path did not.
				 *
				 * РЎРўРђР›Рћ: row lock via FOR UPDATE, re-check isLocked, and UPDATE
				 * WHERE is_locked=false. Zero matched rows в†’ AlreadyLocked.
				 */
				const [existing] = await tx
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.visitId, data.visitId),
							eq(visitDiaries.organizationId, orgId),
						),
					)
					.limit(1)
					.for("update");

				if (existing?.isLocked) {
					throw new DiarySigningError(
						"AlreadyLocked",
						"Р”РЅРµРІРЅРёРє РїРѕРґРїРёСЃР°РЅ Рё Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ.",
					);
				}


				let diaryId: string;
				if (existing) {
					const updatedRows = await tx
						.update(visitDiaries)
						// Р‘Р«Р›Рћ: `data.X ?? existing.X` РїРѕ РІСЃРµРј РєР»РёРЅРёС‡РµСЃРєРёРј РїРѕР»СЏРј. РџСѓСЃС‚Р°СЏ
						// СЃС‚СЂРѕРєР° вЂ” СЌС‚Рѕ РЅРµ undefined, РЅРѕ С„СЂРѕРЅС‚РµРЅРґ С‡Р°СЃС‚Рѕ РЅРµ РїСЂРёСЃС‹Р»Р°РµС‚ РїРѕР»Рµ
						// РІРѕРІСЃРµ, Рё РІСЂР°С‡ РќР• РњРћР“ СѓРґР°Р»РёС‚СЊ РѕС€РёР±РѕС‡РЅРѕ РІРЅРµСЃС‘РЅРЅС‹Р№ С‚РµРєСЃС‚: РѕРЅ СЃС‚РёСЂР°Р»
						// РїРѕР»Рµ, СЃРѕС…СЂР°РЅСЏР», Р° РїСЂРµР¶РЅСЏСЏ Р·Р°РїРёСЃСЊ РјРѕР»С‡Р° РІРѕР·РІСЂР°С‰Р°Р»Р°СЃСЊ. Р”Р»СЏ РёСЃС‚РѕСЂРёРё
						// Р±РѕР»РµР·РЅРё СЌС‚Рѕ РѕРїР°СЃРЅРµРµ РѕРїРµС‡Р°С‚РєРё вЂ” РІ РєР°СЂС‚Рµ РѕСЃС‚Р°С‘С‚СЃСЏ РЅРµРІРµСЂРЅС‹Р№ Р°РЅР°РјРЅРµР·
						// РёР»Рё РЅРµСЃСѓС‰РµСЃС‚РІСѓСЋС‰РµРµ РѕСЃР»РѕР¶РЅРµРЅРёРµ.
						// РўРµРїРµСЂСЊ РїРѕР»Рµ РїРµСЂРµРїРёСЃС‹РІР°РµС‚СЃСЏ, РµСЃР»Рё РѕРЅРѕ РџР РРЎРЈРўРЎРўР’РЈР•Рў РІ Р·Р°РїСЂРѕСЃРµ
						// (РІРєР»СЋС‡Р°СЏ РїСѓСЃС‚СѓСЋ СЃС‚СЂРѕРєСѓ), Рё СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ, С‚РѕР»СЊРєРѕ РµСЃР»Рё РЅРµ РїРµСЂРµРґР°РЅРѕ.
						.set({
							anamnesis: data.anamnesis !== undefined ? data.anamnesis : existing.anamnesis,
							statusLocalis:
								data.statusLocalis !== undefined ? data.statusLocalis : existing.statusLocalis,
							diagnosisIcd10:
								data.diagnosisIcd10 !== undefined ? data.diagnosisIcd10 : existing.diagnosisIcd10,
							diagnosisTooth:
								data.diagnosisTooth !== undefined ? data.diagnosisTooth : existing.diagnosisTooth,
							treatmentDescription:
								data.treatmentDescription !== undefined
									? data.treatmentDescription
									: existing.treatmentDescription,
							complications:
								data.complications !== undefined ? data.complications : existing.complications,
							comorbidities:
								data.comorbidities !== undefined ? data.comorbidities : existing.comorbidities,
							updatedAt: new Date(),
							/*
							 * Р›РѕС‚РѕРє РІ draft (DEFECT #33).
							 * Р‘Р«Р›Рћ: РїСѓСЃС‚Р°СЏ СЃС‚СЂРѕРєР° РїРёСЃР°Р»Р°СЃСЊ РєР°Рє ""; РєР»РёРµРЅС‚ РѕРїСѓСЃРєР°Р»
							 * РїРѕР»Рµ РїСЂРё clear в†’ existing barcode РѕСЃС‚Р°РІР°Р»СЃСЏ.
							 * РЎРўРђР›Рћ: РїРѕР»Рµ РµСЃС‚СЊ в†’ trim; РїСѓСЃС‚Рѕ в†’ null.
							 */
							instrumentTrayBarcode:
								data.instrumentTrayBarcode !== undefined
									? data.instrumentTrayBarcode.trim() || null
									: existing.instrumentTrayBarcode,
							/*
							 * DEFECT #40: progressive author/doctor + last draft editor.
							 * Р‘Р«Р›Рћ: draft UPDATE РЅРµ С‚СЂРѕРіР°Р» authorId/doctorId/draftAuthorId.
							 * Insert (#35) РїРёС€РµС‚ РёС… С‚РѕР»СЊРєРѕ РїСЂРё РџР•Р Р’РћРњ create. Legacy-СЃС‚СЂРѕРєРё
							 * СЃ null doctorId Рё С‡РµСЂРЅРѕРІРёРєРё, СЃРѕР·РґР°РЅРЅС‹Рµ РґРѕ #35, РѕСЃС‚Р°РІР°Р»РёСЃСЊ
							 * Р±РµР· РІСЂР°С‡Р° РґРѕ /lock вЂ” GET doctorFullName null, РїРµС‡Р°С‚СЊ 043/Сѓ
							 * Рё BI РЅР° РЅРµР·Р°РєСЂС‹С‚С‹С… РїСЂРёС‘РјР°С… РїСѓСЃС‚С‹Рµ. draftAuthorId Р·Р°СЃС‚С‹РІР°Р»
							 * РЅР° СЃРѕР·РґР°С‚РµР»Рµ, С…РѕС‚СЏ РїСЂР°РІРєРё РІРЅРѕСЃРёС‚ РґСЂСѓРіРѕР№ СЃРѕС‚СЂСѓРґРЅРёРє.
							 * РЎРўРђР›Рћ: authorId/doctorId Р·Р°РїРѕР»РЅСЏСЋС‚СЃСЏ С‚РѕР»СЊРєРѕ РµСЃР»Рё null
							 * (РЅРµ РїРµСЂРµРїРёСЃС‹РІР°РµРј Р»РµС‡Р°С‰РµРіРѕ РїРѕСЃР»Рµ Р°СЃСЃРёСЃС‚РµРЅС‚Р°в†’РІСЂР°С‡ РґРѕ lock);
							 * draftAuthorId = С‚РµРєСѓС‰РёР№ userId (РїРѕСЃР»РµРґРЅРёР№ СЂРµРґР°РєС‚РѕСЂ С‡РµСЂРЅРѕРІРёРєР°).
							 * Lock ceremony РїРѕ-РїСЂРµР¶РЅРµРјСѓ authoritative РґР»СЏ doctorId.
							 */
							authorId: existing.authorId ?? userId,
							doctorId: existing.doctorId ?? userId,
							draftAuthorId: userId,
						})
						.where(
							and(
								eq(visitDiaries.id, existing.id),
								eq(visitDiaries.organizationId, orgId),
								/* DEFECT #73: never rewrite clinical columns on locked 043/Сѓ */
								eq(visitDiaries.isLocked, false),
							),
						)
						.returning({ id: visitDiaries.id });
					if (updatedRows.length === 0) {
						throw new DiarySigningError(
							"AlreadyLocked",
							"Р”РЅРµРІРЅРёРє РїРѕРґРїРёСЃР°РЅ Рё Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ.",
						);
					}
					diaryId = existing.id;

				} else {
					// Р”РЅРµРІРЅРёРє РІСЃРµРіРґР° СЂРѕР¶РґР°РµС‚СЃСЏ С‡РµСЂРЅРѕРІРёРєРѕРј. Р‘Р«Р›Рћ: РїСЂРё status "signed"
					// РІСЃС‚Р°РІРєР° СЃСЂР°Р·Сѓ СЃС‚Р°РІРёР»Р° is_locked, РІСЂРµРјСЏ Рё С…РµС€ вЂ” РґРЅРµРІРЅРёРє РїРѕСЏРІР»СЏР»СЃСЏ
					// СѓР¶Рµ РїРѕРґРїРёСЃР°РЅРЅС‹Рј, РјРёРЅСѓСЏ С†РµСЂРµРјРѕРЅРёСЋ С†РµР»РёРєРѕРј.
					const inserted = await tx
						.insert(visitDiaries)
						.values({
							organizationId: orgId,
							visitId: data.visitId,
							patientId: data.patientId,
							anamnesis: data.anamnesis,
							statusLocalis: data.statusLocalis,
							diagnosisIcd10: data.diagnosisIcd10,
							diagnosisTooth: data.diagnosisTooth,
							treatmentDescription: data.treatmentDescription,
							complications: data.complications,
							comorbidities: data.comorbidities,
							draftAuthorId: userId,
						/*
						 * DEFECT #35: progressive fill author/doctor on first draft.
						 * Lock ceremony overwrites with signing user (authoritative).
						 */
						authorId: userId,
						doctorId: userId,
							instrumentTrayBarcode:
								typeof data.instrumentTrayBarcode === "string"
									? data.instrumentTrayBarcode.trim() || null
									: data.instrumentTrayBarcode ?? null,
						})
						.returning({ id: visitDiaries.id });
					const insertedId = inserted[0]?.id;
					if (!insertedId) {
						// Р”РЅРµРІРЅРёРє РїСЂРёС‘РјР° вЂ” СЋСЂРёРґРёС‡РµСЃРєРёР№ РґРѕРєСѓРјРµРЅС‚. РџРµСЂРІРѕРµ, С‡С‚Рѕ С‡РµР»РѕРІРµРє
						// РѕР±СЏР·Р°РЅ СѓСЃР»С‹С€Р°С‚СЊ, вЂ” С‡С‚Рѕ РЅР°Р±СЂР°РЅРЅС‹Р№ С‚РµРєСЃС‚ РµС‰С‘ РЅР° СЌРєСЂР°РЅРµ Рё РµРіРѕ
						// РЅРµР»СЊР·СЏ С‚РµСЂСЏС‚СЊ; В«РїРѕРІС‚РѕСЂРёС‚РµВ» Р·РґРµСЃСЊ Р±С‹Р»Рѕ Р±С‹ Р»РѕР¶СЊСЋ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ
						// РїРѕРІС‚РѕСЂ СЃРѕР±РµСЂС‘С‚ С‚РѕС‚ Р¶Рµ Р·Р°РїСЂРѕСЃ.
						throw new DiarySigningError(
							"NotSaved",
							"Р”РЅРµРІРЅРёРє РїСЂРёС‘РјР° РЅРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РЅР° СЃРµСЂРІРµСЂРµ, РїРѕСЌС‚РѕРјСѓ РѕРЅ РЅРµ РїРѕРґРїРёСЃР°РЅ. РќРµ Р·Р°РєСЂС‹РІР°Р№С‚Рµ РїСЂРёС‘Рј: РЅР°Р±СЂР°РЅРЅС‹Р№ С‚РµРєСЃС‚ РµС‰С‘ РЅР° СЌРєСЂР°РЅРµ, СЃРєРѕРїРёСЂСѓР№С‚Рµ РµРіРѕ РІ РЅР°РґС‘Р¶РЅРѕРµ РјРµСЃС‚Рѕ Рё РїРѕР·РѕРІРёС‚Рµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РєР»РёРЅРёРєРё.",
						);
					}
					diaryId = insertedId;
				}

				if (!isSigning) {
					/*
					 * РћС‚РїРµС‡Р°С‚РѕРє СЃРѕРґРµСЂР¶РёРјРѕРіРѕ С‡РµСЂРЅРѕРІРёРєР° вЂ” РґРѕ РїРѕРґРїРёСЃР°РЅРёСЏ.
					 *
					 * Р‘Р«Р›Рћ: diary_hash РїРёСЃР°Р»СЃСЏ С‚РѕР»СЊРєРѕ РІ runDiarySigningCeremony (/lock).
					 * POST draft РІРѕР·РІСЂР°С‰Р°Р» hash: null. CryptoProSigner РїРѕРґРїРёСЃС‹РІР°РµС‚
					 * diaryHash; Сѓ РЅРµРїРѕРґРїРёСЃР°РЅРЅРѕРіРѕ РґРЅРµРІРЅРёРєР° РѕРЅ РІСЃРµРіРґР° null в†’ РІРєР»Р°РґРєР°
					 * В«РљСЂРёРїС‚РѕРџСЂРѕВ» РЅР°РІСЃРµРіРґР° CRYPTO_SIGNING_UNAVAILABLE_TEXT, hasEcp=false
					 * РІ РїРµС‡Р°С‚Рё 043/Сѓ РґРѕ lock, Р° Рє lock Р±РµР· С…РµС€Р° РљСЂРёРїС‚РѕРџСЂРѕ РЅРµ РґРѕС…РѕРґРёС‚.
					 *
					 * РЎРўРђР›Рћ: РїРѕСЃР»Рµ upsert СЃС‡РёС‚Р°РµРј computeDiaryHash РїРѕ СЃС‚СЂРѕРєРµ РІ Р‘Р”,
					 * РїРёС€РµРј diary_hash (Р·Р°РјРѕРє is_locked РЅРµ С‚СЂРѕРіР°РµРј) Рё РѕС‚РґР°С‘Рј hash
					 * РєР»РёРµРЅС‚Сѓ вЂ” doSave РєР»Р°РґС‘С‚ РµРіРѕ РІ state, РѕРєРЅРѕ Р­Р¦Рџ РјРѕР¶РµС‚ РїРѕРґРїРёСЃР°С‚СЊ.
					 */
					const [savedRow] = await tx
						.select()
						.from(visitDiaries)
						.where(
							and(
								eq(visitDiaries.id, diaryId),
								eq(visitDiaries.organizationId, orgId),
							),
						)
						.limit(1);
					if (!savedRow) {
						return {
							diaryId,
							signing: null as DiarySigningResult | null,
							draftHash: null as string | null,
						};
					}
					const draftHash = computeDiaryHash(
						savedRow.visitId,
						savedRow.patientId ?? "",
						savedRow.anamnesis,
						savedRow.statusLocalis,
						savedRow.treatmentDescription,
						savedRow.diagnosisIcd10,
						savedRow.diagnosisTooth,
						savedRow.complications,
						savedRow.comorbidities,
						savedRow.instrumentTrayBarcode,
					);
					await tx
						.update(visitDiaries)
						.set({ diaryHash: draftHash, updatedAt: new Date() })
						.where(
							and(
								eq(visitDiaries.id, diaryId),
								eq(visitDiaries.organizationId, orgId),
								/* DEFECT #73: draft hash only while unlocked */
								eq(visitDiaries.isLocked, false),
							),
						);
					/*
					 * DEFECT #46: push 043 SOAP в†’ visits EMK on draft save.
					 * Same transaction as diary_hash write so EGISZ/EMK never
					 * see a saved 043 without mirrored clinical fields.
					 */
					await syncVisitEmkFromDiarySoap(tx, {
						visitId: savedRow.visitId,
						organizationId: orgId,
						anamnesis: savedRow.anamnesis,
						statusLocalis: savedRow.statusLocalis,
						diagnosisIcd10: savedRow.diagnosisIcd10,
						diagnosisTooth: savedRow.diagnosisTooth,
						treatmentDescription: savedRow.treatmentDescription,
					});
					return {
						diaryId,
						signing: null as DiarySigningResult | null,
						draftHash,
					};
				}

				/*
				 * PIN:вЂ¦ РЅРµР»СЊР·СЏ РєР»Р°СЃС‚СЊ РІ crypto_signature_pkcs7 РєР°Рє РµСЃС‚СЊ.
				 * Р РµР·РѕР»РІ РґРѕ ceremony; РїСЂРё РѕС‚РєР°Р·Рµ вЂ” throw DiarySigningError-РїРѕРґРѕР±РЅС‹Р№
				 * С‡РµСЂРµР· РѕС‚РґРµР»СЊРЅС‹Р№ РєРѕРґ (РЅРёР¶Рµ catch в†’ 403).
				 */
				const resolvedPost = await resolveSignatureForStorage({
					pkcs7Signature: data.pkcs7Signature ?? null,
					userId,
					organizationId: orgId,
					diaryHashForMark: null,
				});
				if (!resolvedPost.ok) {
					throw new DiarySigningError(
						// Pin* РЅРµ РІ union DiarySigningFailureCode вЂ” РёСЃРїРѕР»СЊР·СѓРµРј NotSaved
						// РЅРµР»СЊР·СЏ: СЌС‚Рѕ 500. Р”РѕР±Р°РІРёРј PinInvalid РІ union РЅРёР¶Рµ.
						resolvedPost.code === "PinInvalid" ||
							resolvedPost.code === "PinNotSet" ||
							resolvedPost.code === "PinRequired" ||
							resolvedPost.code === "UserRequired"
							? "PinRejected"
							: "NotFound",
						resolvedPost.message,
					);
				}
				const signing = await runDiarySigningCeremony(tx, {
					diaryId,
					organizationId: orgId,
					userId,
					pkcs7Signature: resolvedPost.stored,
				});
				return {
					diaryId,
					signing,
					draftHash: null as string | null,
				};
			});

			return reply.send({
				success: true,
				id: outcome.diaryId,
				hash: outcome.signing?.hash ?? outcome.draftHash ?? null,
			});

		} catch (err) {
			if (err instanceof DiarySigningError) {
				if (err.code === "AlreadyLocked") {
					return reply
						.code(403)
						.send({ error: "DiaryLocked", message: err.message });
				}
				if (err.code === "Icd10Required") {
					return reply
						.code(422)
						.send({ error: "Icd10Required", message: err.message });
				}
				if (err.code === "InsufficientStock") {
					return reply
						.code(400)
						.send({ error: "TransactionFailed", message: err.message });
				}
				if (err.code === "PinRejected") {
					return reply
						.code(403)
						.send({ error: "PinRejected", message: err.message });
				}
				/*
				 * Р§РўРћ Р‘Р«Р›Рћ РЎР›РћРњРђРќРћ. Р—РґРµСЃСЊ СЃС‚РѕСЏР»Рѕ `return reply.code(404).send({ error:
				 * "NotFound" })` вЂ” С‚Рѕ РµСЃС‚СЊ РґРІРµ СЃРѕСЃРµРґРЅРёРµ РІРµС‚РєРё С‚РѕРіРѕ Р¶Рµ catch РїРµСЂРµРґР°РІР°Р»Рё
				 * РїСЂРёС‡РёРЅСѓ РЅР°СЂСѓР¶Сѓ, Р° С‚СЂРµС‚СЊСЏ РµС‘ РІС‹Р±СЂР°СЃС‹РІР°Р»Р°, С…РѕС‚СЏ РІ err.message Р»РµР¶Р°Р»Р°
				 * РіРѕС‚РѕРІР°СЏ СЂСѓСЃСЃРєР°СЏ С„СЂР°Р·Р°. Р‘РµР· message РєР»РёРµРЅС‚ СЃС‚СЂРѕРёС‚ С‚РµРєСЃС‚ РїРѕ РєРѕРґСѓ
				 * РѕС‚РІРµС‚Р°, Рё РґР»СЏ 404 СЌС‚Рѕ В«СЃРµСЂРІРµСЂ РЅРµ Р·РЅР°РµС‚ С‚Р°РєРѕРіРѕ СЂР°Р·РґРµР»Р° вЂ” СЃРєРѕСЂРµРµ РІСЃРµРіРѕ
				 * РїСЂРѕРіСЂР°РјРјР° РєР»РёРЅРёРєРё РѕР±РЅРѕРІР»РµРЅР° РЅРµ РїРѕР»РЅРѕСЃС‚СЊСЋ, СЃРѕРѕР±С‰РёС‚Рµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂСѓВ»
				 * (apps/web/src/lib/panelStateText.ts:125-127). Р­С‚Рѕ РЅРµ Р±РµР·Р»РёРєРёР№ С‚РµРєСЃС‚,
				 * Р° Р›РћР–РќРћР• СѓРєР°Р·Р°РЅРёРµ: РјР°СЂС€СЂСѓС‚ СЃСѓС‰РµСЃС‚РІСѓРµС‚ Рё СЂР°Р±РѕС‚Р°РµС‚, Р° РІСЂР°С‡Р° РѕС‚РїСЂР°РІР»СЏСЋС‚
				 * Р·РІР°С‚СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РІРјРµСЃС‚Рѕ РѕРґРЅРѕРіРѕ РЅР°Р¶Р°С‚РёСЏ В«РЎРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРєВ».
				 *
				 * Р РґРІР° СЃРѕСЃС‚РѕСЏРЅРёСЏ СЂР°Р·РІРµРґРµРЅС‹ РїРѕ РєРѕРґР°Рј, РїРѕС‚РѕРјСѓ С‡С‚Рѕ РґРµР№СЃС‚РІРёСЏ Сѓ РЅРёС…
				 * РїСЂРѕС‚РёРІРѕРїРѕР»РѕР¶РЅС‹Рµ: В«РґРЅРµРІРЅРёРєР° РЅРµС‚В» Р»РµС‡РёС‚СЃСЏ РїРѕРІС‚РѕСЂРЅС‹Рј СЃРѕС…СЂР°РЅРµРЅРёРµРј
				 * (404), В«РґРЅРµРІРЅРёРє РЅРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊВ» РЅРµ Р»РµС‡РёС‚СЃСЏ РЅРёС‡РµРј РЅР° СЃС‚РѕСЂРѕРЅРµ
				 * РІСЂР°С‡Р° Рё РѕР±СЏР·Р°РЅРѕ С‡РёС‚Р°С‚СЊСЃСЏ РєР°Рє СЃР±РѕР№ СЃРµСЂРІРµСЂР° (500).
				 */
				if (err.code === "NotSaved") {
					return reply
						.code(500)
						.send({ error: "DiaryNotSaved", message: err.message });
				}
				return reply
					.code(404)
					.send({ error: "NotFound", message: err.message });
			}
			throw err;
		}
	});

	app.post("/api/diaries/:id/lock", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "lock diary")))
			return;
		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РґРЅРµРІРЅРёРєР° РІ Р°РґСЂРµСЃРµ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
		const parsedLockBody = diaryLockBodySchema.safeParse(req.body ?? {});
		if (!parsedLockBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "РўРµР»Рѕ Р·Р°РїСЂРѕСЃР° РїРѕРґРїРёСЃР°РЅРёСЏ РґРЅРµРІРЅРёРєР° РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ JSON-РѕР±СЉРµРєС‚РѕРј.",
			});
		}
		const pkcs7Signature =
			typeof parsedLockBody.data.pkcs7Signature === "string"
				? parsedLockBody.data.pkcs7Signature
				: undefined;
		const userContext = req.user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		/*
		 * Р­РўРћ РњР•РЎРўРћ Р”РћРљРђР—РђРќРћ Р—РђРџР РћРЎРћРњ, Р° РЅРµ РІС‹РІРµРґРµРЅРѕ С‡С‚РµРЅРёРµРј, Рё РѕРЅРѕ РІСЂРµРґРЅРµРµ РІРµС‚РєРё РІ
		 * POST РІС‹С€Рµ: СЃСЋРґР° СЃС‚СѓС‡РёС‚СЃСЏ Р¶РёРІРѕР№ РєР»РёРµРЅС‚ РїРѕРґРїРёСЃР°РЅРёСЏ
		 * (apps/web/src/components/useVisitDiaryLogic.ts:507), Рё РѕРЅ СЃС‚СЂРѕРёС‚ С‚РµРєСЃС‚
		 * С‚РѕСЃС‚Р° СЂРѕРІРЅРѕ РёР· РїРѕР»СЏ message, Р° Р±РµР· РЅРµРіРѕ вЂ” РїРѕ РєРѕРґСѓ РѕС‚РІРµС‚Р° (:530-540).
		 * Р“РѕР»С‹Рµ РѕС‚РєР°Р·С‹ РЅРёР¶Рµ РґР°РІР°Р»Рё РІСЂР°С‡Сѓ С‚СЂРё Р»РѕР¶РЅС‹С… СѓРєР°Р·Р°РЅРёСЏ РїРѕРґСЂСЏРґ: 403 С‡РёС‚Р°Р»РѕСЃСЊ
		 * РєР°Рє В«РІРѕР№РґРёС‚Рµ РІ СЃРјРµРЅСѓ Р·Р°РЅРѕРІРѕВ» (Р°СЃСЃРёСЃС‚РµРЅС‚Сѓ СЌС‚Рѕ РЅРµ РїРѕРјРѕР¶РµС‚ РЅРёРєРѕРіРґР°), 404 вЂ”
		 * РєР°Рє В«РїСЂРѕРіСЂР°РјРјР° РєР»РёРЅРёРєРё РѕР±РЅРѕРІР»РµРЅР° РЅРµ РїРѕР»РЅРѕСЃС‚СЊСЋ, СЃРѕРѕР±С‰РёС‚Рµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂСѓВ»
		 * (РјР°СЂС€СЂСѓС‚ СЃСѓС‰РµСЃС‚РІСѓРµС‚ Рё СЂР°Р±РѕС‚Р°РµС‚). Р”РЅРµРІРЅРёРє РїСЂРёС‘РјР° вЂ” СЋСЂРёРґРёС‡РµСЃРєРёР№ РґРѕРєСѓРјРµРЅС‚, Рё
		 * РІСЂР°С‡, РЅРµ РїРѕРЅСЏРІС€РёР№ РѕС‚РєР°Р·, Р»РёР±Рѕ С‚РµСЂСЏРµС‚ Р·Р°РїРѕР»РЅРµРЅРЅС‹Р№ С‚РµРєСЃС‚, Р»РёР±Рѕ РїРµСЂРµРїРёСЃС‹РІР°РµС‚
		 * РµРіРѕ РІРѕ РІС‚РѕСЂРѕР№ Р·Р°РїРёСЃРё.
		 */
		if (role !== "doctor" && role !== "admin") {
			return reply.code(403).send({
				error: "OnlyDoctorsCanLock",
				message: DIARY_SIGNING_ROLE_MESSAGE,
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply
				.code(403)
				.send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE });

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!existing)
			return reply.code(404).send({
				error: "NotFound",
				message:
					"Р”РЅРµРІРЅРёРє РїСЂРёС‘РјР° РЅРµ РЅР°Р№РґРµРЅ РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ, РїРѕРґРїРёСЃС‹РІР°С‚СЊ РЅРµС‡РµРіРѕ. РўР°Рє Р±С‹РІР°РµС‚, РµСЃР»Рё СЃС‚СЂР°РЅРёС†Р° РїСЂРёС‘РјР° РѕС‚РєСЂС‹С‚Р° РґР°РІРЅРѕ Рё РґРЅРµРІРЅРёРє СЃ С‚РµС… РїРѕСЂ СѓРґР°Р»С‘РЅ. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ, РЅР°Р¶РјРёС‚Рµ В«РЎРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРєВ» Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕРґРїРёСЃР°РЅРёРµ.",
			});
		/*
		 * РџРѕРІС‚РѕСЂРЅР°СЏ РЈРљР­Рџ РїРѕСЃР»Рµ admin-revise.
		 *
		 * Р‘Р«Р›Рћ: revise РѕР±РЅСѓР»СЏРµС‚ crypto_signature_pkcs7 (С…РµС€ СѓР¶Рµ РґСЂСѓРіРѕР№ вЂ” СЃС‚Р°СЂС‹Р№
		 * PKCS#7 РІСЂР°Р» Р±С‹ В«РїРѕРґРїРёСЃСЊ в†” СЃРѕРґРµСЂР¶РёРјРѕРµВ»), РЅРѕ /lock РїСЂРё is_locked СЃСЂР°Р·Сѓ
		 * РѕС‚РІРµС‡Р°Р» 409 AlreadyLocked. РљР»РёРµРЅС‚ РїРѕСЃР»Рµ РїСЂР°РІРєРё РїРѕРєР°Р·С‹РІР°Р» С€С‚Р°РјРї
		 * В«Р­Р¦Рџ (SHA-256)В» РїРѕ РѕРґРЅРѕРјСѓ diaryHash, Р±РµР· PKCS#7, Рё РїРѕРІС‚РѕСЂРЅРѕ РїСЂРёР»РѕР¶РёС‚СЊ
		 * РїРѕРґРїРёСЃСЊ Рє РЅРѕРІРѕРјСѓ С…РµС€Сѓ Р±С‹Р»Рѕ РЅРµС‡РµРј. РџРµС‡Р°С‚СЊ 043/Сѓ РІС‹РіР»СЏРґРµР»Р° Р·Р°РІРµСЂРµРЅРЅРѕР№
		 * РЈРљР­Рџ, С…РѕС‚СЏ РѕС‚С‚РёСЃРєР° РІ Р‘Р” РЅРµС‚.
		 *
		 * РЎРўРђР›Рћ: locked + crypto_signature_pkcs7 IS NULL + РІ С‚РµР»Рµ РµСЃС‚СЊ PKCS#7 в†’
		 * С‚РѕР»СЊРєРѕ РїСЂРёРєСЂРµРїР»СЏРµРј РїРѕРґРїРёСЃСЊ Рё РїРµСЂРµСЃС‡РёС‚С‹РІР°РµРј hash РїРѕ СЃС‚СЂРѕРєРµ (Р±РµР·
		 * РїРѕРІС‚РѕСЂРЅРѕР№ СЃРєР»Р°РґСЃРєРѕР№ С†РµСЂРµРјРѕРЅРёРё вЂ” СѓСЃР»СѓРіРё/СЃРєР»Р°Рґ СѓР¶Рµ Р·Р°РєСЂС‹С‚С‹ РїРµСЂРІС‹Рј lock).
		 * locked + PKCS#7 СѓР¶Рµ РµСЃС‚СЊ в†’ РїРѕ-РїСЂРµР¶РЅРµРјСѓ 409.
		 *
		 * DEFECT #85: re-attach must serialize on the locked 043/Сѓ row.
		 * Р‘Р«Р›Рћ: outer SELECT without FOR UPDATE, then bare UPDATE by id+org.
		 * Concurrent double POST /lock after revise both saw null PKCS#7 and
		 * both wrote crypto_signature_pkcs7 / diaryHash вЂ” last writer won,
		 * first РЈРљР­Рџ silently discarded; concurrent /revise could change SOAP
		 * between hash snapshot and UPDATE so PKCS#7 sealed the wrong text.
		 * РЎРўРђР›Рћ: FOR UPDATE inside transaction; hash + author fill from locked
		 * row; UPDATE WHERE is_locked=true AND crypto still empty; zero rows в†’
		 * AlreadyLocked (same pattern as draft #73 / lock #76 / revise #84).
		 */
		if (existing.isLocked) {
			const incomingPkcs7 =
				typeof pkcs7Signature === "string" && pkcs7Signature.length > 0
					? pkcs7Signature
					: null;

			const lockedAtIsoFrom = (
				lockedAt: Date | string | null | undefined,
			): string | null =>
				lockedAt instanceof Date
					? lockedAt.toISOString()
					: typeof lockedAt === "string"
						? lockedAt
						: null;

			if (!incomingPkcs7) {
				const lockedAtIso = lockedAtIsoFrom(existing.lockedAt);
				const hasPkcs7 =
					typeof existing.cryptoSignaturePkcs7 === "string" &&
					existing.cryptoSignaturePkcs7.length > 0;
				/*
				 * Р‘Р«Р›Рћ: 409 РѕС‚РґР°РІР°Р» hash, РЅРѕ РЅРµ lockedAt. РљР»РёРµРЅС‚ doLock РЅР° 409 СЃС‚Р°РІРёР»
				 * isLocked=true Рё hash, Р° lockedAt РѕСЃС‚Р°РІР°Р»СЃСЏ null вЂ” РїРµС‡Р°С‚СЊ 043/Сѓ Рё
				 * С€С‚Р°РјРї В«РџРѕРґРїРёСЃР°РЅ:В» РїРѕРєР°Р·С‹РІР°Р»Рё В«вЂ”В» / РґР°С‚Сѓ СЃ РџРљ, С…РѕС‚СЏ РІ Р‘Р” locked_at РµСЃС‚СЊ.
				 */
				return reply.code(409).send({
					error: "AlreadyLocked",
					hash: existing.diaryHash,
					lockedAt: lockedAtIso,
					cryptoSignatureAttached: hasPkcs7,
					message: hasPkcs7
						? "Р”РЅРµРІРЅРёРє СЌС‚РѕРіРѕ РїСЂРёС‘РјР° СѓР¶Рµ РїРѕРґРїРёСЃР°РЅ Рё Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ, РІС‚РѕСЂРѕР№ СЂР°Р· РїРѕРґРїРёСЃС‹РІР°С‚СЊ РµРіРѕ РЅРµ РЅСѓР¶РЅРѕ. Р•СЃР»Рё РЅСѓР¶РЅР° РїСЂР°РІРєР° РїРѕРґРїРёСЃР°РЅРЅРѕРіРѕ РґРЅРµРІРЅРёРєР°, РµС‘ РїСЂРѕРІРѕРґРёС‚ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РєР»РёРЅРёРєРё С‡РµСЂРµР· СЂРµРІРёР·РёСЋ."
						: "Р”РЅРµРІРЅРёРє СѓР¶Рµ Р·Р°РєСЂС‹С‚ Р·Р°РјРєРѕРј, РЅРѕ РѕС‚С‚РёСЃРє РЈРљР­Рџ РїРѕСЃР»Рµ РїСЂР°РІРєРё СЃР±СЂРѕС€РµРЅ. РћС‚РєСЂРѕР№С‚Рµ РїРѕРґРїРёСЃР°РЅРёРµ Рё РїСЂРёР»РѕР¶РёС‚Рµ РїРѕРґРїРёСЃСЊ РљСЂРёРїС‚РѕРџСЂРѕ РёР»Рё РїСЂРѕСЃС‚СѓСЋ РїРѕРґРїРёСЃСЊ Рє С‚РµРєСѓС‰РµРјСѓ РѕС‚РїРµС‡Р°С‚РєСѓ вЂ” СЃРєР»Р°Рґ Рё СѓСЃР»СѓРіРё РїРѕРІС‚РѕСЂРЅРѕ РЅРµ СЃРїРёС€СѓС‚СЃСЏ.",
				});
			}

			type ReattachTxResult =
				| { kind: "not_found" }
				| { kind: "not_locked" }
				| {
						kind: "already";
						hash: string | null;
						lockedAt: string | null;
						hasPkcs7: boolean;
				  }
				| { kind: "pin_rejected"; code: string; message: string }
				| {
						kind: "ok";
						hash: string;
						lockedAt: string | null;
						attached: boolean;
				  };

			const reattachResult: ReattachTxResult = await db.transaction(
				async (tx) => {
					const [row] = await tx
						.select()
						.from(visitDiaries)
						.where(
							and(
								eq(visitDiaries.id, id),
								eq(visitDiaries.organizationId, orgId),
							),
						)
						.for("update");

					if (!row) return { kind: "not_found" as const };
					if (!row.isLocked) return { kind: "not_locked" as const };

					const lockedAtIso = lockedAtIsoFrom(row.lockedAt);
					const hasPkcs7 =
						typeof row.cryptoSignaturePkcs7 === "string" &&
						row.cryptoSignaturePkcs7.length > 0;
					if (hasPkcs7) {
						return {
							kind: "already" as const,
							hash: row.diaryHash,
							lockedAt: lockedAtIso,
							hasPkcs7: true,
						};
					}

					const reattachHash = computeDiaryHash(
						row.visitId,
						row.patientId ?? "",
						row.anamnesis,
						row.statusLocalis,
						row.treatmentDescription,
						row.diagnosisIcd10,
						row.diagnosisTooth,
						row.complications,
						row.comorbidities,
						row.instrumentTrayBarcode,
					);
					const resolvedReattach = await resolveSignatureForStorage({
						pkcs7Signature: incomingPkcs7,
						userId,
						organizationId: orgId,
						diaryHashForMark: reattachHash,
					});
					if (!resolvedReattach.ok) {
						return {
							kind: "pin_rejected" as const,
							code: resolvedReattach.code,
							message: resolvedReattach.message,
						};
					}

					const now = new Date();
					/*
					 * DEFECT #39: progressive fill author/doctor on re-attach.
					 * Р‘Р«Р›Рћ: reattach РїРёСЃР°Р» С‚РѕР»СЊРєРѕ coSignedByUserId. Legacy-СЃС‚СЂРѕРєРё
					 * (РґРѕ DEFECT #35) РѕСЃС‚Р°РІР°Р»РёСЃСЊ СЃ doctorId/authorId = null РґР°Р¶Рµ
					 * РїРѕСЃР»Рµ РїРѕРІС‚РѕСЂРЅРѕР№ РЈРљР­Рџ вЂ” BI/print/toothHistory Р±РµР· РІСЂР°С‡Р°.
					 * РЎРўРђР›Рћ: Р·Р°РїРѕР»РЅСЏРµРј authorId/doctorId/lockedByUserId РўРћР›Р¬РљРћ
					 * РµСЃР»Рё РєРѕР»РѕРЅРєР° РµС‰С‘ null. РџРѕСЃР»Рµ revise РёСЃС…РѕРґРЅС‹Р№ doctorId
					 * СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ вЂ” re-attach РЅРµ РїРѕРґРјРµРЅСЏРµС‚ Р»РµС‡Р°С‰РµРіРѕ РІСЂР°С‡Р°.
					 */
					const updatedRows = await tx
						.update(visitDiaries)
						.set({
							diaryHash: reattachHash,
							cryptoSignaturePkcs7: resolvedReattach.stored,
							coSignedByUserId: userId,
							authorId: row.authorId ?? userId,
							doctorId: row.doctorId ?? userId,
							lockedByUserId: row.lockedByUserId ?? userId,
							updatedAt: now,
						})
						.where(
							and(
								eq(visitDiaries.id, id),
								eq(visitDiaries.organizationId, orgId),
								eq(visitDiaries.isLocked, true),
								/* only first successful re-attach wins the empty PKCS#7 slot */
								or(
									isNull(visitDiaries.cryptoSignaturePkcs7),
									eq(visitDiaries.cryptoSignaturePkcs7, ""),
								),
							),
						)
						.returning({ id: visitDiaries.id });

					if (updatedRows.length === 0) {
						const [again] = await tx
							.select({
								diaryHash: visitDiaries.diaryHash,
								lockedAt: visitDiaries.lockedAt,
								cryptoSignaturePkcs7: visitDiaries.cryptoSignaturePkcs7,
							})
							.from(visitDiaries)
							.where(
								and(
									eq(visitDiaries.id, id),
									eq(visitDiaries.organizationId, orgId),
								),
							)
							.limit(1);
						const againHas =
							typeof again?.cryptoSignaturePkcs7 === "string" &&
							again.cryptoSignaturePkcs7.length > 0;
						return {
							kind: "already" as const,
							hash: again?.diaryHash ?? row.diaryHash,
							lockedAt: lockedAtIsoFrom(again?.lockedAt ?? row.lockedAt),
							hasPkcs7: againHas,
						};
					}

					return {
						kind: "ok" as const,
						hash: reattachHash,
						lockedAt: lockedAtIso,
						attached: Boolean(resolvedReattach.stored),
					};
				},
			);

			if (reattachResult.kind === "not_found") {
				return reply.code(404).send({
					error: "NotFound",
					message:
						"Р”РЅРµРІРЅРёРє РїСЂРёС‘РјР° РЅРµ РЅР°Р№РґРµРЅ РІ СЌС‚РѕР№ РєР»РёРЅРёРєРµ, РїРѕРґРїРёСЃС‹РІР°С‚СЊ РЅРµС‡РµРіРѕ. РўР°Рє Р±С‹РІР°РµС‚, РµСЃР»Рё СЃС‚СЂР°РЅРёС†Р° РїСЂРёС‘РјР° РѕС‚РєСЂС‹С‚Р° РґР°РІРЅРѕ Рё РґРЅРµРІРЅРёРє СЃ С‚РµС… РїРѕСЂ СѓРґР°Р»С‘РЅ. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ, РЅР°Р¶РјРёС‚Рµ В«РЎРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРєВ» Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕРґРїРёСЃР°РЅРёРµ.",
				});
			}
			if (reattachResult.kind === "pin_rejected") {
				return reply.code(403).send({
					error: reattachResult.code,
					message: reattachResult.message,
				});
			}
			if (reattachResult.kind === "already") {
				return reply.code(409).send({
					error: "AlreadyLocked",
					hash: reattachResult.hash,
					lockedAt: reattachResult.lockedAt,
					cryptoSignatureAttached: reattachResult.hasPkcs7,
					message: reattachResult.hasPkcs7
						? "Р”РЅРµРІРЅРёРє СЌС‚РѕРіРѕ РїСЂРёС‘РјР° СѓР¶Рµ РїРѕРґРїРёСЃР°РЅ Рё Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ, РІС‚РѕСЂРѕР№ СЂР°Р· РїРѕРґРїРёСЃС‹РІР°С‚СЊ РµРіРѕ РЅРµ РЅСѓР¶РЅРѕ. Р•СЃР»Рё РЅСѓР¶РЅР° РїСЂР°РІРєР° РїРѕРґРїРёСЃР°РЅРЅРѕРіРѕ РґРЅРµРІРЅРёРєР°, РµС‘ РїСЂРѕРІРѕРґРёС‚ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РєР»РёРЅРёРєРё С‡РµСЂРµР· СЂРµРІРёР·РёСЋ."
						: "Р”РЅРµРІРЅРёРє СѓР¶Рµ Р·Р°РєСЂС‹С‚ Р·Р°РјРєРѕРј, РЅРѕ РѕС‚С‚РёСЃРє РЈРљР­Рџ РїРѕСЃР»Рµ РїСЂР°РІРєРё СЃР±СЂРѕС€РµРЅ. РћС‚РєСЂРѕР№С‚Рµ РїРѕРґРїРёСЃР°РЅРёРµ Рё РїСЂРёР»РѕР¶РёС‚Рµ РїРѕРґРїРёСЃСЊ РљСЂРёРїС‚РѕРџСЂРѕ РёР»Рё РїСЂРѕСЃС‚СѓСЋ РїРѕРґРїРёСЃСЊ Рє С‚РµРєСѓС‰РµРјСѓ РѕС‚РїРµС‡Р°С‚РєСѓ вЂ” СЃРєР»Р°Рґ Рё СѓСЃР»СѓРіРё РїРѕРІС‚РѕСЂРЅРѕ РЅРµ СЃРїРёС€СѓС‚СЃСЏ.",
				});
			}
			if (reattachResult.kind === "ok") {
				return reply.send({
					success: true,
					hash: reattachResult.hash,
					lockedAt: reattachResult.lockedAt,
					cryptoSignatureAttached: reattachResult.attached,
					reattached: true,
				});
			}
			/* not_locked: row unlocked between outer read and FOR UPDATE вЂ” fall through to ceremony */
		}


		// Р¦РµСЂРµРјРѕРЅРёСЏ вЂ” РѕР±С‰Р°СЏ СЃ POST /api/diaries, СЃРј. runDiarySigningCeremony.
		// PIN:вЂ¦ в†’ verify + opaque mark Р”Рћ С‚СЂР°РЅР·Р°РєС†РёРё (pbkdf2 РІРЅРµ tx-РєСЂРёС‚РёРєРё).
		try {
			const resolvedLock = await resolveSignatureForStorage({
				pkcs7Signature: pkcs7Signature ?? null,
				userId,
				organizationId: orgId,
				diaryHashForMark: existing.diaryHash,
			});
			if (!resolvedLock.ok) {
				return reply.code(403).send({
					error: resolvedLock.code,
					message: resolvedLock.message,
				});
			}
			const signing = await db.transaction((tx) =>
				runDiarySigningCeremony(tx, {
					diaryId: id,
					organizationId: orgId,
					userId,
					pkcs7Signature: resolvedLock.stored,
				}),
			);
			return reply.send({
				success: true,
				hash: signing.hash,
				lockedAt: signing.lockedAt.toISOString(),
				cryptoSignatureAttached: Boolean(
					resolvedLock.stored && String(resolvedLock.stored).length > 0,
				),
			});
		} catch (err) {
			if (err instanceof DiarySigningError) {
				// РўРµ Р¶Рµ РґРІРµ РІРµС‚РєРё, С‡С‚Рѕ Рё РІ POST РІС‹С€Рµ, С‚РµСЂСЏР»Рё Р·РґРµСЃСЊ РіРѕС‚РѕРІСѓСЋ СЂСѓСЃСЃРєСѓСЋ
				// РїСЂРёС‡РёРЅСѓ РёР· err.message вЂ” РїСЂРё С‚РѕРј, С‡С‚Рѕ С‚СЂРµС‚СЊСЏ, СЃРѕСЃРµРґРЅСЏСЏ, РµС‘ РѕС‚РґР°РІР°Р»Р°.
				if (err.code === "AlreadyLocked") {
					/*
					 * Race TOCTOU: РІРЅРµС€РЅРёР№ SELECT РµС‰С‘ РЅРµ locked, С†РµСЂРµРјРѕРЅРёСЏ FOR UPDATE
					 * СѓРІРёРґРµР»Р° is_locked. Р‘Р«Р›Рћ: 409 С‚РѕР»СЊРєРѕ {error, message} вЂ” Р±РµР· hash
					 * Рё lockedAt. РљР»РёРµРЅС‚ doLock РЅР° 409 СЃС‚Р°РІРёР» isLocked=true, РЅРѕ
					 * diaryHash/lockedAt РѕСЃС‚Р°РІР°Р»РёСЃСЊ null в†’ РїРµС‡Р°С‚СЊ 043/Сѓ Р±РµР· Р­Р¦Рџ-С€С‚Р°РјРїР°
					 * Рё Р±РµР· РґР°С‚С‹ РїРѕРґРїРёСЃРё, С…РѕС‚СЏ РІ Р‘Р” РѕР±Р° РїРѕР»СЏ СѓР¶Рµ РµСЃС‚СЊ.
					 */
					const [lockedRow] = await db
						.select({
							diaryHash: visitDiaries.diaryHash,
							lockedAt: visitDiaries.lockedAt,
						})
						.from(visitDiaries)
						.where(
							and(
								eq(visitDiaries.id, id),
								eq(visitDiaries.organizationId, orgId),
							),
						)
						.limit(1);
					return reply.code(409).send({
						error: "AlreadyLocked",
						hash: lockedRow?.diaryHash ?? null,
						lockedAt:
							lockedRow?.lockedAt instanceof Date
								? lockedRow.lockedAt.toISOString()
								: typeof lockedRow?.lockedAt === "string"
									? lockedRow.lockedAt
									: null,
						message: err.message,
					});
				}

				if (err.code === "NotFound") {
					return reply
						.code(404)
						.send({ error: "NotFound", message: err.message });
				}
				if (err.code === "NotSaved") {
					return reply
						.code(500)
						.send({ error: "DiaryNotSaved", message: err.message });
				}
				if (err.code === "Icd10Required") {
					return reply
						.code(422)
						.send({ error: "Icd10Required", message: err.message });
				}
				return reply
					.code(400)
					.send({ error: "TransactionFailed", message: err.message });
			}
			// Р‘Р«Р›Рћ: `catch (err: any)` РІРѕР·РІСЂР°С‰Р°Р» 400 СЃ err.message РЅР° Р›Р®Р‘РћР™ СЃР±РѕР№,
			// РІРєР»СЋС‡Р°СЏ РѕС€РёР±РєРё РґСЂР°Р№РІРµСЂР° Р±Р°Р·С‹ вЂ” РєР»РёРµРЅС‚Сѓ СѓС…РѕРґРёР»Рё РІРЅСѓС‚СЂРµРЅРЅРёРµ РїРѕРґСЂРѕР±РЅРѕСЃС‚Рё
			// СЃС…РµРјС‹, Р° РѕС‚РєР°Р· РёРЅС„СЂР°СЃС‚СЂСѓРєС‚СѓСЂС‹ РІС‹РіР»СЏРґРµР» РєР°Рє РѕС€РёР±РєР° Р·Р°РїСЂРѕСЃР°. РўРµРїРµСЂСЊ
			// РЅРµРѕР¶РёРґР°РµРјС‹Рµ РѕС€РёР±РєРё СѓС…РѕРґСЏС‚ РѕР±СЂР°Р±РѕС‚С‡РёРєСѓ server.ts, РєРѕС‚РѕСЂС‹Р№ РёС… РѕР±РµР·Р»РёС‡РёРІР°РµС‚.
			throw err;
		}
	});

	app.post("/api/diaries/:id/revise", async (req, reply) => {
		if (
			!(await requireClinicalMutationAccess(req, reply, "revise locked diary"))
		)
			return;
		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РґРЅРµРІРЅРёРєР° РІ Р°РґСЂРµСЃРµ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
		/* Body Zod before role gate (РєР°Рє /lock): non-object в†’ 400, РЅРµ 403 oracle. */
		const parsedReviseBody = diaryReviseBodySchema.safeParse(req.body ?? {});
		if (!parsedReviseBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "РўРµР»Рѕ Р·Р°РїСЂРѕСЃР° СЂРµРІРёР·РёРё РґРЅРµРІРЅРёРєР° РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ JSON-РѕР±СЉРµРєС‚РѕРј.",
			});
		}
		const userContext = req.user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		if (role !== "admin") {
			/*
			 * РџСЂРµР¶РЅРёР№ С‚РµРєСЃС‚ РЅР°Р·С‹РІР°Р»СЃСЏ В«Р РµРІРёР·РёСЏ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРЅРѕРіРѕ РґРЅРµРІРЅРёРєР° РґРѕСЃС‚СѓРїРЅР°
			 * С‚РѕР»СЊРєРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂСѓ.В» вЂ” РїСЂРёС‡РёРЅСѓ РѕРЅ РЅР°Р·С‹РІР°Р», Р° РґРµР№СЃС‚РІРёРµ РЅРµС‚, Рё СЃР»РѕРІРѕ
			 * В«СЂРµРІРёР·РёСЏВ» РЅР° СЌРєСЂР°РЅРµ РїСЂРёС‘РјР° С‡РёС‚Р°РµС‚СЃСЏ РєР°Рє Р±СѓС…РіР°Р»С‚РµСЂСЃРєР°СЏ РїСЂРѕРІРµСЂРєР°. Р‘РµР·
			 * СЃР»РµРґСѓСЋС‰РµРіРѕ С€Р°РіР° РІСЂР°С‡, РєРѕС‚РѕСЂРѕРјСѓ РЅСѓР¶РЅРѕ РёСЃРїСЂР°РІРёС‚СЊ РїРѕРґРїРёСЃР°РЅРЅС‹Р№ РґРЅРµРІРЅРёРє,
			 * СѓРїРёСЂР°РµС‚СЃСЏ РІ РѕС‚РєР°Р· Рё РЅРµ СѓР·РЅР°С‘С‚, С‡С‚Рѕ РёСЃРїСЂР°РІР»РµРЅРёРµ РІРѕРѕР±С‰Рµ РІРѕР·РјРѕР¶РЅРѕ вЂ” Р°
			 * РґРЅРµРІРЅРёРє РїСЂРёС‘РјР° СЌС‚Рѕ СЋСЂРёРґРёС‡РµСЃРєРёР№ РґРѕРєСѓРјРµРЅС‚, Рё РїРµСЂРµРїРёСЃС‹РІР°С‚СЊ РµРіРѕ РІС‚РѕСЂРѕР№
			 * Р·Р°РїРёСЃСЊСЋ РЅРµР»СЊР·СЏ.
			 */
			return reply.code(403).send({
				error: "OnlyAdminsCanRevise",
				message:
					"РСЃРїСЂР°РІРёС‚СЊ СѓР¶Рµ РїРѕРґРїРёСЃР°РЅРЅС‹Р№ РґРЅРµРІРЅРёРє РїСЂРёС‘РјР° РјРѕР¶РµС‚ С‚РѕР»СЊРєРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РєР»РёРЅРёРєРё, Рё РїРѕРІС‚РѕСЂРЅС‹Р№ РІС…РѕРґ СЌС‚РѕРіРѕ РїСЂР°РІР° РЅРµ РґРѕР±Р°РІРёС‚. РџРѕР·РѕРІРёС‚Рµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РєР»РёРЅРёРєРё вЂ” РѕРЅ РІРЅРµСЃС‘С‚ РїСЂР°РІРєСѓ С‚Р°Рє, С‡С‚Рѕ РїСЂРµР¶РЅРёР№ С‚РµРєСЃС‚ РѕСЃС‚Р°РЅРµС‚СЃСЏ РІ РёСЃС‚РѕСЂРёРё РґРЅРµРІРЅРёРєР°.",
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
			});

		const body = {
			anamnesis:
				typeof parsedReviseBody.data.anamnesis === "string"
					? parsedReviseBody.data.anamnesis
					: undefined,
			statusLocalis:
				typeof parsedReviseBody.data.statusLocalis === "string"
					? parsedReviseBody.data.statusLocalis
					: undefined,
			diagnosisIcd10:
				typeof parsedReviseBody.data.diagnosisIcd10 === "string"
					? parsedReviseBody.data.diagnosisIcd10
					: undefined,
			diagnosisTooth:
				typeof parsedReviseBody.data.diagnosisTooth === "string"
					? parsedReviseBody.data.diagnosisTooth
					: undefined,
			treatmentDescription:
				typeof parsedReviseBody.data.treatmentDescription === "string"
					? parsedReviseBody.data.treatmentDescription
					: undefined,
			complications:
				typeof parsedReviseBody.data.complications === "string"
					? parsedReviseBody.data.complications
					: undefined,
			comorbidities:
				typeof parsedReviseBody.data.comorbidities === "string"
					? parsedReviseBody.data.comorbidities
					: undefined,
			/*
			 * Р›РѕС‚РѕРє: string РІ С‚РµР»Рµ (РІ С‚.С‡. "") в†’ РїРµСЂРµРїРёСЃР°С‚СЊ; undefined в†’ РѕСЃС‚Р°РІРёС‚СЊ.
			 * РџСѓСЃС‚Р°СЏ СЃС‚СЂРѕРєР° СЃРЅРёРјР°РµС‚ РѕС€РёР±РѕС‡РЅС‹Р№ barcode СЃ 043/Сѓ.
			 */
			instrumentTrayBarcode:
				typeof parsedReviseBody.data.instrumentTrayBarcode === "string"
					? parsedReviseBody.data.instrumentTrayBarcode
					: undefined,
			revisionReason:
				typeof parsedReviseBody.data.revisionReason === "string"
					? parsedReviseBody.data.revisionReason
					: undefined,
		};

		/*
		 * DEFECT #84: admin revise of signed Form 043/Сѓ must serialize on the row.
		 * Р‘Р«Р›Рћ: SELECT outside the transaction (no FOR UPDATE), then tx only
		 * inserted visit_diary_revisions + UPDATE from that stale snapshot.
		 * Two concurrent POST /revise both read previous_*=X, both write
		 * forensic rows with previous=X, both bump version to N+1 вЂ” intermediate
		 * SOAP Y is lost from the legal revision chain and diary_hash/version
		 * can collide under READ COMMITTED.
		 * РЎРўРђР›Рћ: entire revise ceremony in one transaction: FOR UPDATE, re-check
		 * is_locked, build previous_* + hash + version from the locked row, then
		 * insert revision + UPDATE (same pattern as draft #73 / lock #76 / tray #82).
		 */
		type ReviseTxResult =
			| { kind: "not_found" }
			| { kind: "not_locked" }
			| { kind: "invalid_tray" }
			/*
			 * DEFECT #113: zero-row revise UPDATE (locked/version belt lost).
			 * Must not commit a forensic insert without the diary write.
			 */
			| { kind: "update_lost" }
			| { kind: "ok"; hash: string; revisionCount: number };

		const reviseResult: ReviseTxResult = await db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(visitDiaries)
				.where(
					and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
				)
				.for("update");

			if (!existing) return { kind: "not_found" as const };
			if (!existing.isLocked) return { kind: "not_locked" as const };

			/*
			 * РќРµРїСѓСЃС‚РѕР№ РЅРѕРІС‹Р№ barcode вЂ” С‚РѕР»СЊРєРѕ РµСЃР»Рё Р¶СѓСЂРЅР°Р» СЃС‚РµСЂРёР»РёР·Р°С†РёРё РєР»РёРЅРёРєРё
			 * РїРѕРґС‚РІРµСЂРґРёР» С†РёРєР» (С‚РѕС‚ Р¶Рµ РєСЂРёС‚РµСЂРёР№, С‡С‚Рѕ POST /api/sterilization/link).
			 * РРЅР°С‡Рµ Р°РґРјРёРЅ РјРѕРі Р±С‹ РІРїРёСЃР°С‚СЊ РїСЂРѕРёР·РІРѕР»СЊРЅС‹Р№ С€С‚СЂРёС…РєРѕРґ РІ РїРѕРґРїРёСЃР°РЅРЅСѓСЋ 043/Сѓ.
			 * Check inside the row lock so tray default uses the locked snapshot.
			 */
			const nextTrayBarcode =
				body.instrumentTrayBarcode !== undefined
					? body.instrumentTrayBarcode.trim()
					: (existing.instrumentTrayBarcode ?? "");
			if (
				body.instrumentTrayBarcode !== undefined &&
				nextTrayBarcode.length > 0
			) {
				const [trayLog] = await tx
					.select({
						id: sterilizationLogs.id,
						status: sterilizationLogs.status,
					})
					.from(sterilizationLogs)
					.where(
						and(
							eq(sterilizationLogs.organizationId, orgId),
							eq(sterilizationLogs.barcode, nextTrayBarcode),
						),
					)
					.orderBy(desc(sterilizationLogs.timestamp))
					.limit(1);
				if (!trayLog || trayLog.status !== "passed") {
					return { kind: "invalid_tray" as const };
				}
			}

			const newHash = computeDiaryHash(
				existing.visitId,
				existing.patientId ?? "",
				body.anamnesis ?? existing.anamnesis,
				body.statusLocalis ?? existing.statusLocalis,
				body.treatmentDescription ?? existing.treatmentDescription,
				body.diagnosisIcd10 ?? existing.diagnosisIcd10,
				body.diagnosisTooth ?? existing.diagnosisTooth,
				body.complications ?? existing.complications,
				body.comorbidities ?? existing.comorbidities,
				nextTrayBarcode,
			);

			const priorVersion = existing.version ?? 1;

			/*
			 * DEFECT #113: admin revise UPDATE must prove the row write.
			 *
			 * Р‘Р«Р›Рћ (#84): FOR UPDATE + UPDATE WHERE is_locked=true, but
			 * visit_diary_revisions INSERT ran BEFORE the UPDATE, and the
			 * UPDATE had no .returning() / row-count check. If the belt
			 * matched zero rows (unlocked between snapshot and write, or
			 * version drift), the transaction still committed an orphan
			 * forensic row while diary SOAP/hash/version stayed old; the
			 * HTTP 200 claimed success with a hash that was never stored.
			 * Lock #76 / draft #73 / re-attach #85 all fail closed on
			 * zero returning rows вЂ” revise did not.
			 *
			 * РЎРўРђР›Рћ: UPDATE first with .returning() and optimistic
			 * version belt (id+org+is_locked+version). Zero rows в†’
			 * update_lost (no forensic insert). Only after a proven
			 * diary write do we insert visit_diary_revisions previous_*
			 * from the locked snapshot (existing still holds pre-image).
			 *
			 * PKCS#7 still cleared: old signature must not seal new hash.
			 * is_locked and locked_at stay (re-РЈРљР­Рџ is a separate step).
			 */
			const updatedRows = await tx
				.update(visitDiaries)
				.set({
					anamnesis: body.anamnesis ?? existing.anamnesis,
					statusLocalis: body.statusLocalis ?? existing.statusLocalis,
					diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10,
					diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth,
					treatmentDescription:
						body.treatmentDescription ?? existing.treatmentDescription,
					complications: body.complications ?? existing.complications,
					comorbidities: body.comorbidities ?? existing.comorbidities,
					instrumentTrayBarcode:
						body.instrumentTrayBarcode !== undefined
							? nextTrayBarcode || null
							: existing.instrumentTrayBarcode,
					diaryHash: newHash,
					cryptoSignaturePkcs7: null,
					version: priorVersion + 1,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(visitDiaries.id, id),
						eq(visitDiaries.organizationId, orgId),
						/* belt: only revise while still locked (Form 043/Сѓ signed) */
						eq(visitDiaries.isLocked, true),
						/* DEFECT #113: optimistic version вЂ” concurrent revise loses cleanly */
						eq(visitDiaries.version, priorVersion),
					),
				)
				.returning({ id: visitDiaries.id });

			if (updatedRows.length === 0) {
				return { kind: "update_lost" as const };
			}

			/*
			 * Forensic previous_* snapshot from the locked pre-image (existing).
			 * Insert only after UPDATE returned a row so the legal chain never
			 * records a revision that did not change the signed diary.
			 *
			 * previous_diagnosis_tooth + revision_reason (РјРёРіСЂР°С†РёСЏ 0116),
			 * complications/comorbidities (0149), instrument tray (0150).
			 */
			await tx.insert(visitDiaryRevisions).values({
				organizationId: orgId,
				diaryId: existing.id,
				previousAnamnesis: existing.anamnesis,
				previousStatusLocalis: existing.statusLocalis,
				previousDiagnosisIcd10: existing.diagnosisIcd10,
				previousDiagnosisTooth: existing.diagnosisTooth,
				previousTreatmentDescription: existing.treatmentDescription,
				previousComplications: existing.complications,
				previousComorbidities: existing.comorbidities,
				previousInstrumentTrayBarcode: existing.instrumentTrayBarcode,
				revisionReason: body.revisionReason,
				revisedByUserId: userId,
			});

			/*
			 * DEFECT #46: admin revise of signed 043 must update EMK/EGISZ source.
			 * Without this, forensic 043 shows new text but CDA still has old visits.*.
			 */
			await syncVisitEmkFromDiarySoap(tx, {
				visitId: existing.visitId,
				organizationId: orgId,
				anamnesis: body.anamnesis ?? existing.anamnesis,
				statusLocalis: body.statusLocalis ?? existing.statusLocalis,
				diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10,
				diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth,
				treatmentDescription:
					body.treatmentDescription ?? existing.treatmentDescription,
			});

			// Р‘Р«Р›Рћ: `revisionCount: 1` вЂ” РєРѕРЅСЃС‚Р°РЅС‚Р° РІРјРµСЃС‚Рѕ РЅР°СЃС‚РѕСЏС‰РµРіРѕ С‡РёСЃР»Р° СЂРµРІРёР·РёР№.
			// РћС‚РІРµС‚ СѓС‚РІРµСЂР¶РґР°Р» В«СЂРµРІРёР·РёСЏ РїРµСЂРІР°СЏВ» Рё РЅР° РґРµСЃСЏС‚РѕР№ РїСЂР°РІРєРµ РєР°СЂС‚С‹.
			const [tally] = await tx
				.select({ total: count() })
				.from(visitDiaryRevisions)
				.where(
					and(
						eq(visitDiaryRevisions.diaryId, existing.id),
						eq(visitDiaryRevisions.organizationId, orgId),
					),
				);
			return {
				kind: "ok" as const,
				hash: newHash,
				revisionCount: tally?.total ?? 0,
			};
		});

		if (reviseResult.kind === "not_found") {
			return reply
				.code(404)
				.send({ error: "NotFound", message: DIARY_NOT_FOUND_REVISE_MESSAGE });
		}
		if (reviseResult.kind === "not_locked") {
			return reply.code(409).send({
				error: "NotLocked",
				message: "Р”РЅРµРІРЅРёРє РЅРµ РїРѕРґРїРёСЃР°РЅ вЂ” РїСЂРѕСЃС‚Рѕ СЂРµРґР°РєС‚РёСЂСѓР№С‚Рµ РµРіРѕ.",
			});
		}
		if (reviseResult.kind === "invalid_tray") {
			return reply.code(400).send({
				error: "InvalidTrayBarcode",
				message:
					"Р›РѕС‚РѕРє РЅРµ РїРѕРґС‚РІРµСЂР¶РґС‘РЅ Р¶СѓСЂРЅР°Р»РѕРј СЃС‚РµСЂРёР»РёР·Р°С†РёРё СЌС‚РѕР№ РєР»РёРЅРёРєРё: С‚Р°РєРѕРіРѕ С€С‚СЂРёС…РєРѕРґР° РЅРµС‚ РёР»Рё РїРѕСЃР»РµРґРЅРёР№ С†РёРєР» РЅРµ РїСЂРѕР№РґРµРЅ. РЈРєР°Р¶РёС‚Рµ С€С‚СЂРёС…РєРѕРґ СЃ РїСЂРѕС€РµРґС€РµР№ СЃС‚РµСЂРёР»РёР·Р°С†РёРµР№ РёР»Рё РѕС‡РёСЃС‚РёС‚Рµ РїРѕР»Рµ Р»РѕС‚РєР°.",
			});
		}
		if (reviseResult.kind === "update_lost") {
			return reply.code(409).send({
				error: "ReviseConflict",
				message:
					"РСЃРїСЂР°РІР»РµРЅРёРµ РїРѕРґРїРёСЃР°РЅРЅРѕРіРѕ РґРЅРµРІРЅРёРєР° РЅРµ РїСЂРёРјРµРЅРёР»РѕСЃСЊ: Р·Р°РїРёСЃСЊ СѓР¶Рµ РёР·РјРµРЅРёР»Р°СЃСЊ РёР»Рё СЃРЅСЏС‚Р° СЃ РїРѕРґРїРёСЃРё. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёС‘Рј Р·Р°РЅРѕРІРѕ Рё РїРѕРІС‚РѕСЂРёС‚Рµ РёСЃРїСЂР°РІР»РµРЅРёРµ.",
			});
		}


		/*
		 * cryptoSignatureAttached: false вЂ” PKCS#7 РѕР±РЅСѓР»С‘РЅ РІРјРµСЃС‚Рµ СЃ newHash.
		 * РљР»РёРµРЅС‚ РѕР±СЏР·Р°РЅ СЃРЅСЏС‚СЊ hasCryptoSignature, РёРЅР°С‡Рµ РїРµС‡Р°С‚СЊ 043/Сѓ РїСЂРѕРґРѕР»Р¶РёС‚
		 * РїРѕРєР°Р·С‹РІР°С‚СЊ С€С‚Р°РјРї В«Р­Р¦РџВ» Р±РµР· РѕС‚С‚РёСЃРєР° РІ Р‘Р”.
		 */
		return reply.send({
			success: true,
			hash: reviseResult.hash,
			revisionCount: reviseResult.revisionCount,
			cryptoSignatureAttached: false,
		});
	});


	// Legacy endpoint: sync-progress + plan signature (kept for backwards compat)
	app.post("/api/diaries/sync-progress", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sync progress")))
			return;
		return reply.send({ success: true });
	});

	app.put("/api/treatment-plans/:planId/signature", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sign plan"))) return;
		return reply.send({ success: true });
	});
}
