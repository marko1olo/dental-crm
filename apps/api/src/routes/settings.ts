import {
	chairSchema,
	clinicSettingsSchema,
	createChairSchema,
	createStaffMemberSchema,
	dentalSpecialtySchema,
	documentKindSchema,
	imagingStudyKindSchema,
	nonNegativeMoneyRubSchema,
	type StaffAuthorityFlagKey,
	serviceCategorySchema,
	staffAuthorityStateSchema,
	staffMemberSchema,
	staffRoleSchema,
	uiPreferencesInputSchema,
	uiPreferencesSchema,
	updateChairWorkingHoursSchema,
	updateClinicModeSchema,
	updateClinicProfileSchema,
	updateStaffAuthorityGrantsSchema,
	updateStaffWorkingHoursSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { unguardedBypassAllowed } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	createServiceCatalogItemInDb,
	deactivateServiceCatalogItemInDb,
	ServiceCatalogItemNotFoundError,
	ServiceCatalogStorageDisabledError,
	updateServiceCatalogItemInDb,
} from "../db/pricelistQuery.js";
import {
	createProtocolTemplateInDb,
	deleteProtocolTemplateInDb,
	ProtocolTemplateNotFoundError,
	ProtocolTemplateStorageDisabledError,
	updateProtocolTemplateInDb,
} from "../db/protocolTemplateQuery.js";
import * as schema from "../db/schema.js";
import {
	createChairInDb,
	createStaffMemberInDb,
	deactivateChairInDb,
	deactivateStaffMemberInDb,
	getClinicSettingsFromDb,
	getUiPreferencesFromDb,
	listDoctorCommissionRatesInDb,
	saveUiPreferencesInDb,
	setDoctorCommissionRateInDb,
	stampedUiPreferencesSavedAt,
	UiPreferencesConcurrentSaveError,
	updateChairProfileInDb,
	updateChairWorkingHoursInDb,
	updateClinicModeInDb,
	updateClinicProfileInDb,
	updateStaffCredentialsInDb,
	updateStaffMemberProfileInDb,
	updateStaffWorkingHoursInDb,
} from "../db/settingsQuery.js";
import {
	grantStaffAuthorityInDb,
	StaffAuthorityRevocationUnsupportedError,
	StaffAuthorityStaffNotFoundError,
	StaffAuthorityStorageDisabledError,
} from "../db/staffAuthorityQuery.js";
import { getRequestIdentity } from "../security/identity.js";
import { requirePermission } from "../security/permissions.js";
import { repairMojibakeDeep } from "../text/repairMojibake.js";
import { hashCredential } from "../utils/cryptoHelper.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

/**
 * Правка карточки сотрудника: PUT /api/settings/staff/:staffId.
 *
 * Все поля необязательны — интерфейс шлет частичное обновление. Принимаются
 * только те поля, которые реально хранятся в таблице users И возвращаются
 * назад в getClinicSettingsFromDb. Расписание сюда не входит: у него отдельный
 * адрес /working-hours, и только там проверяются активные записи за пределами
 * нового графика.
 */
const updateStaffMemberProfileSchema = z.object({
	fullName: z.string().trim().min(1).max(240).optional(),
	role: staffRoleSchema.optional(),
	phone: z.string().trim().max(80).nullable().optional(),
	email: z.string().trim().email().max(240).nullable().optional(),
	active: z.boolean().optional(),
});

/**
 * Доступы сотрудника: POST /api/settings/staff/:staffId/credentials.
 *
 * Раньше тело читалось bare cast'ом:
 *   (request.body as { email?: string; password?: string; pinCode?: string }) ?? {}
 * Null body не ронял (?? {}), но number/object в email/password/pinCode давали
 * TypeError на .toLowerCase() / hashCredential ДО try/catch → 500 InternalError.
 * Zod safeParse после auth-first: не-строки → 400, пустой набор → прежнее
 * «Не переданы данные для обновления.».
 */
const updateStaffCredentialsSchema = z.object({
	email: z.string().max(240).optional(),
	password: z.string().max(500).optional(),
	pinCode: z.string().max(64).optional(),
});

/**
 * Ставка врача: PUT /api/settings/staff/:staffId/commission.
 *
 * Процент от кассы, по которому клиника платит врачу. Границы взяты из
 * колонки: doctor_commissions.commission_pct — numeric(5,2), поэтому больше
 * 100 % записать нельзя, и это не произвольный предел, а форма хранения.
 * Ноль допустим: врач на окладе — реальная договорённость, и запрещать её
 * значило бы заставлять клинику держать выдуманный процент.
 */
const updateDoctorCommissionSchema = z.object({
	commissionPct: z.number().min(0).max(100),
});

/**
 * Правка кресла: PUT /api/settings/chairs/:chairId. В таблице chairs из
 * карточки кресла хранятся только название и признак активности.
 */
const updateChairProfileSchema = z.object({
	name: z.string().trim().min(1).max(120).optional(),
	active: z.boolean().optional(),
});

/**
 * Услуга прайса: POST /api/settings/catalog и PUT /api/settings/catalog/:serviceId.
 *
 * Поля и границы взяты из колонок service_catalog_items (db/schema.ts:426), а не
 * назначены произвольно:
 *   • base_price_rub / price_rub — numeric(12,2), то есть максимум
 *     9 999 999 999,99. Отсюда верхняя граница цены: превышение отверг бы сам
 *     Postgres сообщением на английском, и оператор увидел бы отказ без причины.
 *     Точность до копейки проверяет общий nonNegativeMoneyRubSchema — прайс это
 *     основание счёта пациенту, и третий знак после запятой здесь недопустим.
 *   • duration_minutes — integer, приём длиннее суток в расписание не ставится,
 *     поэтому предел 1440 минут.
 *   • category / specialty — те же перечисления, что и у чтения прайса, взяты из
 *     общего контракта: свой список здесь разошёлся бы с экраном.
 *
 * Код услуги: строка, которую клиника использует в своём учёте. Пустая строка
 * допускается, потому что поле в форме необязательное (SettingsPricesTab.tsx), а
 * колонка NOT NULL без значения по умолчанию. Выдумывать код за оператора нельзя:
 * подставленный код попал бы в счёт и в выгрузку как настоящий.
 */
const serviceCatalogItemFields = {
	code: z.string().trim().max(60),
	title: z.string().trim().min(1).max(240),
	category: serviceCategorySchema,
	specialty: dentalSpecialtySchema,
	/*
	 * Верхняя граница добавляется через refine, а не .max(): общий
	 * nonNegativeMoneyRubSchema — это уже ZodEffects после .refine() на копейки, и
	 * числовых методов у него нет. Проверка копеек при этом сохраняется, а не
	 * подменяется своей.
	 */
	basePriceRub: nonNegativeMoneyRubSchema.refine(
		(value) => value <= 9_999_999_999.99,
		{
			message: "цена услуги не помещается в денежную колонку прайса",
		},
	),
	durationMinutes: z.number().int().positive().max(1440),
	taxDeductible: z.boolean(),
	active: z.boolean(),
};

/**
 * Создание услуги. Код и признаки имеют значения по умолчанию, всё остальное
 * обязательно: услуга без названия, категории или цены в прайсе бессмысленна, а
 * подставленная за оператора цена — опасна.
 */
const createServiceCatalogItemSchema = z.object({
	...serviceCatalogItemFields,
	code: serviceCatalogItemFields.code.default(""),
	taxDeductible: serviceCatalogItemFields.taxDeductible.default(true),
	active: serviceCatalogItemFields.active.default(true),
});

/** Правка услуги: интерфейс шлёт частичный набор полей. */
const updateServiceCatalogItemSchema = z.object({
	code: serviceCatalogItemFields.code.optional(),
	title: serviceCatalogItemFields.title.optional(),
	category: serviceCatalogItemFields.category.optional(),
	specialty: serviceCatalogItemFields.specialty.optional(),
	basePriceRub: serviceCatalogItemFields.basePriceRub.optional(),
	durationMinutes: serviceCatalogItemFields.durationMinutes.optional(),
	taxDeductible: serviceCatalogItemFields.taxDeductible.optional(),
	active: serviceCatalogItemFields.active.optional(),
});

/*
 * Разобранные значения объявляются типами.
 *
 * parseSettingsPayload выводит свой параметр структурно из формы safeParse, и у
 * схемы с .default() входной и выходной типы расходятся — вывод сваливается в
 * unknown по каждому полю. Явный тип возвращает проверку на место: без него
 * несовпадение имени поля прошло бы компилятор и обнаружилось только на живом
 * запросе.
 */
