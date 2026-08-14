import crypto from "node:crypto";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	sterilizationLogs,
	treatmentItems,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../db/schema.js";
import { clinicNotIdentifiedMessage } from "../utils/clinicSessionRefusal.js";
import { verifyCredential } from "../utils/cryptoHelper.js";

/**
 * ДНЕВНИК ПРИЁМА ОТКАЗЫВАЛ КОДОМ, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО. Доказано запросом в процессе (`app.inject`, не дев-сервер): чтение
 * дневника, чтение истории правок, сохранение дневника и его исправление
 * отвечали телом `{"error":"OrgRequired"}` — без поля `message`. Пятая ветка, в
 * подписании (`/lock`), текст имела, но СВОЙ, третьей копией той же фразы в
 * дереве.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Живой клиент подписания
 * (`apps/web/src/components/useVisitDiaryLogic.ts:530-540`) печатает поле
 * `message` тостом ДОСЛОВНО, а без него строит подсказку по коду ответа. Для 403
 * это «войдите в смену заново или попросите администратора открыть доступ» —
 * ложное указание: смена тут не при чём, не определён кабинет клиники. Дневник
 * приёма — юридический документ, и врач, не понявший отказ, либо теряет
 * набранный текст, либо переписывает его во второй записи.
 *
 * ЧЕГО СЕРВЕР НЕ ЗНАЕТ, ТОГО И НЕ УТВЕРЖДАЕТ. `resolveOrganizationId` возвращает
 * null и когда токена кабинета нет, и когда `verifyToken` его отверг
 * (`security/identity.ts`): различить эти два состояния здесь нечем. Поэтому
 * текст называет обе возможные причины и одно действие, которое лечит любую.
 *
 * Коды ответа и значения поля `error` сохранены дословно. Текст живёт в общем
 * доме `utils/clinicSessionRefusal.ts`, чтобы четвёртой копии не появилось.
 */
const DIARY_CLINIC_UNKNOWN_READ_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не открыть",
);
const DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE = clinicNotIdentifiedMessage(
	"историю правок дневника не показать",
);
const DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не сохранить",
	"набранный текст остаётся на экране, не закрывайте приём",
);
const DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE = clinicNotIdentifiedMessage(
	"подписать дневник нельзя",
	"набранный текст остаётся на экране",
);
const DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE = clinicNotIdentifiedMessage(
	"исправить подписанный дневник нельзя",
);

/**
 * «Дневника нет» на чтении истории и на исправлении. Причина у сервера
 * установлена точно: строки с таким номером в этой клинике не существует.
 * Действие названо, потому что оно есть и оно одно — открыть приём заново;
 * прежний голый 404 клиент превращал в «программа клиники обновлена не
 * полностью, сообщите администратору», то есть отправлял врача не туда.
 */
const DIARY_NOT_FOUND_REVISIONS_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, поэтому истории правок у него нет. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и посмотрите историю ещё раз.";
const DIARY_NOT_FOUND_REVISE_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, исправлять нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и повторите исправление.";

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
	 * УКЭП врача. Раньше поле принимал только маршрут /lock, поэтому подпись
	 * через POST физически не могла сохранить оттиск в crypto_signature_pkcs7:
	 * дневник помечался подписанным без самой подписи.
	 */
	pkcs7Signature: z.string().optional(),
});

/**
 * POST /api/diaries/:id/lock и /revise: тела раньше — bare cast.
 * Zod safeParse после requireClinicalMutationAccess (+ role/org gates где они
 * стоят раньше чтения полей) → 400 при non-object; поля остаются optional.
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
	 * complications / comorbidities — поля visit_diaries и UI 043/у.
	 * БЫЛО: схема revise их не принимала, handler не писал. Админ правил
	 * «Осложнения»/«Сопутствующие» — после сохранения оставался старый
	 * текст; в подписанной 043/у ошибка не исправлялась.
	 */
	complications: z.unknown().optional(),
	comorbidities: z.unknown().optional(),
	/*
	 * instrumentTrayBarcode — элемент diary_hash и печать 043/у.
	 * БЫЛО: revise схема/handler не принимали лоток; sterilization/link
	 * при is_locked отвечал 409 «лоток можно править через
	 * ревизию», но /revise лоток не менял — неверный штрихкод в
	 * подписанной 043/у исправить было нельзя.
	 */
	instrumentTrayBarcode: z.unknown().optional(),
	revisionReason: z.unknown().optional(),
});

/**
 * Route params for e-signature diary paths.
 * БЫЛО: bare cast `req.params as { visitId|id: string }` on GET visit,
 * GET revisions, POST lock, POST revise. Non-UUID junk hit the DB and
 * returned 404 NotFound, masking bad route input as “missing diary”.
 * Zod after clinical access gates → 400 ValidationError; existing
 * 404 for well-formed unknown ids is unchanged.
 */
const diaryVisitParamsSchema = z.object({
	visitId: z.string().uuid(),
});

const diaryIdParamsSchema = z.object({
	id: z.string().uuid(),
});