type CreateServiceCatalogItemInput = z.infer<
	typeof createServiceCatalogItemSchema
>;
type UpdateServiceCatalogItemInput = z.infer<
	typeof updateServiceCatalogItemSchema
>;

/**
 * Шаблон протокола приёма: POST /api/settings/protocols и
 * PUT /api/settings/protocols/:templateId.
 *
 * ПЕРЕЧИСЛЕНИЯ ЗДЕСЬ ОБЯЗАТЕЛЬНЫ, А НЕ ЖЕЛАТЕЛЬНЫ. Чтение экранов прогоняет
 * строку через protocolTemplateSchema и МОЛЧА выбрасывает не прошедшую
 * (db/domainStateHydration.ts:787). Виды документов и снимков проверяются там
 * теми же documentKindSchema и imagingStudyKindSchema. Шаблон с незнакомым видом
 * документа записался бы в базу и исчез с экрана без следа — администратор
 * увидел бы «сохранено» и пустое место. Поэтому те же перечисления стоят на входе.
 *
 * Границы длин — защита от неограниченного ввода, а не клиническое правило:
 * колонки объявлены как text. Название и причина визита — 240 знаков, как у
 * остальных названий в этом файле; заготовки жалоб, статуса и плана — 20 000, это
 * страница текста, которой протокол и является. Списки ограничены 64 позициями:
 * протокол на приём, а не справочник.
 */
const PROTOCOL_TEXT_LIMIT = 20_000;
const PROTOCOL_LIST_LIMIT = 64;

const protocolTemplateFields = {
	specialty: dentalSpecialtySchema,
	title: z.string().trim().min(1).max(240),
	visitReason: z.string().trim().max(240),
	defaultDurationMinutes: z.number().int().positive().max(1440),
	complaintPrompt: z.string().max(PROTOCOL_TEXT_LIMIT),
	objectiveTemplate: z.string().max(PROTOCOL_TEXT_LIMIT),
	treatmentPlanTemplate: z.string().max(PROTOCOL_TEXT_LIMIT),
	diagnosisHints: z.array(z.string().trim().max(500)).max(PROTOCOL_LIST_LIMIT),
	requiredDocuments: z.array(documentKindSchema).max(PROTOCOL_LIST_LIMIT),
	suggestedImaging: z.array(imagingStudyKindSchema).max(PROTOCOL_LIST_LIMIT),
	safetyWarnings: z.array(z.string().trim().max(500)).max(PROTOCOL_LIST_LIMIT),
};

/**
 * Создание шаблона. Обязательно только название: остальное — заготовки, и пустая
 * заготовка это осмысленное состояние («подсказки нет»), в отличие от шаблона без
 * имени, который нельзя выбрать на приёме.
 *
 * Значения по умолчанию совпадают с тем, что подставляет форма
 * (SettingsProtocolsTab.tsx:68-80), чтобы шаблон, сохранённый сразу после
 * «Добавить шаблон», лёг в базу ровно таким, каким его показали оператору.
 */
const createProtocolTemplateSchema = z.object({
	specialty: protocolTemplateFields.specialty.default("universal"),
	title: protocolTemplateFields.title,
	visitReason: protocolTemplateFields.visitReason.default(""),
	defaultDurationMinutes:
		protocolTemplateFields.defaultDurationMinutes.default(30),
	complaintPrompt: protocolTemplateFields.complaintPrompt.default(""),
	objectiveTemplate: protocolTemplateFields.objectiveTemplate.default(""),
	treatmentPlanTemplate:
		protocolTemplateFields.treatmentPlanTemplate.default(""),
	diagnosisHints: protocolTemplateFields.diagnosisHints.default([]),
	requiredDocuments: protocolTemplateFields.requiredDocuments.default([]),
	suggestedImaging: protocolTemplateFields.suggestedImaging.default([]),
	safetyWarnings: protocolTemplateFields.safetyWarnings.default([]),
});

/**
 * Правка шаблона: интерфейс шлёт весь объект целиком, включая id,
 * organizationId и updatedAt (SettingsProtocolsTab.tsx:86 — `{ ...template }`).
 * Незаявленные ключи zod отбрасывает, и это здесь важно как защита: клиника
 * берётся из подписанного токена, и organizationId из тела запроса не должен
 * иметь ни одного шанса на неё повлиять.
 */
const updateProtocolTemplateSchema = z.object({
	specialty: protocolTemplateFields.specialty.optional(),
	title: protocolTemplateFields.title.optional(),
	visitReason: protocolTemplateFields.visitReason.optional(),
	defaultDurationMinutes:
		protocolTemplateFields.defaultDurationMinutes.optional(),
	complaintPrompt: protocolTemplateFields.complaintPrompt.optional(),
	objectiveTemplate: protocolTemplateFields.objectiveTemplate.optional(),
	treatmentPlanTemplate:
		protocolTemplateFields.treatmentPlanTemplate.optional(),
	diagnosisHints: protocolTemplateFields.diagnosisHints.optional(),
	requiredDocuments: protocolTemplateFields.requiredDocuments.optional(),
	suggestedImaging: protocolTemplateFields.suggestedImaging.optional(),
	safetyWarnings: protocolTemplateFields.safetyWarnings.optional(),
});

type CreateProtocolTemplateInput = z.infer<typeof createProtocolTemplateSchema>;
type UpdateProtocolTemplateInput = z.infer<typeof updateProtocolTemplateSchema>;

type SettingsPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) =>
		| { success: true; data: T }
		| { success: false; error?: { format: () => unknown } };
};

const denteAdminSecretHeader = "x-dente-admin-secret";
const uiPreferencesValidationMessage =
	"Настройки интерфейса не сохранены: проверьте выбранную роль, разделы, фильтры и параметры рабочего места.";
/**
 * ОТКАЗ ПО УСТАРЕВШЕЙ КОПИИ НАСТРОЕК РАБОЧЕГО МЕСТА.
 *
 * ПОЧЕМУ ОТКАЗ, А НЕ ТИХОЕ ИГНОРИРОВАНИЕ. Не сохранить и ответить 200 — это
 * «сохранено» на не сохранённом, то есть тот же класс дефекта, за который в этом
 * файле уже отвергаются пустая правка карточки сотрудника, пустая правка кресла и
 * пустая правка услуги прайса. Хранилище в обоих случаях сохранит верное
 * значение; разница в том, узнает ли об этом человек, у которого на экране
 * осталась перебитая копия.
 *
 * ПОЧЕМУ ТЕКСТ ЖИВЁТ ЗДЕСЬ, А НЕ В `utils/clinicSessionRefusal.ts`. Тот файл —
 * дом ОДНОГО состояния, «запрос пришёл без рабочего кабинета клиники», и он сам
 * прямо запрещает превращать себя во второй словарь сообщений: отказы по существу
 * действия остаются рядом со своей проверкой, потому что их причину знает только
 * она. Здесь рядом уже лежат сорок таких текстов в одной форме «<что> не
 * сохранено: <причина и действие>», и эта форма продолжена.
 *
 * НИ ОДНОЙ ЛАТИНСКОЙ БУКВЫ И НИ ОДНОЙ ОТМЕТКИ ВРЕМЕНИ. Клиент гасит текст отказа
 * целиком, если в нём есть латинское слово из шести и более букв
 * (`operatorReadableErrorDetail` в `apps/web/src/AppHelpers.tsx`), поэтому назвать
 * поле `savedAt` в тексте означало бы, что человек не увидит НИЧЕГО. По той же
 * причине в текст не подставляется время в виде 2026-05-20T11:00:00.000Z: буквы
 * «T» и «Z» латинские, и одна такая подстановка убила бы всю фразу. Действующее
 * значение уходит машинным полем `preferences` — интерфейсу нужно именно оно, а не
 * пересказ времени словами.
 */
const uiPreferencesStaleSaveMessage =
	"Настройки рабочего места не сохранены: в другом окне их изменили позже, и открытая у вас копия устарела. " +
	"Обновите страницу настроек, чтобы увидеть действующие значения, и повторите правку.";
const uiPreferencesConcurrentSaveMessage =
	"Настройки рабочего места не сохранены: их меняли из другого окна в этот же момент. " +
	"Обновите страницу настроек и повторите правку.";
const clinicModeValidationMessage =
	"Режим клиники не сохранен: выберите допустимый режим работы клиники.";
const clinicProfileValidationMessage =
	"Профиль клиники не сохранен: проверьте название, реквизиты, лицензию, часовой пояс и рабочий график.";
const staffCreateValidationMessage =
	"Сотрудник не создан: заполните ФИО, роль, специальности и контактные данные в допустимом формате.";
const staffWorkingHoursValidationMessage =
	"Расписание сотрудника не сохранено: проверьте рабочие дни, начало и окончание смены.";
const chairCreateValidationMessage =
	"Кресло не создано: заполните название, кабинет, оснащение и специализацию в допустимом формате.";
const chairWorkingHoursValidationMessage =
	"Расписание кресла не сохранено: проверьте рабочие дни, начало и окончание смены.";
const clinicProfileTimezoneMessage =
	"Профиль клиники не сохранен: выберите реальный часовой пояс клиники.";
const clinicProfileScheduleConflictMessage =
	"Профиль клиники не сохранен: активные записи должны оставаться в рабочем окне клиники.";
const clinicProfileMutationRejectedMessage =
	"Профиль клиники не сохранен: проверьте профиль, расписание и активные записи клиники.";
const staffWorkingHoursRouteValidationMessage =
	"Расписание сотрудника не сохранено: выберите сотрудника.";
const staffWorkingHoursNotFoundMessage =
	"Расписание сотрудника не сохранено: сотрудник не найден.";
const staffWorkingHoursConflictMessage =
	"Расписание сотрудника не сохранено: есть активная запись за пределами нового расписания.";
const staffWorkingHoursRejectedMessage =
	"Расписание сотрудника не сохранено: проверьте рабочие дни и активные записи.";
const chairWorkingHoursRouteValidationMessage =
	"Расписание кресла не сохранено: выберите кресло.";
const chairWorkingHoursNotFoundMessage =
	"Расписание кресла не сохранено: кресло не найдено.";
const chairWorkingHoursConflictMessage =
	"Расписание кресла не сохранено: есть активная запись за пределами нового расписания.";
const chairWorkingHoursRejectedMessage =
	"Расписание кресла не сохранено: проверьте рабочие дни и активные записи.";
const staffProfileRouteValidationMessage =
	"Карточка сотрудника не сохранена: выберите сотрудника.";
const staffProfileValidationMessage =
	"Карточка сотрудника не сохранена: проверьте ФИО, роль, телефон и почту в допустимом формате.";
const staffProfileEmptyUpdateMessage =
	"Карточка сотрудника не сохранена: не переданы поля для изменения. Расписание меняется отдельным адресом.";
const staffCredentialsValidationMessage =
	"Доступы сотрудника не сохранены: проверьте почту, пароль и PIN в допустимом формате.";
const staffCredentialsEmptyUpdateMessage = "Не переданы данные для обновления.";
const staffProfileNotFoundMessage =
	"Карточка сотрудника не сохранена: сотрудник не найден в этой клинике.";
const staffProfileRejectedMessage =
	"Карточка сотрудника не сохранена: проверьте переданные поля.";
const staffDeactivateRouteValidationMessage =
	"Сотрудник не отключен: выберите сотрудника.";
const staffDeactivateNotFoundMessage =
	"Сотрудник не отключен: сотрудник не найден в этой клинике.";
const staffDeactivateRejectedMessage =
	"Сотрудник не отключен: проверьте выбранного сотрудника.";
const chairProfileRouteValidationMessage =
	"Карточка кресла не сохранена: выберите кресло.";
const chairProfileValidationMessage =
	"Карточка кресла не сохранена: проверьте название кресла.";
const chairProfileEmptyUpdateMessage =
	"Карточка кресла не сохранена: не переданы поля для изменения. Расписание меняется отдельным адресом.";
const chairProfileNotFoundMessage =
	"Карточка кресла не сохранена: кресло не найдено в этой клинике.";
const chairProfileRejectedMessage =
	"Карточка кресла не сохранена: проверьте переданные поля.";
const doctorCommissionRouteValidationMessage =
	"Ставка врача не сохранена: выберите сотрудника.";
const doctorCommissionValidationMessage =
	"Ставка врача не сохранена: укажите процент от кассы числом от 0 до 100.";
const doctorCommissionNotFoundMessage =
	"Ставка врача не сохранена: сотрудник не найден в этой клинике.";
const doctorCommissionRejectedMessage =
	"Ставка врача не сохранена: проверьте выбранного сотрудника и процент.";
const staffAuthorityRouteValidationMessage =
	"Полномочия не сохранены: выберите сотрудника.";
const staffAuthorityValidationMessage =
	"Полномочия не сохранены: каждое полномочие задаётся признаком «да» или «нет».";
const staffAuthorityEmptyUpdateMessage =
	"Полномочия не сохранены: не переданы поля для изменения.";
const staffAuthorityNotFoundMessage =
	"Полномочия не сохранены: сотрудник не найден в этой клинике.";
const staffAuthoritySelfMessage =
	"Полномочия не сохранены: свои собственные полномочия не выдают. " +
	"Роль, которая может их выдавать, все три полномочия уже имеет, поэтому такая правка ничего не добавляет.";
const staffAuthorityUnverifiedMessage =
	"Полномочия не сохранены: клиника определена не подписанным токеном, а заголовком разработки. " +
	"Выдача полномочий по такому запросу не выполняется: войдите в рабочий кабинет клиники.";
const staffAuthorityRejectedMessage =
	"Полномочия не сохранены: проверьте выбранного сотрудника и переданные поля.";

/**
 * Названия полномочий для человека. Отдельный словарь, потому что отказ должен
 * называть КОНКРЕТНУЮ галочку, которая не снялась, а не набор целиком:
 * `PERMISSION_ACTIONS` в security/permissions.ts подписывает права матрицы, а не
 * поля карточки сотрудника, и одно право стоит за разными полномочиями. Тип
 * закрыт: четвёртое полномочие не скомпилируется без подписи.
 */
const staffAuthorityFlagTitles: Record<StaffAuthorityFlagKey, string> = {
	canSignMedicalRecords: "подпись медицинской документации",
	canManageMoney: "работа с кассой, оплатами и возвратами",
	canManageImports: "перенос данных из прежней программы",
};

const chairDeactivateRouteValidationMessage =
	"Кресло не отключено: выберите кресло.";
const chairDeactivateNotFoundMessage =
	"Кресло не отключено: кресло не найдено в этой клинике.";
const chairDeactivateRejectedMessage =
	"Кресло не отключено: проверьте выбранное кресло.";
const serviceCatalogRouteValidationMessage =
	"Услуга не сохранена: выберите услугу прайса.";
const serviceCatalogCreateValidationMessage =
	"Услуга не создана: заполните название, категорию, специальность, цену с точностью до копейки и длительность приёма.";
const serviceCatalogUpdateValidationMessage =
	"Услуга не изменена: проверьте название, категорию, специальность, цену с точностью до копейки и длительность приёма.";
const serviceCatalogEmptyUpdateMessage =
	"Услуга не изменена: не переданы поля для изменения.";
const serviceCatalogCreateNotFoundMessage =
	"Услуга не создана: клиника не найдена.";
const serviceCatalogUpdateNotFoundMessage =
	"Услуга не изменена: услуга не найдена в прайсе этой клиники.";
const serviceCatalogDeactivateNotFoundMessage =
	"Услуга не отключена: услуга не найдена в прайсе этой клиники.";
const protocolTemplateRouteValidationMessage =
	"Шаблон не сохранён: выберите шаблон протокола.";
const protocolTemplateCreateValidationMessage =
	"Шаблон не создан: заполните название, выберите специальность, длительность приёма и допустимые виды документов и снимков.";
const protocolTemplateUpdateValidationMessage =
	"Шаблон не сохранён: проверьте название, специальность, длительность приёма и допустимые виды документов и снимков.";
const protocolTemplateEmptyUpdateMessage =
	"Шаблон не сохранён: не переданы поля для изменения.";
const protocolTemplateCreateNotFoundMessage =
	"Шаблон не создан: клиника не найдена.";
const protocolTemplateUpdateNotFoundMessage =
	"Шаблон не сохранён: шаблон не найден в этой клинике.";
const protocolTemplateDeleteNotFoundMessage =
	"Шаблон не удалён: шаблон не найден в этой клинике.";
const protocolTemplateDeleteRejectedMessage =
	"Шаблон не удалён: проверьте выбранный шаблон.";

function parseSettingsPayload<T>(
	schema: SettingsPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		console.error(
			"SMOKE TEST DEBUG: parseSettingsPayload failed validation:",
			parsed.error?.format(),
		);
		return null;
	}
	return parsed.data;
}