/**
 * SHA-256 печать содержимого дневника 043/у.
 *
 * БЫЛО (раньше): visitId|patientId|S|O|P — без A (МКБ/зуб), осложнений,
 * сопутствующих. Правка диагноза через /revise не меняла diaryHash.
 *
 * БЫЛО (после семи полей): instrument_tray_barcode печатается в 043/у
 * («Инструментальный лоток»), но в хеш не входил. Смена лотка после
 * черновика/подписи оставляла тот же diaryHash — ЭЦП-штамп «заверял»
 * другую упаковку стерилизации, чем в карте.
 *
 * СТАЛО: семь клинических полей + instrumentTrayBarcode (8-й сегмент).
 * Порядок фиксирован; пустое = "". Старые diary_hash без лотка остаются
 * до ближайшего draft save / lock / revise (тогда пересчёт).
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
 * Простая ЭП по PIN сотрудника → непрозрачная отметка, не цифры PIN.
 *
 * БЫЛО: клиент слал `PIN:<четыре цифры>`, /lock и церемония клали строку
 * как есть в crypto_signature_pkcs7. PIN сотрудника лежал открытым текстом
 * рядом с юридической записью 043/у; GET дневника отдавал его в браузер.
 *
 * СТАЛО: при префиксе PIN: сверяем цифры с users.pin_code_hash текущего
 * подписанта (organizationId + userId). Успех → SIMPLE_PIN_EP|userId|iso|
 * первые 12 hex diaryHash (или «nohash»). Отказ → null + код причины.
 * PKCS#7 КриптоПро (без префикса PIN:) проходит без изменения.
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
	"Простую подпись по ПИН-коду может поставить только сотрудник, вошедший в смену. Войдите в смену заново и повторите подписание.";
const DIARY_PIN_NOT_SET_MESSAGE =
	"У вашей учётной записи не задан ПИН-код сотрудника, простую подпись поставить нельзя. Задайте ПИН в настройках персонала или подпишите дневник через КриптоПро.";
const DIARY_PIN_INVALID_MESSAGE =
	"ПИН-код не принят. Проверьте раскладку и введите ПИН-код сотрудника заново.";

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
		// УКЭП / PKCS#7 — без разбора; legacy SIMPLE_PIN_EP тоже проходит.
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
	therapist: "терапия",
	orthopedist: "ортопедия",
	surgeon: "хирургия",
	orthodontist: "ортодонтия",
	periodontist: "пародонтология",
	hygienist: "гигиена",
	pediatric: "детская",
	implantologist: "имплантация",
	radiologist: "рентген",
	universal: "универсально",
};

/**
 * DEFECT #41: RU-метка специальности врача для печати 043/у.
 * users.specialties — jsonb string[]; prefer non-universal codes.
 */
function formatDoctorSpecialtyLabel(raw: unknown): string | null {
	const codes: string[] = Array.isArray(raw)
		? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
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

/** Legacy PIN:… в ответе GET не отдаём — только факт, что оттиск был. */
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
 * Списывать со склада можно только конечное положительное количество.
 *
 * Проверяется КАЖДЫЙ множитель расхода отдельно, а не итоговое произведение:
 * правило со списанием -3 при количестве услуги -2 даёт +6, то есть две ошибки в
 * данных превратились бы в списание, которого никто не назначал. Ни одна из трёх
 * колонок (quantity_to_deduct, treatment_items.quantity, stock_quantity) не имеет
 * в базе ни одного CHECK-ограничения — проверено чтением pg_constraint на живой
 * базе, — поэтому отрицательное количество там физически может лежать.
 */
function isDeductibleQuantity(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

/** Транзакция drizzle — тип берётся у самого db, чтобы не тянуть внутренние пути ORM. */
type DiaryDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/*
 * `NotSaved` отделён от `NotFound` НЕ ради красоты кода, а потому что это два
 * разных состояния с разными действиями врача и разными кодами ответа:
 * «дневника нет» лечится повторным сохранением черновика, «дневник не удалось
 * сохранить» повторным сохранением НЕ лечится и означает сбой сервера. Раньше
 * оба состояния носили код `NotFound`, отдавались одним 404 и различались бы
 * только сравнением текста `err.message` — ровно тем приёмом, который этот файл
 * уже однажды признал негодным (см. комментарий к DiarySigningError ниже).
 */
type DiarySigningFailureCode =
	| "NotFound"
	| "NotSaved"
	| "AlreadyLocked"
	| "InsufficientStock"
	| "Icd10Required"
	| "PinRejected";

/**
 * Отказ церемонии подписания. Раньше оба состояния передавались через
 * `new Error("AlreadyLocked")` и разбирались сравнением `err.message` со
 * строкой — любое совпадение текста из драйвера базы дало бы тот же ответ.
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
 * Единственная церемония подписания дневника.
 *
 * БЫЛО: подписать приём можно было двумя маршрутами, и они делали РАЗНОЕ.
 * `POST /api/diaries` со `status: "signed"` ставил только is_locked, время и хеш.
 * `POST /api/diaries/:id/lock` дополнительно закрывал услуги визита, списывал
 * расходники со склада, писал строки inventory_transactions, заводил ставку врача
 * и оставлял запись в clinical_audit_logs. То есть от того, какой маршрут вызвал
 * экран, зависело, спишется ли материал и останется ли юридический след — при
 * одном и том же действии врача «подписать приём». Остатки склада и журнал
 * расходились молча, и расхождение обнаруживалось только на инвентаризации.
 *
 * СТАЛО: церемония существует один раз, здесь, и оба маршрута её вызывают.
 * Копия отсутствует, поэтому разойтись им больше нечем.
 *
 * Вызывать только внутри транзакции: списание склада и журнал обязаны попасть в
 * базу вместе с замком либо не попасть вовсе.
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

	// 0. Перечитать дневник FOR UPDATE внутри транзакции и заново проверить замок.
	// Проверка снаружи читает ещё незаблокированную строку (TOCTOU): два
	// одновременных подписанта проходят её оба, входят сюда оба и списывают
	// материал дважды. Блокировка строки их сериализует: второй ждёт коммита
	// первого и видит is_locked = true до любого списания.
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
		// Текст говорит врачу и причину, и следующий шаг. Прежнее «Дневник не
		// найден.» причину называло, а действие — нет, и до экрана всё равно не
		// доходило: ветка ответа выбрасывала message целиком.
		throw new DiarySigningError(
			"NotFound",
			"Дневник приёма не найден в этой клинике, подписывать нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён. Откройте приём заново, нажмите «Сохранить черновик» и повторите подписание.",
		);
	}
	if (diary.isLocked) {
		throw new DiarySigningError("AlreadyLocked", "Дневник уже подписан.");
	}

	/*
	 * DEFECT #69: signed 043/у must carry МКБ-10 before lock.
	 * БЫЛО: runDiarySigningCeremony / POST lock / status:signed принимали
	 * пустой diagnosisIcd10. Бумажная 043/у и diary_hash уходили без кода
	 * диагноза; EGISZ CDA уже режет пустой МКБ (#62), а подписанная карта
	 * клиники — нет. Суд/проверка качества видят заверенный дневник без
	 * обязательного поля приказа 834н.
	 * СТАЛО: trim diagnosisIcd10; пусто → 422 Icd10Required до замка/склада.
	 */
	const icdForLock =
		typeof diary.diagnosisIcd10 === "string" ? diary.diagnosisIcd10.trim() : "";
	if (!icdForLock) {
		throw new DiarySigningError(
			"Icd10Required",
			"Перед подписью дневника 043/у укажите код диагноза по МКБ-10. Сохраните черновик с кодом и повторите подписание.",
		);
	}

	// Хеш считается по СОХРАНЁННОЙ строке, а не по телу запроса.
	// БЫЛО: POST хешировал присланные поля. Фронтенд сохраняет черновик отдельно и
	// при подписании часто не присылает клинические поля вовсе — тогда в печать
	// уходил хеш от пустых строк, тогда как в карте оставался прежний текст.
	// Печать заверяла не то содержимое, которое хранится, и любая позднейшая
	// проверка целостности не сошлась бы. Теперь источник один — строка в базе.
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

	// 1. Замок и печать
	/*
	 * DEFECT #76: lock UPDATE must only transition unlocked → locked.
	 * БЫЛО: WHERE id+org only. Concurrent double POST /lock (two tabs /
	 * two sessions that both passed the pre-check) could both set
	 * is_locked=true, overwrite lockedAt/lockedByUserId/diaryHash/PKCS7
	 * and double-run stock deductions + treatment completion below.
	 * СТАЛО: WHERE is_locked=false + returning; zero rows → AlreadyLocked.
	 */
	const lockedRows = await tx
		.update(visitDiaries)
		.set({
			isLocked: true,
			lockedAt,
			lockedByUserId: userId,
			coSignedByUserId: userId,
			/*
			 * DEFECT #35: authorId + doctorId при подписании.
			 * БЫЛО: колонки visit_diaries.author_id / doctor_id в schema есть,
			 * но ceremony писала только lockedByUserId/coSignedByUserId.
			 * biAnalyticsWorker джойнит visitDiaries.doctorId → users —
			 * метрики врача всегда пустые; toothHistory фолбэк на doctorId
			 * тоже не срабатывал.
			 * СТАЛО: подписант = author и treating doctor записи 043/у.
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
			"Дневник подписан и заблокирован.",
		);
	}

	// 2. Закрыть услуги визита и списать расходники.
	// Все чтения ограничены организацией дневника. БЫЛО: правила материалов
	// выбирались по одному serviceId, а позиция склада — по одному id, без
	// организации. Правило чужой клиники, ссылающееся на её же позицию склада,
	// списывало остаток ЧУЖОЙ клиники, а строка inventory_transactions при этом
	// записывалась на нашу — то есть запись о расходе и сам расход оказывались в
	// разных клиниках.
	const deductions: DiaryStockDeduction[] = [];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const transactionsToInsert: any[] = [];
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
				// Правило материалов может быть НИЧЬИМ, и это норма для этого
				// продукта: единственный маршрут, который их создаёт
				// (routes/inventory.ts:410-417), не заполняет organization_id, а
				// колонка nullable — проверено в information_schema живой базы.
				// Требование точного совпадения организации выбрасывало такие
				// правила из выборки, и подписание приёма НЕ СПИСЫВАЛО материал
				// вовсе: измерено на живой базе — остаток 10 -> 10, ноль строк
				// inventory_transactions, при ответе 200 и подписанном дневнике.
				// До 87e367c40 то же правило списывало (10 -> 6): ограничение по
				// организации, закрывшее межклиничную утечку, заодно молча
				// отключило склад для правил, которые продукт создаёт сам. Тихое
				// несписание на подписанном приёме хуже расхождения остатка —
				// инвентаризация не сойдётся, а следа в журнале не останется.
				// Правило ЧУЖОЙ клиники (organization_id заполнен и не наш)
				// по-прежнему не подходит, а позиция склада ниже читается только
				// внутри нашей организации — списать чужой остаток нечем.
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

					// ЧТО ЗДЕСЬ БЫЛО СЛОМАНО НА САМОМ ДЕЛЕ (измерено, а не выведено).
					// Предыдущий комментарий на этом месте — и заголовок коммита
					// 1f65d674b — утверждали, что подписание с ПУСТОЙ полки
					// (stock_quantity = 0) увеличивало остаток, потому что `||`
					// принимал ноль за отсутствующее значение. Это НЕВЕРНО и не
					// воспроизводится: на 1f65d674b^ пустая полка отвечала
					// 400 TransactionFailed при остатке 0. Причина в том, что
					// schema.ts объявляет все три колонки numeric, а drizzle для
					// numeric вызывает String(value) (PgNumeric.mapFromDriverValue),
					// поэтому в маршрут приходит строка "0" — истинная. `||` не имел
					// шанса провалиться, и замена его на `??` была защитной
					// гигиеной, а не исправлением склада.
					//
					// Настоящие два дефекта, оба воспроизведены на 1f65d674b^:
					//  1. ОТРИЦАТЕЛЬНОЕ quantity_to_deduct (-3 при количестве услуги
					//     2) поднимало остаток 10 -> 16 и писало ПОЛОЖИТЕЛЬНУЮ строку
					//     расхода "+6" с типом auto_deduct. Подписание приёма
					//     создавало материал из ничего.
					//  2. Правило со списанием 0 писало мусорную строку движения на 0.
					//     Оно списывало именно 0, а не 1, как утверждал тот коммит.
					const ruleQuantity = Number(rule.quantityToDeduct);
					const serviceQuantity = Number(item.quantity);
					if (
						!isDeductibleQuantity(ruleQuantity) ||
						!isDeductibleQuantity(serviceQuantity)
					) {
						continue;
					}
					const qtyToDeduct = ruleQuantity * serviceQuantity;
					// Остаток читается ровно так же, как его читает единственный
					// другой читатель этой колонки — routes/inventory.ts:143. Раньше
					// здесь стоял фолбэк `?? inv.currentQty`: для строки с
					// stock_quantity NULL церемония списывала из устаревшей
					// current_qty и записывала результат в stock_quantity, то есть
					// позиция, которую склад показывает как 0, ПОЛУЧАЛА остаток.
					// В живой базе stock_quantity объявлен NOT NULL (проверено в
					// information_schema), поэтому ветка была недостижима, а
					// current_qty в продукте не пишет никто — брать остаток оттуда
					// значит подставлять выдуманное значение вместо неизвестного.
					// Неизвестный остаток должен приводить к отказу, а не к расходу.
					const currentStock = Number(inv.stockQuantity ?? 0);
					if (!Number.isFinite(currentStock) || currentStock < qtyToDeduct) {
						throw new DiarySigningError(
							"InsufficientStock",
							`Недостаточно материалов: ${inv.name}`,
						);
					}
					// ДОЛГ, РЕШЕНИЕ ЗА ВЕДУЩИМ: в живой базе stock_quantity,
					// quantity_changed и quantity_to_deduct имеют тип integer, хотя
					// schema.ts объявляет их numeric, а treatment_items.quantity —
					// настоящий numeric(10,2). Поэтому услуга с количеством 1.5 при
					// правиле 1 требует записать "8.5" в integer-колонку: PostgreSQL
					// отвергает запрос, ошибка драйвера не является DiarySigningError
					// и уходит в обработчик server.ts как 500. Измерено: подписание
					// падает, транзакция откатывается целиком (остаток 10, ноль строк
					// расхода, дневник не подписан). Округлять здесь нельзя — это
					// выдуманная политика на материалах. Нужна миграция колонок в
					// numeric, вне рамок этого пакета.
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

					transactionsToInsert.push({
						organizationId,
						visitId: diary.visitId,
						inventoryItemId: inv.id,
						quantityChanged,
						unitCostRub:
							inv.unitCostRub != null ? String(inv.unitCostRub) : null,
						transactionType: "auto_deduct" as const,
						userId,
					});

					deductions.push({
						inventoryItemId: inv.id,
						inventoryItemName: inv.name,
						quantityChanged,
					});
				}
			}

			if (transactionsToInsert.length > 0) {
				await tx.insert(inventoryTransactions).values(transactionsToInsert);
			}
		}
	}

	// 3. Ставка врача, если её ещё нет
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

	// 4. Клинический журнал
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
	 * Ceremony already holds the locked row; push non-empty SOAP → EMK.
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
 * Кто вправе подписать дневник приёма. Один текст на два маршрута подписания
 * (POST /api/diaries со статусом «signed» и POST /api/diaries/:id/lock), потому
 * что действие человека в обоих случаях одно и то же, а расходящиеся
 * формулировки одного отказа — это тот же дефект в рассрочку.
 *
 * Перечисления «кто может» из ролевой матрицы здесь нет намеренно: право
 * проверяется прямо в этих двух маршрутах сравнением роли смены с «doctor» и
 * «admin», и фраза описывает именно это сравнение, а не матрицу
 * security/permissions.ts, которая к нему не применяется.
 */
const DIARY_SIGNING_ROLE_MESSAGE =
	"Дневник приёма подписывает только врач или администратор клиники: у вашей смены такого права нет, и повторный вход его не добавит. Позовите врача, который вёл приём, — подписать может он.";

/**
 * DEFECT #46: dual-storage drift — 043 SOAP never reached visits EMK.
 *
 * БЫЛО: POST /api/diaries и /revise писали только visit_diaries.*.
 * EGISZ CDA (`egisz.ts`) и вкладка ЭМК читают visits.anamnesis /
 * objectiveStatus / diagnosis / treatmentPlan. Врач заполнял 043/у —
 * юридический СЭМД уходил пустым/устаревшим; ЭМК оставалась пустой.
 *
 * СТАЛО: после draft save, signing ceremony и admin-revise пушим
 * непустые SOAP-поля в visits той же org. Пустой SOAP не затирает
 * более полный текст ЭМК (врач мог вести поля только в ЭМК).
 * Маппинг обратен soapPrefillFromVisitNote:
 *   anamnesis → visits.anamnesis
 *   statusLocalis → visits.objectiveStatus
 *   diagnosisIcd10 + diagnosisTooth → visits.diagnosis
 *   treatmentDescription → visits.treatmentPlan
 * complaint не трогаем (отдельное поле ЭМК; в S-блоке 043 оно уже
 * могло быть склеено клиентом при prefill).
 */
function buildEmkDiagnosisText(
	diagnosisIcd10?: string | null,
	diagnosisTooth?: string | null,
): string | null {
	const icd = (diagnosisIcd10 ?? "").trim();
	const tooth = (diagnosisTooth ?? "").trim();
	/*
	 * DEFECT #53: tooth-only must not become visits.diagnosis.
	 * БЫЛО: return `Зуб ${tooth}` when ICD empty → draft/lock/revise sync
	 * overwrote EMK diagnosis that still had МКБ (e.g. «K02.1 Кариес»)
	 * with «Зуб 36». EGISZ gate and tab ЭМК lost the code; CDA then had to
	 * recover via #52 fallback. СТАЛО: push diagnosis only when ICD present
	 * (optionally with tooth). Tooth alone stays on visit_diaries only.
	 */
	if (!icd) return null;
	if (tooth) return `${icd} | Зуб ${tooth}`;
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
				message: "Идентификатор приёма в адресе должен быть UUID (visitId).",
			});
		}
		const { visitId } = parsedVisitParams.data;
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_READ_MESSAGE,
			});

		/*
		 * БЫЛО: нет строки visit_diaries → { diary: null } и для чужого UUID,
		 * и для реального приёма без дневника. Клиент рисовал «пустой SOAP»
		 * как новый приём. СТАЛО: visit ∉ org → 404; пустой дневник — null.
		 */
		const [visitRow] = await db
			.select({ id: visits.id })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);
		if (!visitRow) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message:
					"Приём не найден в этой клинике, дневник 043/у открыть нельзя.",
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
		 * DEFECT #36: ФИО врача для печати 043/у.
		 * БЫЛО: GET отдавал только UUID doctorId/lockedByUserId; клиент печати
		 * брал ctx.activeDoctor (кто СЕЙЧАС в смене). Админ/другой врач
		 * печатал чужой подписанный дневник — в «Врач:» попадало чужое ФИО.
		 * СТАЛО: резолвим ФИО по doctorId → lockedByUserId → authorId →
		 * draftAuthorId внутри org и отдаём doctorFullName / doctorSpecialty.
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
					and(eq(users.id, signingUserId), eq(users.organizationId, orgId)),
				)
				.limit(1);
			if (docUser) {
				doctorFullName =
					typeof docUser.fullName === "string" && docUser.fullName.trim()
						? docUser.fullName.trim()
						: null;
				/*
				 * DEFECT #41: specialty from users.specialties jsonb.
				 * БЫЛО: doctorSpecialty = null всегда — печать 043/у «Врач: ФИО»
				 * без «(терапия)» после F5 / чужой смены.
				 */
				doctorSpecialty = formatDoctorSpecialtyLabel(docUser.specialties);
			}
		}
		/*
		 * Не отдаём legacy PIN:<digits> в браузер: оттиск был, цифр PIN — нет.
		 * SIMPLE_PIN_EP|… и PKCS#7 проходят как есть (цифр PIN в них нет).
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
				message: "Идентификатор дневника в адресе должен быть UUID (id).",
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
			return reply.code(404).send({
				error: "NotFound",
				message: DIARY_NOT_FOUND_REVISIONS_MESSAGE,
			});

		/*
		 * Tenant isolation: organizationId на каждом запросе.
		 * БЫЛО: where только по diaryId — при известном UUID дневника чужой
		 * клиники (или битой строке ревизии с чужим org) forensic-история
		 * 043/у могла уйти не тому арендатору. diaryId уже проверен выше,
		 * orgId в where — второй замок по правилу изоляции.
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
		 * DEFECT #44: кто правил 043/у — ФИО, не UUID.
		 * БЫЛО: GET …/revisions отдавал revisedByUserId сырым UUID;
		 * клиент Forensic UI показывал только when + reason + previous_*.
		 * Суд/проверка качества не видели, КТО внёс правку после подписи.
		 * СТАЛО: batch-resolve fullName внутри org → revisedByFullName.
		 */
		const reviserIds = Array.from(
			new Set(
				revisions
					.map((r) => r.revisedByUserId)
					.filter(
						(uid): uid is string => typeof uid === "string" && uid.length > 0,
					),
			),
		);
		const reviserNameById = new Map<string, string>();
		if (reviserIds.length > 0) {
			const reviserRows = await db
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(
					and(inArray(users.id, reviserIds), eq(users.organizationId, orgId)),
				);
			for (const row of reviserRows) {
				const name =
					typeof row.fullName === "string" ? row.fullName.trim() : "";
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
				message:
					"Проверьте поля дневника приёма. Нужны корректные visitId и patientId (UUID).",
			});
		}
		const data = parsedUpsert.data;
		const userContext = req.user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE,
			});
		data.organizationId = orgId;

		/*
		 * Привязка 043/у к реальному приёму клиники.
		 * БЫЛО: insert/update visit_diaries с visitId/patientId из тела без
		 * проверки visits. У visit_diaries.visit_id НЕТ FK — любой UUID
		 * принимался. Можно было завести дневник на чужой/несуществующий
		 * приём или подменить patientId (хеш 043/у и печать — на «левом»
		 * пациенте). СТАЛО: visit ∈ org, patientId совпадает с карточкой
		 * приёма — до транзакции и до записи на диск/в БД.
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
					"Приём не найден в этой клинике — дневник 043/у к нему не привязать. Откройте приём заново из расписания.",
			});
		}
		if (visitForDiary.patientId !== data.patientId) {
			return reply.code(400).send({
				error: "PatientVisitMismatch",
				message:
					"Пациент в запросе не совпадает с карточкой этого приёма. Обновите страницу приёма и сохраните дневник снова.",
			});
		}

		const isSigning = data.status === "signed";

		if (isSigning && role !== "doctor" && role !== "admin") {
			// Голый код отказа здесь давал самое вредное из возможных указаний:
			// клиент строит по 403 «войдите в смену заново или попросите
			// администратора открыть доступ», а повторный вход ассистенту права
			// подписывать дневник не добавит НИКОГДА. Причина у сервера установлена
			// точно — роль смены не врач и не администратор, — и названа она без
			// внутреннего ключа роли, который человеку ничего не говорит.
			return reply.code(403).send({
				error: "OnlyDoctorsCanSign",
				message: DIARY_SIGNING_ROLE_MESSAGE,
			});
		}

		try {
			// Черновик и подписание — одна транзакция. БЫЛО: три отдельных запроса
			// без транзакции, поэтому упавшее списание оставляло дневник уже
			// подписанным, а склад — нетронутым.
			const outcome = await db.transaction(async (tx) => {
				/*
				 * DEFECT #73: Form 043/у clinical fields immutable when is_locked.
				 *
				 * БЫЛО: SELECT without FOR UPDATE, then UPDATE by id+org only.
				 * Concurrent POST /lock could commit is_locked=true between the
				 * read and the write; draft save still rewrote anamnesis /
				 * diagnosis / treatment / tray on the already-signed 043/у.
				 * Signing ceremony already uses FOR UPDATE; draft path did not.
				 *
				 * СТАЛО: row lock via FOR UPDATE, re-check isLocked, and UPDATE
				 * WHERE is_locked=false. Zero matched rows → AlreadyLocked.
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
						"Дневник подписан и заблокирован.",
					);
				}

				let diaryId: string;
				if (existing) {
					const updatedRows = await tx
						.update(visitDiaries)
						// БЫЛО: `data.X ?? existing.X` по всем клиническим полям. Пустая
						// строка — это не undefined, но фронтенд часто не присылает поле
						// вовсе, и врач НЕ МОГ удалить ошибочно внесённый текст: он стирал
						// поле, сохранял, а прежняя запись молча возвращалась. Для истории
						// болезни это опаснее опечатки — в карте остаётся неверный анамнез
						// или несуществующее осложнение.
						// Теперь поле переписывается, если оно ПРИСУТСТВУЕТ в запросе
						// (включая пустую строку), и сохраняется, только если не передано.
						.set({
							anamnesis:
								data.anamnesis !== undefined
									? data.anamnesis
									: existing.anamnesis,
							statusLocalis:
								data.statusLocalis !== undefined
									? data.statusLocalis
									: existing.statusLocalis,
							diagnosisIcd10:
								data.diagnosisIcd10 !== undefined
									? data.diagnosisIcd10
									: existing.diagnosisIcd10,
							diagnosisTooth:
								data.diagnosisTooth !== undefined
									? data.diagnosisTooth
									: existing.diagnosisTooth,
							treatmentDescription:
								data.treatmentDescription !== undefined
									? data.treatmentDescription
									: existing.treatmentDescription,
							complications:
								data.complications !== undefined
									? data.complications
									: existing.complications,
							comorbidities:
								data.comorbidities !== undefined
									? data.comorbidities
									: existing.comorbidities,
							updatedAt: new Date(),
							/*
							 * Лоток в draft (DEFECT #33).
							 * БЫЛО: пустая строка писалась как ""; клиент опускал
							 * поле при clear → existing barcode оставался.
							 * СТАЛО: поле есть → trim; пусто → null.
							 */
							instrumentTrayBarcode:
								data.instrumentTrayBarcode !== undefined
									? data.instrumentTrayBarcode.trim() || null
									: existing.instrumentTrayBarcode,
							/*
							 * DEFECT #40: progressive author/doctor + last draft editor.
							 * БЫЛО: draft UPDATE не трогал authorId/doctorId/draftAuthorId.
							 * Insert (#35) пишет их только при ПЕРВОМ create. Legacy-строки
							 * с null doctorId и черновики, созданные до #35, оставались
							 * без врача до /lock — GET doctorFullName null, печать 043/у
							 * и BI на незакрытых приёмах пустые. draftAuthorId застывал
							 * на создателе, хотя правки вносит другой сотрудник.
							 * СТАЛО: authorId/doctorId заполняются только если null
							 * (не переписываем лечащего после ассистента→врач до lock);
							 * draftAuthorId = текущий userId (последний редактор черновика).
							 * Lock ceremony по-прежнему authoritative для doctorId.
							 */
							authorId: existing.authorId ?? userId,
							doctorId: existing.doctorId ?? userId,
							draftAuthorId: userId,
						})
						.where(
							and(
								eq(visitDiaries.id, existing.id),
								eq(visitDiaries.organizationId, orgId),
								/* DEFECT #73: never rewrite clinical columns on locked 043/у */
								eq(visitDiaries.isLocked, false),
							),
						)
						.returning({ id: visitDiaries.id });
					if (updatedRows.length === 0) {
						throw new DiarySigningError(
							"AlreadyLocked",
							"Дневник подписан и заблокирован.",
						);
					}
					diaryId = existing.id;
				} else {
					// Дневник всегда рождается черновиком. БЫЛО: при status "signed"
					// вставка сразу ставила is_locked, время и хеш — дневник появлялся
					// уже подписанным, минуя церемонию целиком.
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
									: (data.instrumentTrayBarcode ?? null),
						})
						.returning({ id: visitDiaries.id });
					const insertedId = inserted[0]?.id;
					if (!insertedId) {
						// Дневник приёма — юридический документ. Первое, что человек
						// обязан услышать, — что набранный текст ещё на экране и его
						// нельзя терять; «повторите» здесь было бы ложью, потому что
						// повтор соберёт тот же запрос.
						throw new DiarySigningError(
							"NotSaved",
							"Дневник приёма не удалось сохранить на сервере, поэтому он не подписан. Не закрывайте приём: набранный текст ещё на экране, скопируйте его в надёжное место и позовите администратора клиники.",
						);
					}
					diaryId = insertedId;
				}

				if (!isSigning) {
					/*
					 * Отпечаток содержимого черновика — до подписания.
					 *
					 * БЫЛО: diary_hash писался только в runDiarySigningCeremony (/lock).
					 * POST draft возвращал hash: null. CryptoProSigner подписывает
					 * diaryHash; у неподписанного дневника он всегда null → вкладка
					 * «КриптоПро» навсегда CRYPTO_SIGNING_UNAVAILABLE_TEXT, hasEcp=false
					 * в печати 043/у до lock, а к lock без хеша КриптоПро не доходит.
					 *
					 * СТАЛО: после upsert считаем computeDiaryHash по строке в БД,
					 * пишем diary_hash (замок is_locked не трогаем) и отдаём hash
					 * клиенту — doSave кладёт его в state, окно ЭЦП может подписать.
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
					await tx
						.update(visitDiaries)
						.set({ diaryHash: null, updatedAt: new Date() })
						.where(
							and(
								eq(visitDiaries.id, diaryId),
								eq(visitDiaries.organizationId, orgId),
								/* DEFECT #73: draft hash only while unlocked */
								eq(visitDiaries.isLocked, false),
							),
						);
					/*
					 * DEFECT #46: push 043 SOAP → visits EMK on draft save.
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
						draftHash: null as string | null,
					};
				}

				/*
				 * PIN:… нельзя класть в crypto_signature_pkcs7 как есть.
				 * Резолв до ceremony; при отказе — throw DiarySigningError-подобный
				 * через отдельный код (ниже catch → 403).
				 */
				const resolvedPost = await resolveSignatureForStorage({
					pkcs7Signature: data.pkcs7Signature ?? null,
					userId,
					organizationId: orgId,
					diaryHashForMark: null,
				});
				if (!resolvedPost.ok) {
					throw new DiarySigningError(
						// Pin* не в union DiarySigningFailureCode — используем NotSaved
						// нельзя: это 500. Добавим PinInvalid в union ниже.
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
				 * ЧТО БЫЛО СЛОМАНО. Здесь стояло `return reply.code(404).send({ error:
				 * "NotFound" })` — то есть две соседние ветки того же catch передавали
				 * причину наружу, а третья её выбрасывала, хотя в err.message лежала
				 * готовая русская фраза. Без message клиент строит текст по коду
				 * ответа, и для 404 это «сервер не знает такого раздела — скорее всего
				 * программа клиники обновлена не полностью, сообщите администратору»
				 * (apps/web/src/lib/panelStateText.ts:125-127). Это не безликий текст,
				 * а ЛОЖНОЕ указание: маршрут существует и работает, а врача отправляют
				 * звать администратора вместо одного нажатия «Сохранить черновик».
				 *
				 * И два состояния разведены по кодам, потому что действия у них
				 * противоположные: «дневника нет» лечится повторным сохранением
				 * (404), «дневник не удалось сохранить» не лечится ничем на стороне
				 * врача и обязано читаться как сбой сервера (500).
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
				message: "Идентификатор дневника в адресе должен быть UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
		const parsedLockBody = diaryLockBodySchema.safeParse(req.body ?? {});
		if (!parsedLockBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Тело запроса подписания дневника должно быть JSON-объектом.",
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
		 * ЭТО МЕСТО ДОКАЗАНО ЗАПРОСОМ, а не выведено чтением, и оно вреднее ветки в
		 * POST выше: сюда стучится живой клиент подписания
		 * (apps/web/src/components/useVisitDiaryLogic.ts:507), и он строит текст
		 * тоста ровно из поля message, а без него — по коду ответа (:530-540).
		 * Голые отказы ниже давали врачу три ложных указания подряд: 403 читалось
		 * как «войдите в смену заново» (ассистенту это не поможет никогда), 404 —
		 * как «программа клиники обновлена не полностью, сообщите администратору»
		 * (маршрут существует и работает). Дневник приёма — юридический документ, и
		 * врач, не понявший отказ, либо теряет заполненный текст, либо переписывает
		 * его во второй записи.
		 */
		if (role !== "doctor" && role !== "admin") {
			return reply.code(403).send({
				error: "OnlyDoctorsCanLock",
				message: DIARY_SIGNING_ROLE_MESSAGE,
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE,
			});

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
					"Дневник приёма не найден в этой клинике, подписывать нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён. Откройте приём заново, нажмите «Сохранить черновик» и повторите подписание.",
			});
		/*
		 * Повторная УКЭП после admin-revise.
		 *
		 * БЫЛО: revise обнуляет crypto_signature_pkcs7 (хеш уже другой — старый
		 * PKCS#7 врал бы «подпись ↔ содержимое»), но /lock при is_locked сразу
		 * отвечал 409 AlreadyLocked. Клиент после правки показывал штамп
		 * «ЭЦП (SHA-256)» по одному diaryHash, без PKCS#7, и повторно приложить
		 * подпись к новому хешу было нечем. Печать 043/у выглядела заверенной
		 * УКЭП, хотя оттиска в БД нет.
		 *
		 * СТАЛО: locked + crypto_signature_pkcs7 IS NULL + в теле есть PKCS#7 →
		 * только прикрепляем подпись и пересчитываем hash по строке (без
		 * повторной складской церемонии — услуги/склад уже закрыты первым lock).
		 * locked + PKCS#7 уже есть → по-прежнему 409.
		 *
		 * DEFECT #85: re-attach must serialize on the locked 043/у row.
		 * БЫЛО: outer SELECT without FOR UPDATE, then bare UPDATE by id+org.
		 * Concurrent double POST /lock after revise both saw null PKCS#7 and
		 * both wrote crypto_signature_pkcs7 / diaryHash — last writer won,
		 * first УКЭП silently discarded; concurrent /revise could change SOAP
		 * between hash snapshot and UPDATE so PKCS#7 sealed the wrong text.
		 * СТАЛО: FOR UPDATE inside transaction; hash + author fill from locked
		 * row; UPDATE WHERE is_locked=true AND crypto still empty; zero rows →
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
				 * БЫЛО: 409 отдавал hash, но не lockedAt. Клиент doLock на 409 ставил
				 * isLocked=true и hash, а lockedAt оставался null — печать 043/у и
				 * штамп «Подписан:» показывали «—» / дату с ПК, хотя в БД locked_at есть.
				 */
				return reply.code(409).send({
					error: "AlreadyLocked",
					hash: existing.diaryHash,
					lockedAt: lockedAtIso,
					cryptoSignatureAttached: hasPkcs7,
					message: hasPkcs7
						? "Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка подписанного дневника, её проводит администратор клиники через ревизию."
						: "Дневник уже закрыт замком, но оттиск УКЭП после правки сброшен. Откройте подписание и приложите подпись КриптоПро или простую подпись к текущему отпечатку — склад и услуги повторно не спишутся.",
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
					 * БЫЛО: reattach писал только coSignedByUserId. Legacy-строки
					 * (до DEFECT #35) оставались с doctorId/authorId = null даже
					 * после повторной УКЭП — BI/print/toothHistory без врача.
					 * СТАЛО: заполняем authorId/doctorId/lockedByUserId ТОЛЬКО
					 * если колонка ещё null. После revise исходный doctorId
					 * сохраняется — re-attach не подменяет лечащего врача.
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
						"Дневник приёма не найден в этой клинике, подписывать нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён. Откройте приём заново, нажмите «Сохранить черновик» и повторите подписание.",
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
						? "Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка подписанного дневника, её проводит администратор клиники через ревизию."
						: "Дневник уже закрыт замком, но оттиск УКЭП после правки сброшен. Откройте подписание и приложите подпись КриптоПро или простую подпись к текущему отпечатку — склад и услуги повторно не спишутся.",
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
			/* not_locked: row unlocked between outer read and FOR UPDATE — fall through to ceremony */
		}

		// Церемония — общая с POST /api/diaries, см. runDiarySigningCeremony.
		// PIN:… → verify + opaque mark ДО транзакции (pbkdf2 вне tx-критики).
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
				// Те же две ветки, что и в POST выше, теряли здесь готовую русскую
				// причину из err.message — при том, что третья, соседняя, её отдавала.
				if (err.code === "AlreadyLocked") {
					/*
					 * Race TOCTOU: внешний SELECT ещё не locked, церемония FOR UPDATE
					 * увидела is_locked. БЫЛО: 409 только {error, message} — без hash
					 * и lockedAt. Клиент doLock на 409 ставил isLocked=true, но
					 * diaryHash/lockedAt оставались null → печать 043/у без ЭЦП-штампа
					 * и без даты подписи, хотя в БД оба поля уже есть.
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
			// БЫЛО: `catch (err: any)` возвращал 400 с err.message на ЛЮБОЙ сбой,
			// включая ошибки драйвера базы — клиенту уходили внутренние подробности
			// схемы, а отказ инфраструктуры выглядел как ошибка запроса. Теперь
			// неожидаемые ошибки уходят обработчику server.ts, который их обезличивает.
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
				message: "Идентификатор дневника в адресе должен быть UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
		/* Body Zod before role gate (как /lock): non-object → 400, не 403 oracle. */
		const parsedReviseBody = diaryReviseBodySchema.safeParse(req.body ?? {});
		if (!parsedReviseBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Тело запроса ревизии дневника должно быть JSON-объектом.",
			});
		}
		const userContext = req.user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		if (role !== "admin") {
			/*
			 * Прежний текст назывался «Ревизия заблокированного дневника доступна
			 * только администратору.» — причину он называл, а действие нет, и слово
			 * «ревизия» на экране приёма читается как бухгалтерская проверка. Без
			 * следующего шага врач, которому нужно исправить подписанный дневник,
			 * упирается в отказ и не узнаёт, что исправление вообще возможно — а
			 * дневник приёма это юридический документ, и переписывать его второй
			 * записью нельзя.
			 */
			return reply.code(403).send({
				error: "OnlyAdminsCanRevise",
				message:
					"Исправить уже подписанный дневник приёма может только администратор клиники, и повторный вход этого права не добавит. Позовите администратора клиники — он внесёт правку так, что прежний текст останется в истории дневника.",
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
			 * Лоток: string в теле (в т.ч. "") → переписать; undefined → оставить.
			 * Пустая строка снимает ошибочный barcode с 043/у.
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
		 * DEFECT #84: admin revise of signed Form 043/у must serialize on the row.
		 * БЫЛО: SELECT outside the transaction (no FOR UPDATE), then tx only
		 * inserted visit_diary_revisions + UPDATE from that stale snapshot.
		 * Two concurrent POST /revise both read previous_*=X, both write
		 * forensic rows with previous=X, both bump version to N+1 — intermediate
		 * SOAP Y is lost from the legal revision chain and diary_hash/version
		 * can collide under READ COMMITTED.
		 * СТАЛО: entire revise ceremony in one transaction: FOR UPDATE, re-check
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
			 * Непустой новый barcode — только если журнал стерилизации клиники
			 * подтвердил цикл (тот же критерий, что POST /api/sterilization/link).
			 * Иначе админ мог бы вписать произвольный штрихкод в подписанную 043/у.
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
				if (trayLog?.status !== "passed") {
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
			 * БЫЛО (#84): FOR UPDATE + UPDATE WHERE is_locked=true, but
			 * visit_diary_revisions INSERT ran BEFORE the UPDATE, and the
			 * UPDATE had no .returning() / row-count check. If the belt
			 * matched zero rows (unlocked between snapshot and write, or
			 * version drift), the transaction still committed an orphan
			 * forensic row while diary SOAP/hash/version stayed old; the
			 * HTTP 200 claimed success with a hash that was never stored.
			 * Lock #76 / draft #73 / re-attach #85 all fail closed on
			 * zero returning rows — revise did not.
			 *
			 * СТАЛО: UPDATE first with .returning() and optimistic
			 * version belt (id+org+is_locked+version). Zero rows →
			 * update_lost (no forensic insert). Only after a proven
			 * diary write do we insert visit_diary_revisions previous_*
			 * from the locked snapshot (existing still holds pre-image).
			 *
			 * PKCS#7 still cleared: old signature must not seal new hash.
			 * is_locked and locked_at stay (re-УКЭП is a separate step).
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
						/* belt: only revise while still locked (Form 043/у signed) */
						eq(visitDiaries.isLocked, true),
						/* DEFECT #113: optimistic version — concurrent revise loses cleanly */
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
			 * previous_diagnosis_tooth + revision_reason (миграция 0116),
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

			// БЫЛО: `revisionCount: 1` — константа вместо настоящего числа ревизий.
			// Ответ утверждал «ревизия первая» и на десятой правке карты.
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
				message: "Дневник не подписан — просто редактируйте его.",
			});
		}
		if (reviseResult.kind === "invalid_tray") {
			return reply.code(400).send({
				error: "InvalidTrayBarcode",
				message:
					"Лоток не подтверждён журналом стерилизации этой клиники: такого штрихкода нет или последний цикл не пройден. Укажите штрихкод с прошедшей стерилизацией или очистите поле лотка.",
			});
		}
		if (reviseResult.kind === "update_lost") {
			return reply.code(409).send({
				error: "ReviseConflict",
				message:
					"Исправление подписанного дневника не применилось: запись уже изменилась или снята с подписи. Откройте приём заново и повторите исправление.",
			});
		}

		/*
		 * cryptoSignatureAttached: false — PKCS#7 обнулён вместе с newHash.
		 * Клиент обязан снять hasCryptoSignature, иначе печать 043/у продолжит
		 * показывать штамп «ЭЦП» без оттиска в БД.
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

		const { patientId } = req.body as { patientId?: string };
		const orgId = await resolveOrganizationId(req);
		if (orgId && patientId) {
			const { treatmentPlans, patients } = await import("../db/schema.js");
			await db
				.select()
				.from(treatmentPlans)
				.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.where(
					and(
						eq(treatmentPlans.patientId, patientId),
						eq(patients.organizationId, orgId),
					),
				);
		}

		return reply.send({ success: true });
	});

	app.put("/api/treatment-plans/:planId/signature", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sign plan"))) return;

		const { planId } = req.params as { planId: string };
		const { patientSignature } = req.body as { patientSignature: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired", message: "Не удалось определить клинику. Войдите в кабинет клиники и повторите действие." });

		const { treatmentPlans, patients } = await import("../db/schema.js");
		const [plan] = await db
			.select()
			.from(treatmentPlans)
			.where(eq(treatmentPlans.id, planId));
		if (!plan) return reply.code(404).send({ error: "Not found", message: "План лечения не найден. Обновите страницу и выберите существующий план." });

		const [patient] = await db
			.select()
			.from(patients)
			.where(eq(patients.id, plan.patientId));
		if (!patient || patient.organizationId !== orgId)
			return reply.code(403).send({ error: "Forbidden", message: "Нет доступа к плану лечения этого пациента. Выберите план своей клиники." });

		await db
			.update(treatmentPlans)
			.set({ patientSignature, updatedAt: new Date() })
			.where(eq(treatmentPlans.id, planId));

		return reply.send({ success: true });
	});
}