function settingsDomainMessage(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return repairMojibakeDeep(error.message);
}

function hasActiveScheduleConflict(message: string): boolean {
	return (
		message.includes("активная запись") || message.includes("активные записи")
	);
}

/**
 * ФОРМА ОТВЕТА В ЭТОМ ФАЙЛЕ: КОД СТАВИМ, ЗНАЧЕНИЕ ВОЗВРАЩАЕМ.
 *
 * `return reply.code(N).send(x)` возвращает из обработчика сам `reply`, а он
 * thenable: `Reply.prototype.then` (fastify/lib/reply.js:466) разрешается по
 * `eos(reply.raw)` — когда ответ уже ушёл клиенту. server.ts (хук onRoute)
 * оборачивает КАЖДЫЙ обработчик в withTenantCtx, то есть в транзакцию, и ждёт
 * разрешения его промиса, чтобы зафиксировать её: COMMIT уходил ПОСЛЕ ответа.
 * Замерено поллером pg_stat_activity на живом сервере — дельта «коммит минус
 * заголовки» положительная во всех прогонах. При отказе на самом COMMIT клиент
 * уже держит 2xx, и fastify может только записать ошибку в журнал
 * (lib/wrap-thenable.js:63): «сохранено» на экране при нуле строк в базе.
 *
 * Здесь это видно на POST /api/settings/staff/:staffId/credentials —
 * SettingsStaffTab.tsx сразу после него перечитывает GET /api/dashboard.
 *
 * Возврат значения снимает это: fastify зовёт `reply.send(payload)` уже после
 * разрешения промиса (lib/wrap-thenable.js:14), то есть после COMMIT.
 *
 * НЕ ПЕРЕВЕДЕНО: три отказа внутри `requireSettingsAccess`. Эта функция
 * возвращает `string | null` (организацию либо «ответ уже отправлен»), поэтому
 * вернуть из неё тело ответа нельзя, не переписав контракт всех её вызовов.
 * Записи до этих отказов не происходит: это барьер доступа, он стоит первой
 * строкой каждого обработчика.
 */

// Экспортируется ради теста settings.test.ts: он импортирует эту функцию, а она
// была объявлена без export, и весь файл теста падал при загрузке с
// «does not provide an export named 'clinicProfileMutationRejection'».
export function clinicProfileMutationRejection(
	reply: FastifyReply,
	error: unknown,
) {
	const message = settingsDomainMessage(error);
	if (message.includes("часовой пояс")) {
		reply.code(409);
		return {
			error: "ClinicProfileMutationRejected",
			reason: "clinic_time_zone_invalid",
			message: clinicProfileTimezoneMessage,
		};
	}
	if (hasActiveScheduleConflict(message)) {
		reply.code(409);
		return {
			error: "ClinicProfileMutationRejected",
			reason: "active_schedule_conflict",
			message: clinicProfileScheduleConflictMessage,
		};
	}
	reply.code(409);
	return {
		error: "ClinicProfileMutationRejected",
		reason: "clinic_profile_rejected",
		message: clinicProfileMutationRejectedMessage,
	};
}

function staffWorkingHoursRejection(reply: FastifyReply, error: unknown) {
	const message = settingsDomainMessage(error);
	if (message === "Сотрудник не найден.") {
		reply.code(404);
		return {
			error: "StaffScheduleNotFound",
			reason: "staff_not_found",
			message: staffWorkingHoursNotFoundMessage,
		};
	}
	if (hasActiveScheduleConflict(message)) {
		reply.code(409);
		return {
			error: "StaffScheduleRejected",
			reason: "active_schedule_conflict",
			message: staffWorkingHoursConflictMessage,
		};
	}
	reply.code(409);
	return {
		error: "StaffScheduleRejected",
		reason: "schedule_rejected",
		message: staffWorkingHoursRejectedMessage,
	};
}

function chairWorkingHoursRejection(reply: FastifyReply, error: unknown) {
	const message = settingsDomainMessage(error);
	if (message === "Кресло не найдено.") {
		reply.code(404);
		return {
			error: "ChairScheduleNotFound",
			reason: "chair_not_found",
			message: chairWorkingHoursNotFoundMessage,
		};
	}
	if (hasActiveScheduleConflict(message)) {
		reply.code(409);
		return {
			error: "ChairScheduleRejected",
			reason: "active_schedule_conflict",
			message: chairWorkingHoursConflictMessage,
		};
	}
	reply.code(409);
	return {
		error: "ChairScheduleRejected",
		reason: "schedule_rejected",
		message: chairWorkingHoursRejectedMessage,
	};
}

/**
 * Отказы для карточек сотрудника и кресла. Отдельные тексты на правку и на
 * отключение: оператору важно видеть, какое именно действие не прошло, а не
 * общее «ошибка сервера».
 */
function staffMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	const message = settingsDomainMessage(error);
	if (message === "Сотрудник не найден.") {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "staff_not_found",
			message: notFoundMessage,
		};
	}
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "staff_mutation_rejected",
		message: rejectedMessage,
	};
}

/**
 * Отказы прайса. Три исхода разведены сознательно: «писать некуда» — это отказ
 * сервера (503), «услуги нет» — отказ по выбору (404), остальное — отказ по
 * переданным полям (409). Свести их в один текст значило бы отправить оператора
 * искать опечатку в цене там, где хранение просто отключено.
 */
function serviceCatalogMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	if (error instanceof ServiceCatalogStorageDisabledError) {
		reply.code(503);
		return {
			error: "ServiceCatalogStorageUnavailable",
			reason: "state_persistence_off",
			message: error.message,
		};
	}
	if (error instanceof ServiceCatalogItemNotFoundError) {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "service_not_found",
			message: notFoundMessage,
		};
	}
	// Причина уходит в журнал целиком: без записи отказ по прайсу неотличим от
	// опечатки оператора, а разбирать его было бы нечем.
	console.error("[настройки] прайс не изменён:", error);
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "service_mutation_rejected",
		message: rejectedMessage,
	};
}

/**
 * Отказы шаблонов протоколов. Три исхода разведены по той же причине, что у
 * прайса: «писать некуда» (503) — отказ сервера, «шаблона нет» (404) — отказ по
 * выбору, остальное (409) — отказ по переданным полям.
 */
function protocolTemplateMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	if (error instanceof ProtocolTemplateStorageDisabledError) {
		reply.code(503);
		return {
			error: "ProtocolTemplateStorageUnavailable",
			reason: "state_persistence_off",
			message: error.message,
		};
	}
	if (error instanceof ProtocolTemplateNotFoundError) {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "protocol_template_not_found",
			message: notFoundMessage,
		};
	}
	console.error("[настройки] шаблон протокола не изменён:", error);
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "protocol_template_mutation_rejected",
		message: rejectedMessage,
	};
}

/**
 * Отказы по персональным полномочиям. Четыре исхода разведены, потому что
 * следующий шаг владельца в каждом свой: «писать некуда» (503) — включить базу,
 * «сотрудника нет» (404) — выбрать другого, «это даёт роль» (409) — менять роль,
 * а не галочку, остальное (409) — проверить переданные поля.
 */
function staffAuthorityMutationRejection(reply: FastifyReply, error: unknown) {
	if (error instanceof StaffAuthorityStorageDisabledError) {
		reply.code(503);
		return {
			error: "StaffAuthorityStorageUnavailable",
			reason: "state_persistence_off",
			message: error.message,
		};
	}
	if (error instanceof StaffAuthorityStaffNotFoundError) {
		reply.code(404);
		return {
			error: "StaffAuthorityNotFound",
			reason: "staff_not_found",
			message: staffAuthorityNotFoundMessage,
		};
	}
	if (error instanceof StaffAuthorityRevocationUnsupportedError) {
		/*
		 * ЭТО НЕ ОШИБКА ОПЕРАТОРА И НЕ ОТКАЗ ХРАНЕНИЯ. Полномочие даёт роль
		 * сотрудника, а колонка умеет только ДОБАВЛЯТЬ к роли: `false` в ней
		 * означает «надбавки нет», а не «запрещено». Записать `false` и ответить 200
		 * значило бы показать владельцу снятую галочку при сохранившемся праве —
		 * ровно тот дефект, из-за которого выбор «кто допущен к кассе» не работал
		 * годами, только теперь с подтверждением на экране.
		 *
		 * Отклонённые поля уходят машинным списком: интерфейсу нужно вернуть именно
		 * их в прежнее положение, а не перечитывать всю карточку.
		 */
		const titles = error.flags
			.map((flag) => staffAuthorityFlagTitles[flag])
			.join(", ");
		reply.code(409);
		return {
			error: "StaffAuthorityRevocationUnsupported",
			reason: "role_grants_authority",
			flags: error.flags,
			message:
				`Полномочия не сохранены: сотруднику это даёт его роль в клинике (${titles}), ` +
				"поэтому отдельной галочкой снять их нельзя — измените роль в карточке сотрудника.",
		};
	}
	// Причина уходит в журнал целиком: наружу идёт текст для человека, но без
	// записи здесь отказ по полномочиям был бы неотличим от опечатки в запросе.
	console.error("[настройки] полномочия сотрудника не сохранены:", error);
	reply.code(409);
	return {
		error: "StaffAuthorityRejected",
		reason: "staff_authority_rejected",
		message: staffAuthorityRejectedMessage,
	};
}

function chairMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	const message = settingsDomainMessage(error);
	if (message === "Кресло не найдено.") {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "chair_not_found",
			message: notFoundMessage,
		};
	}
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "chair_mutation_rejected",
		message: rejectedMessage,
	};
}

function configuredSettingsAdminSecret(): string | null {
	return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || null;
}

/**
 * Послабление для разработки на всех 23 обработчиках настроек клиники, каждый
 * из которых начинается с `await requireSettingsAccess(request, reply)`
 * (пересчитано 2026-08-06; цифра гниёт — пересчитывай, прежде чем ссылаться):
 * работает ТОЛЬКО при явно названном режиме разработки и ТОЛЬКО при явно
 * выставленном флаге.
 *
 * ПОЧЕМУ ЗДЕСЬ ОБЩИЙ ПРЕДИКАТ, А НЕ ПРЕЖНЕЕ `NODE_ENV !== "production"`.
 * Прежнее условие истинно, когда NODE_ENV НЕ ЗАДАН ВОВСЕ, а незаданный NODE_ENV —
 * типовое состояние настоящего сервера: `apps/api/package.json` объявляет
 * `"start": "node dist/server.js"` и режим не задаёт. Значит у заказчика,
 * поднявшего сервер этой командой, «мы не в production» было ИСТИНОЙ, и от
 * правки прайс-листа, состава сотрудников, их полномочий и учётных данных без
 * секрета администратора защищало только то, что второй флаг где-то не
 * выставлен. Замерено на этом дереве до правки: пустой NODE_ENV +
 * DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1 → охрана снята, маршрут доходил до
 * разбора тела (400 по существу вместо 503).
 *
 * `accessGuard.ts` разбирает эту инверсию подробно и НАЗЫВАЕТ ЭТОТ ФАЙЛ как одну
 * из четырёх копий, которую должен переписать владелец. Пятой копии условия
 * безопасности здесь не будет: одно условие в одном месте — единственный способ
 * не оставить следующую инверсию незамеченной.
 *
 * Смысл послабления не изменился: `development`/`test` плюс
 * `DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1`. Закрылся ровно один случай —
 * пустой или незнакомый NODE_ENV («staging», «prod», опечатка) больше не
 * считается разработкой.
 *
 * ВЕРНУТЬ «КАК БЫЛО» — значит снова открыть настройки клиники на боевом
 * сервере. Если нужно работать без секрета локально, задайте
 * NODE_ENV=development, а не возвращайте отрицание.
 */
function settingsUnguardedMutationsAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS");
}

/**
 * Барьер доступа к настройкам: секрет администратора клиники плюс организация
 * запроса, либо `null` — значит ответ уже отправлен и обработчику остаётся выйти.
 *
 * ЧЕТЫРЕ `reply.send` НИЖЕ ОСТАЮТСЯ И ЭТО НЕ ПРОПУСК. Контракт функции —
 * `Promise<string | null>`: вернуть отсюда тело ответа нельзя, не переписав
 * форму вызова во всех двадцати с лишним обработчиках файла. Отложенного COMMIT
 * на этих ветках не возникает по существу: барьер стоит ПЕРВОЙ строкой каждого
 * обработчика, до него не выполнено ни одного запроса на запись, и откладывать
 * фиксацию нечего.
 */
async function requireSettingsAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	const adminSecret = configuredSettingsAdminSecret();
	let _hasAccess = false;

	if (!adminSecret) {
		if (settingsUnguardedMutationsAllowed()) _hasAccess = true;
		else {
			reply.code(503).send({
				error: "SettingsAdminSecretMissing",
				message:
					"На сервере не задан секрет администратора клиники для изменения настроек клиники.",
			});
			return null;
		}
	} else {
		const providedSecret = request.headers[denteAdminSecretHeader];
		const normalizedProvidedSecret = Array.isArray(providedSecret)
			? providedSecret[0]
			: providedSecret;
		if (
			timingSafeSecretEqual(
				typeof normalizedProvidedSecret === "string"
					? normalizedProvidedSecret
					: null,
				adminSecret,
			)
		) {
			_hasAccess = true;
		} else {
			reply.code(403).send({
				error: "SettingsAdminSecretRequired",
				message:
					"Для изменения настроек клиники нужен действующий секрет администратора клиники.",
			});
			return null;
		}
	}

	// Организация запроса: сначала подписанный токен. Раньше здесь всегда бралась
	// ПЕРВАЯ строка таблицы organizations — при нескольких клиниках в одной базе
	// это означало, что настройки одной клиники правились от имени другой.
	const tokenOrganizationId = getRequestIdentity(request).organizationId;
	if (tokenOrganizationId) return tokenOrganizationId;

	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
		return "00000000-0000-0000-0000-000000000001";
	}

	// Фолбэк для однокликовой установки MVP: единственная организация в базе.
	const orgs = await db
		.select({ id: schema.organizations.id })
		.from(schema.organizations)
		.limit(2);
	if (orgs.length > 1) {
		reply.code(401).send({
			error: "AuthRequired",
			message:
				"В базе несколько клиник — войдите в кабинет, чтобы изменить настройки.",
		});
		return null;
	}
	const org = orgs[0];
	if (!org) {
		reply.code(500).send({
			error: "NoOrganizationFound",
			message: "Не найдена организация в базе данных.",
		});
		return null;
	}
	return org.id;
}

export async function registerSettingsRoutes(app: FastifyInstance) {
	app.get("/api/settings/clinic", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const settings = await getClinicSettingsFromDb(orgId);
		return clinicSettingsSchema.parse(settings);
	});

	app.get("/api/settings/preferences", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const prefs = await getUiPreferencesFromDb(orgId);
		return { preferences: prefs ? uiPreferencesSchema.parse(prefs) : null };
	});

	/**
	 * Сохранение настроек рабочего места. Отвечает тем, что ДЕЙСТВИТЕЛЬНО лежит в
	 * хранилище, а не пересказом присланного тела.
	 *
	 * Прежде здесь возвращался собранный на месте объект `updated` — то есть копия
	 * запроса. Даже на ветке без базы, где защита от устаревшей записи в
	 * `sampleData.ts` формально была написана, ответ подтверждал клиенту его
	 * собственную устаревшую копию: хранилище оставляло свежее значение, а маршрут
	 * отвечал старым и с кодом 200. Теперь источник ответа один — итог записи.
	 *
	 * Отметка времени штампуется той же функцией, которой пользуется сравнение
	 * (`stampedUiPreferencesSavedAt`), а не выражением `input.savedAt ?? now`.
	 * Разница видна на неразбираемой строке: прежняя форма записывала её в колонку
	 * как время, и следующее сохранение сравнивать было уже не с чем.
	 */
	app.put("/api/settings/preferences", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(uiPreferencesInputSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: uiPreferencesValidationMessage,
			};
		}
		const updated = {
			...input,
			version: 1 as const,
			savedAt: stampedUiPreferencesSavedAt(input.savedAt),
		};
		let outcome: Awaited<ReturnType<typeof saveUiPreferencesInDb>>;
		try {
			outcome = await saveUiPreferencesInDb(orgId, updated);
		} catch (error) {
			// Проигранная сверка прежнего значения — не ошибка оператора и не сбой
			// базы: писали одновременно. Отвечать 500 значило бы отправить человека к
			// администратору вместо того, чтобы обновить страницу и повторить правку.
			if (error instanceof UiPreferencesConcurrentSaveError) {
				console.error(
					"[настройки] настройки рабочего места не сохранены:",
					error,
				);
				reply.code(409);
				return {
					error: "UiPreferencesConcurrentSave",
					reason: "concurrent_ui_preferences_save",
					message: uiPreferencesConcurrentSaveMessage,
				};
			}
			throw error;
		}
		if (!outcome.applied) {
			// Действующее значение приложено к отказу: клиенту не нужен второй запрос,
			// чтобы показать человеку, чем именно перебита его копия.
			reply.code(409);
			return {
				error: "UiPreferencesStaleSave",
				reason: "stale_ui_preferences_copy",
				message: uiPreferencesStaleSaveMessage,
				preferences: uiPreferencesSchema.parse(outcome.stored),
			};
		}
		return uiPreferencesSchema.parse(outcome.stored);
	});

	app.post("/api/settings/clinic/mode", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(updateClinicModeSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: clinicModeValidationMessage,
			};
		}
		await updateClinicModeInDb(orgId, input.mode);
		const settings = await getClinicSettingsFromDb(orgId);
		return clinicSettingsSchema.parse(settings);
	});

	app.put("/api/settings/clinic/profile", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(updateClinicProfileSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "ClinicProfileValidationFailed",
				message: clinicProfileValidationMessage,
			};
		}
		try {
			await updateClinicProfileInDb(orgId, input);
			const settings = await getClinicSettingsFromDb(orgId);
			return clinicSettingsSchema.parse(settings);
		} catch (error) {
			return clinicProfileMutationRejection(reply, error);
		}
	});

	app.post("/api/settings/staff", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(createStaffMemberSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffCreateValidationMessage,
			};
		}
		const created = await createStaffMemberInDb(orgId, input);
		reply.code(201);
		return staffMemberSchema.parse(created);
	});

	app.post(
		"/api/settings/staff/:staffId/credentials",
		async (request, reply) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const params = request.params as { staffId?: string };
			if (!params.staffId) {
				reply.code(400);
				return {
					error: "SettingsRouteValidationError",
					message: "ID сотрудника обязателен.",
				};
			}

			const input = parseSettingsPayload(
				updateStaffCredentialsSchema,
				request.body,
			);
			if (!input) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: staffCredentialsValidationMessage,
				};
			}
			const { email, password, pinCode } = input;
			if (!email && !password && !pinCode) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: staffCredentialsEmptyUpdateMessage,
				};
			}

			const updates: {
				email?: string;
				passwordHash?: string;
				pinCodeHash?: string;
			} = {};
			if (email) updates.email = email.toLowerCase().trim();
			if (password) updates.passwordHash = await hashCredential(password);
			if (pinCode) updates.pinCodeHash = await hashCredential(pinCode);

			try {
				await updateStaffCredentialsInDb(orgId, params.staffId, updates);
				/*
				 * ИМЕННО ЭТОТ ОТВЕТ ЧИТАЕТСЯ СРАЗУ. SettingsStaffTab.tsx после успеха
				 * перечитывает GET /api/dashboard. Пока здесь стоял
				 * `return reply.code(200).send({ ok: true })`, подтверждение уходило
				 * администратору ДО фиксации транзакции: сводка могла прийти со старыми
				 * доступами, а отказ на самом COMMIT оставил бы «сохранено» на экране при
				 * несменённом пароле сотрудника.
				 */
				reply.code(200);
				return { ok: true };
			} catch (_err: unknown) {
				reply.code(500);
				return {
					error: "InternalError",
					message: "Не удалось обновить доступы.",
				};
			}
		},
	);

	app.put(
		"/api/settings/staff/:staffId/working-hours",
		async (request, reply) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const params = request.params as { staffId?: string };
			if (!params.staffId) {
				reply.code(400);
				return {
					error: "SettingsRouteValidationError",
					message: staffWorkingHoursRouteValidationMessage,
				};
			}
			const input = parseSettingsPayload(
				updateStaffWorkingHoursSchema,
				request.body,
			);
			if (!input) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: staffWorkingHoursValidationMessage,
				};
			}
			try {
				await updateStaffWorkingHoursInDb(orgId, params.staffId, input);
				const settings = await getClinicSettingsFromDb(orgId);
				const updated = settings.staff.find((s) => s.id === params.staffId);
				if (!updated) throw new Error("Сотрудник не найден.");
				return staffMemberSchema.parse(updated);
			} catch (error) {
				return staffWorkingHoursRejection(reply, error);
			}
		},
	);

	/**
	 * Правка карточки сотрудника. Интерфейс зовет этот адрес из
	 * updateStaffMember (apps/web/src/useAppLogic.tsx): метод PUT, тело —
	 * частичный набор полей карточки. Маршрута не было вовсе, на сервере жили
	 * только вложенные /credentials и /working-hours, поэтому правка сотрудника
	 * из интерфейса отвечала 404.
	 *
	 * Организация берется из подписанного токена через requireSettingsAccess, а
	 * не из тела запроса, и каждый запрос к базе фильтруется по ней.
	 */
	app.put("/api/settings/staff/:staffId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffProfileRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload(
			updateStaffMemberProfileSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffProfileValidationMessage,
			};
		}
		// Пустое тело и тело из одних неизвестных полей неотличимы после разбора:
		// схема отбрасывает лишние ключи. Молча отвечать 200 на запрос, который
		// ничего не меняет, нельзя — оператор решит, что правка сохранена.
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffProfileEmptyUpdateMessage,
			};
		}
		try {
			await updateStaffMemberProfileInDb(orgId, params.staffId, input);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.staff.find((s) => s.id === params.staffId);
			if (!updated) throw new Error("Сотрудник не найден.");
			return staffMemberSchema.parse(updated);
		} catch (error) {
			return staffMutationRejection(
				reply,
				error,
				staffProfileNotFoundMessage,
				staffProfileRejectedMessage,
				"StaffProfile",
			);
		}
	});

	/**
	 * Отключение сотрудника. Это НЕ физическое удаление: на users.id ссылаются
	 * приемы (doctor_user_id, assistant_user_id) и медицинские записи, поэтому
	 * строка сохраняется, а признак users.is_active становится false. Сотрудник
	 * возвращается в ответе с active: false, история лечения остается с автором.
	 */
	app.delete("/api/settings/staff/:staffId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffDeactivateRouteValidationMessage,
			};
		}
		try {
			await deactivateStaffMemberInDb(orgId, params.staffId);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.staff.find((s) => s.id === params.staffId);
			if (!updated) throw new Error("Сотрудник не найден.");
			return staffMemberSchema.parse(updated);
		} catch (error) {
			return staffMutationRejection(
				reply,
				error,
				staffDeactivateNotFoundMessage,
				staffDeactivateRejectedMessage,
				"StaffDeactivate",
			);
		}
	});

	/**
	 * Действующие ставки врачей. Отдельный адрес, а не поле в карточке
	 * сотрудника: ставка лежит в другой таблице (doctor_commissions), у неё своя
	 * дата начала действия и своя история отключённых строк, и втискивать её в
	 * staffMemberSchema значило бы показывать процент без даты, с которой он
	 * действует.
	 */
	app.get("/api/settings/staff/commissions", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const commissions = await listDoctorCommissionRatesInDb(orgId);
		return { commissions };
	});

	/**
	 * Назначение ставки врачу — процента от кассы, по которому клиника платит за
	 * лечение.
	 *
	 * До этого маршрута ставку не задавал ни один достижимый экран: писали её
	 * только недостижимый мастер первого запуска и routes/diary.ts, который при
	 * первом закрытии приёма молча вставляет 30 %. Экран выплат печатал «не
	 * задана», владелец шёл исправлять и не находил куда — и клиника платила по
	 * проценту, которого никто не согласовывал.
	 */
	app.put("/api/settings/staff/:staffId/commission", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: doctorCommissionRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload(
			updateDoctorCommissionSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: doctorCommissionValidationMessage,
			};
		}
		try {
			const saved = await setDoctorCommissionRateInDb(
				orgId,
				params.staffId,
				input.commissionPct,
			);
			return saved;
		} catch (error) {
			// Отключённое хранение — это не ошибка оператора: процент вводить некуда,
			// потому что ставки живут только в базе. Отвечать 409 «проверьте поля»
			// значило бы послать владельца искать опечатку там, где её нет.
			const message = settingsDomainMessage(error);
			if (message.includes("DENTAL_STATE_PERSISTENCE")) {
				reply.code(503);
				return {
					error: "DoctorCommissionStorageUnavailable",
					reason: "state_persistence_off",
					message,
				};
			}
			// Причина уходит в журнал сервера целиком: наружу идёт текст для
			// оператора, но без записи здесь отказ по ставке был бы неотличим от
			// опечатки в проценте, и разбирать его было бы нечем.
			console.error("[настройки] ставка врача не сохранена:", error);
			return staffMutationRejection(
				reply,
				error,
				doctorCommissionNotFoundMessage,
				doctorCommissionRejectedMessage,
				"DoctorCommission",
			);
		}
	});

	/**
	 * ПЕРСОНАЛЬНЫЕ ПОЛНОМОЧИЯ СОТРУДНИКА: подпись медицинской документации, касса,
	 * перенос данных. Первый и единственный адрес, которым их можно записать.
	 *
	 * ЧТО БЫЛО. Ни одного. Колонки `users.can_sign_medical_records`,
	 * `can_manage_money`, `can_manage_imports` существуют с миграции 0000
	 * (`boolean NOT NULL DEFAULT false`, проверено на живой базе), но
	 * `createStaffMemberSchema` их не объявляет, а `can_manage_imports` не был
	 * объявлен даже в модели drizzle. Вкладка «Настройки → Персонал» посылает все
	 * три флага в теле POST (`SettingsStaffTab.tsx:127-129`), zod отбрасывает
	 * незаявленные ключи молча, и форма закрывается как после успешного
	 * сохранения: выбор «кто допущен к кассе» не имел последствий ни разу.
	 *
	 * ПОЧЕМУ НЕ ДОБАВЛЕНЫ В `createStaffMemberSchema`, ГДЕ ИХ ЖДЁТ ФОРМА. Форма
	 * посылает `canManageImports: true` ЖЁСТКО, каждому создаваемому сотруднику
	 * (там литерал, а не выбор оператора). Принять это поле на создании значило бы
	 * выдавать право на перенос картотеки каждому новому ассистенту — молча, самим
	 * фактом приёма на работу. Форму правит другая сессия; сервер не обязан
	 * принимать поле, которое интерфейс заполняет неверно.
	 *
	 * СЕМАНТИКА — НАДБАВКА К РОЛИ (итог = роль ИЛИ надбавка), разобрана в
	 * `db/staffAuthorityQuery.ts`. Коротко: в живой базе `false` лежит во всех
	 * строках, включая владельца, поэтому `false` неотличим от «не настраивали» и
	 * читать его как запрет нельзя. Снять надбавку можно; опустить ниже роли —
	 * нельзя, и такой запрос отклоняется, а не сохраняется втихую.
	 *
	 * ОХРАНА ТРОЙНАЯ, И КАЖДЫЙ БАРЬЕР ЗАКРЫВАЕТ СВОЁ.
	 *  1. `requireSettingsAccess` — секрет периметра и клиника из подписанного
	 *     токена, как на всех соседних маршрутах настроек.
	 *  2. Проверенная клиника: непроверенная организация приходит из
	 *     dev-заголовка, то есть её называет сам отправитель запроса. На
	 *     работающем сервере её уже отбрасывает `security/identity.ts`, но
	 *     внутрипроцессный вызов (`app.inject`) под это правило не попадает —
	 *     выдача полномочий не должна быть достижима и оттуда.
	 *  3. `requirePermission(settings.write)` — ИМЕННО ЭТО ПРАВО, и это выбор:
	 *     • `settings.write` в матрице `ROLE_PERMISSIONS` есть только у владельца
	 *       клиники (и легаси-роли с полным доступом). Тот, кто раздаёт
	 *       полномочия, обязан быть тем, кто отвечает за клинику целиком.
	 *     • `finance.write` не годится: оно есть у администратора ресепшена, и
	 *       тогда доступ к кассе мог бы выдать другому человеку тот, кому саму
	 *       кассу доверили, но раздачу доступа — нет.
	 *     • `clinical.write` не годится по той же причине: его имеет каждый врач,
	 *       и право подписи ЭМК уходило бы ассистенту по решению врача.
	 *     • Проверка строгая (`requirePermission`, а не
	 *       `enforcePermissionWhenStaffKnown`): мягкая пропускает запрос без
	 *       токена сотрудника, то есть полномочие выдавалось бы БЕЗ ИМЕНИ. Здесь
	 *       это недопустимо, а сломать переходные сценарии нечем — маршрут новый.
	 *
	 * СЕБЕ НЕ ВЫДАЮТ. Сегодня это тождественно пустой правке: у роли с
	 * `settings.write` все три полномочия и так есть по роли, надбавка себе не
	 * добавляет ничего. Проверка стоит ради будущего: как только `settings.write`
	 * получит роль без `clinical.write`, без неё появился бы путь выдать себе
	 * право подписи медицинской документации.
	 */
	app.put("/api/settings/staff/:staffId/authority", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		if (!getRequestIdentity(request).verified) {
			reply.code(401);
			return {
				error: "VerifiedOrganizationRequired",
				message: staffAuthorityUnverifiedMessage,
			};
		}
		const granter = await requirePermission(request, reply, "settings.write");
		if (!granter) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffAuthorityRouteValidationMessage,
			};
		}
		if (params.staffId === granter.userId) {
			reply.code(403);
			return {
				error: "StaffAuthoritySelfGrantRejected",
				reason: "self_grant",
				message: staffAuthoritySelfMessage,
			};
		}
		const input = parseSettingsPayload(
			updateStaffAuthorityGrantsSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffAuthorityValidationMessage,
			};
		}
		// Тело из одних неизвестных полей после разбора неотличимо от пустого: схема
		// отбрасывает лишние ключи. Ответить 200 на запрос, который ничего не менял,
		// значило бы повторить исходный дефект — теперь с подтверждением на экране.
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffAuthorityEmptyUpdateMessage,
			};
		}
		try {
			/*
			 * Клиника берётся из личности выдающего, а не из возврата
			 * `requireSettingsAccess`: там есть запасные ветки (единственная
			 * организация в базе, отключённое хранение), и ни одна из них не должна
			 * определять клинику при выдаче полномочий. Разойтись эти два значения не
			 * могут — `requirePermission` требует организацию в токене, то есть ровно
			 * ту, которую вернул бы и первый барьер; личность в запросе разбирается
			 * один раз и кэшируется (`security/identity.ts`).
			 */
			const state = await grantStaffAuthorityInDb(
				granter.organizationId,
				params.staffId,
				input,
			);
			return staffAuthorityStateSchema.parse(state);
		} catch (error) {
			return staffAuthorityMutationRejection(reply, error);
		}
	});

	app.post("/api/settings/chairs", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(createChairSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: chairCreateValidationMessage,
			};
		}
		await createChairInDb(orgId, input);
		const settings = await getClinicSettingsFromDb(orgId);
		const created = settings.chairs.find((c) => c.name === input.name);
		reply.code(201);
		return chairSchema.parse(created);
	});

	app.put(
		"/api/settings/chairs/:chairId/working-hours",
		async (request, reply) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const params = request.params as { chairId?: string };
			if (!params.chairId) {
				reply.code(400);
				return {
					error: "SettingsRouteValidationError",
					message: chairWorkingHoursRouteValidationMessage,
				};
			}
			const input = parseSettingsPayload(
				updateChairWorkingHoursSchema,
				request.body,
			);
			if (!input) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: chairWorkingHoursValidationMessage,
				};
			}
			try {
				await updateChairWorkingHoursInDb(orgId, params.chairId, input);
				const settings = await getClinicSettingsFromDb(orgId);
				const updated = settings.chairs.find((c) => c.id === params.chairId);
				if (!updated) throw new Error("Кресло не найдено.");
				return chairSchema.parse(updated);
			} catch (error) {
				return chairWorkingHoursRejection(reply, error);
			}
		},
	);

	/**
	 * Правка кресла. Принимаются только название и признак активности: больше
	 * ничего из карточки кресла таблица chairs не хранит, а кабинет,
	 * специализация и оснащение читаются из базы как пустые значения. Принять их
	 * значило бы ответить 200 и молча потерять ввод оператора.
	 */
	app.put("/api/settings/chairs/:chairId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { chairId?: string };
		if (!params.chairId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: chairProfileRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload(updateChairProfileSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: chairProfileValidationMessage,
			};
		}
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: chairProfileEmptyUpdateMessage,
			};
		}
		try {
			await updateChairProfileInDb(orgId, params.chairId, input);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.chairs.find((c) => c.id === params.chairId);
			if (!updated) throw new Error("Кресло не найдено.");
			return chairSchema.parse(updated);
		} catch (error) {
			return chairMutationRejection(
				reply,
				error,
				chairProfileNotFoundMessage,
				chairProfileRejectedMessage,
				"ChairProfile",
			);
		}
	});

	/**
	 * Отключение кресла. Интерфейс зовет этот адрес из deleteChair
	 * (apps/web/src/useAppLogic.tsx): метод DELETE, тела нет. Физического
	 * удаления не происходит — на chairs.id ссылаются приемы
	 * (appointments.chair_id), поэтому строка сохраняется, а chairs.is_active
	 * становится false. Уже назначенные приемы не теряют привязку к кабинету.
	 */
	app.delete("/api/settings/chairs/:chairId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { chairId?: string };
		if (!params.chairId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: chairDeactivateRouteValidationMessage,
			};
		}
		try {
			await deactivateChairInDb(orgId, params.chairId);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.chairs.find((c) => c.id === params.chairId);
			if (!updated) throw new Error("Кресло не найдено.");
			return chairSchema.parse(updated);
		} catch (error) {
			return chairMutationRejection(
				reply,
				error,
				chairDeactivateNotFoundMessage,
				chairDeactivateRejectedMessage,
				"ChairDeactivate",
			);
		}
	});

	/* ─── ПРАЙС УСЛУГ ─────────────────────────────────────────────────────────
	 *
	 * Интерфейс зовёт эти три адреса из createServiceCatalogItem /
	 * updateServiceCatalogItem / deleteServiceCatalogItem
	 * (apps/web/src/useAppLogic.tsx:7420, 7441, 7462), нажимает их вкладка
	 * «Настройки → Прайс» (components/settings/SettingsPricesTab.tsx:185, 187, 206).
	 * Маршрутов не было ни одного: Fastify отвечал
	 * «Route POST:/api/settings/catalog not found», и обёртка показывала
	 * «Не удалось создать услугу: нужный маршрут не найден», после чего форма
	 * закрывалась как после успешного сохранения.
	 *
	 * Клиника получала прайс один раз, при установке (посев мастера первого
	 * запуска), и после этого не могла ни поднять цену, ни добавить услугу, ни
	 * убрать её из продажи. Прайс — основание счёта пациенту, плана лечения,
	 * расчёта стоимости и правил списания материалов.
	 *
	 * Организация берётся из подписанного токена через requireSettingsAccess, а не
	 * из тела запроса, и стоит в условии КАЖДОГО запроса к базе.
	 */
	app.post("/api/settings/catalog", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload<CreateServiceCatalogItemInput>(
			createServiceCatalogItemSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: serviceCatalogCreateValidationMessage,
			};
		}
		try {
			const created = await createServiceCatalogItemInDb(orgId, input);
			reply.code(201);
			return created;
		} catch (error) {
			return serviceCatalogMutationRejection(
				reply,
				error,
				serviceCatalogCreateNotFoundMessage,
				serviceCatalogCreateValidationMessage,
				"ServiceCatalogCreate",
			);
		}
	});

	app.put("/api/settings/catalog/:serviceId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { serviceId?: string };
		if (!params.serviceId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: serviceCatalogRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload<UpdateServiceCatalogItemInput>(
			updateServiceCatalogItemSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: serviceCatalogUpdateValidationMessage,
			};
		}
		// Тело из одних неизвестных полей после разбора неотличимо от пустого: схема
		// отбрасывает лишние ключи. Ответить 200 на запрос, который ничего не меняет,
		// нельзя — оператор решит, что новая цена сохранена.
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: serviceCatalogEmptyUpdateMessage,
			};
		}
		try {
			const updated = await updateServiceCatalogItemInDb(
				orgId,
				params.serviceId,
				input,
			);
			return updated;
		} catch (error) {
			return serviceCatalogMutationRejection(
				reply,
				error,
				serviceCatalogUpdateNotFoundMessage,
				serviceCatalogUpdateValidationMessage,
				"ServiceCatalogUpdate",
			);
		}
	});

	/**
	 * Отключение услуги. Физического удаления не происходит: на
	 * service_catalog_items.id ссылаются позиции лечения и правила списания
	 * материалов. Услуга возвращается с active: false — экран именно это и обещает
	 * оператору в подтверждении: «Связанные счета сохранятся, но услуга уйдет в архив».
	 */
	app.delete("/api/settings/catalog/:serviceId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { serviceId?: string };
		if (!params.serviceId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: serviceCatalogRouteValidationMessage,
			};
		}
		try {
			const deactivated = await deactivateServiceCatalogItemInDb(
				orgId,
				params.serviceId,
			);
			return deactivated;
		} catch (error) {
			return serviceCatalogMutationRejection(
				reply,
				error,
				serviceCatalogDeactivateNotFoundMessage,
				serviceCatalogUpdateValidationMessage,
				"ServiceCatalogDeactivate",
			);
		}
	});

	/* ─── ШАБЛОНЫ ПРОТОКОЛОВ ПРИЁМА ───────────────────────────────────────────
	 *
	 * Интерфейс зовёт эти адреса из вкладки «Настройки → Протоколы»
	 * (components/settings/SettingsProtocolsTab.tsx:104, 105, 141). Маршрутов не
	 * было ни одного: Fastify отвечал
	 * «Route POST:/api/settings/protocols not found» — и это написано прямо в
	 * комментарии той вкладки, то есть дефект знали и обходили текстом отказа.
	 * Администратор клиники заполнял форму на десять полей, жал «Сохранить» и
	 * читал «Шаблон не сохранён».
	 *
	 * Шаблон протокола подставляет врачу на приёме причину визита, длительность,
	 * заготовку жалоб, объективного статуса и плана лечения, список обязательных
	 * документов и нужных снимков. Без записи клиника не могла ни завести свой
	 * протокол, ни исправить пришедший с посевом.
	 */
	app.post("/api/settings/protocols", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload<CreateProtocolTemplateInput>(
			createProtocolTemplateSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: protocolTemplateCreateValidationMessage,
			};
		}
		try {
			const created = await createProtocolTemplateInDb(orgId, input);
			reply.code(201);
			return created;
		} catch (error) {
			return protocolTemplateMutationRejection(
				reply,
				error,
				protocolTemplateCreateNotFoundMessage,
				protocolTemplateCreateValidationMessage,
				"ProtocolTemplateCreate",
			);
		}
	});

	app.put("/api/settings/protocols/:templateId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { templateId?: string };
		if (!params.templateId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: protocolTemplateRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload<UpdateProtocolTemplateInput>(
			updateProtocolTemplateSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: protocolTemplateUpdateValidationMessage,
			};
		}
		// Тело из одних неизвестных полей после разбора неотличимо от пустого. Ответ
		// 200 на запрос, который ничего не меняет, означал бы, что администратор
		// считает шаблон исправленным, а на приёме подставится прежний.
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: protocolTemplateEmptyUpdateMessage,
			};
		}
		try {
			const updated = await updateProtocolTemplateInDb(
				orgId,
				params.templateId,
				input,
			);
			return updated;
		} catch (error) {
			return protocolTemplateMutationRejection(
				reply,
				error,
				protocolTemplateUpdateNotFoundMessage,
				protocolTemplateUpdateValidationMessage,
				"ProtocolTemplateUpdate",
			);
		}
	});

	/**
	 * Удаление шаблона. Настоящее, а не отключение: на protocol_templates.id не
	 * ссылается ни одна таблица и признака активности у шаблона нет, поэтому рвать
	 * нечего — в отличие от услуги прайса, за которой стоят позиции лечения и
	 * счёта. Экран обещает оператору именно удаление.
	 */
	app.delete("/api/settings/protocols/:templateId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { templateId?: string };
		if (!params.templateId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: protocolTemplateRouteValidationMessage,
			};
		}
		try {
			const deleted = await deleteProtocolTemplateInDb(
				orgId,
				params.templateId,
			);
			return deleted;
		} catch (error) {
			return protocolTemplateMutationRejection(
				reply,
				error,
				protocolTemplateDeleteNotFoundMessage,
				protocolTemplateDeleteRejectedMessage,
				"ProtocolTemplateDelete",
			);
		}
	});

	app.post("/api/settings/reset-demo", async (_request, _reply) => {
		return {
			success: true,
			message:
				"Демонстрационный режим больше не поддерживается (используется Postgres).",
		};
	});

	app.post("/api/settings/reset-zero", async (_request, _reply) => {
		return {
			success: true,
			message: "Очистка базы больше не поддерживается (используется Postgres).",
		};
	});
}
