import {
	dentalSpecialtySchema,
	documentKindSchema,
	imagingStudyKindSchema,
	nonNegativeMoneyRubSchema,
	serviceCategorySchema,
	type StaffAuthorityFlagKey,
	staffRoleSchema,
} from "@dental/shared";
import { z } from "zod";

/**
 * Правка карточки сотрудника: PUT /api/settings/staff/:staffId.
 *
 * Все поля необязательны — интерфейс шлет частичное обновление. Принимаются
 * только те поля, которые реально хранятся в таблице users И возвращаются
 * назад в getClinicSettingsFromDb. Расписание сюда не входит: у него отдельный
 * адрес /working-hours, и только там проверяются активные записи за пределами
 * нового графика.
 */
export const updateStaffMemberProfileSchema = z.object({
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
export const updateStaffCredentialsSchema = z.object({
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
export const updateDoctorCommissionSchema = z.object({
	commissionPct: z.number().min(0).max(100),
});

/**
 * Правка кресла: PUT /api/settings/chairs/:chairId. В таблице chairs из
 * карточки кресла хранятся только название и признак активности.
 */
export const updateChairProfileSchema = z.object({
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
export const serviceCatalogItemFields = {
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
export const createServiceCatalogItemSchema = z.object({
	...serviceCatalogItemFields,
	code: serviceCatalogItemFields.code.default(""),
	taxDeductible: serviceCatalogItemFields.taxDeductible.default(true),
	active: serviceCatalogItemFields.active.default(true),
});

/** Правка услуги: интерфейс шлёт частичный набор полей. */
export const updateServiceCatalogItemSchema = z.object({
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
export type CreateServiceCatalogItemInput = z.infer<
	typeof createServiceCatalogItemSchema
>;
export type UpdateServiceCatalogItemInput = z.infer<
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
export const PROTOCOL_TEXT_LIMIT = 20_000;
export const PROTOCOL_LIST_LIMIT = 64;

export const protocolTemplateFields = {
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
export const createProtocolTemplateSchema = z.object({
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
export const updateProtocolTemplateSchema = z.object({
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

export type CreateProtocolTemplateInput = z.infer<
	typeof createProtocolTemplateSchema
>;
export type UpdateProtocolTemplateInput = z.infer<
	typeof updateProtocolTemplateSchema
>;

export type SettingsPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) =>
		| { success: true; data: T }
		| { success: false; error?: { format: () => unknown } };
};

export const denteAdminSecretHeader = "x-dente-admin-secret";
export const uiPreferencesValidationMessage =
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
export const uiPreferencesStaleSaveMessage =
	"Настройки рабочего места не сохранены: в другом окне их изменили позже, и открытая у вас копия устарела. " +
	"Обновите страницу настроек, чтобы увидеть действующие значения, и повторите правку.";
export const uiPreferencesConcurrentSaveMessage =
	"Настройки рабочего места не сохранены: их меняли из другого окна в этот же момент. " +
	"Обновите страницу настроек и повторите правку.";
export const clinicModeValidationMessage =
	"Режим клиники не сохранен: выберите допустимый режим работы клиники.";
export const clinicScalePresetValidationMessage =
	"Пресет масштаба не применен: выберите допустимый пресет работы клиники.";
export const clinicProfileValidationMessage =
	"Профиль клиники не сохранен: проверьте название, реквизиты, лицензию, часовой пояс и рабочий график.";
export const staffCreateValidationMessage =
	"Сотрудник не создан: заполните ФИО, роль, специальности и контактные данные в допустимом формате.";
export const staffWorkingHoursValidationMessage =
	"Расписание сотрудника не сохранено: проверьте рабочие дни, начало и окончание смены.";
export const chairCreateValidationMessage =
	"Кресло не создано: заполните название, кабинет, оснащение и специализацию в допустимом формате.";
export const chairWorkingHoursValidationMessage =
	"Расписание кресла не сохранено: проверьте рабочие дни, начало и окончание смены.";
export const clinicProfileTimezoneMessage =
	"Профиль клиники не сохранен: выберите реальный часовой пояс клиники.";
export const clinicProfileScheduleConflictMessage =
	"Профиль клиники не сохранен: активные записи должны оставаться в рабочем окне клиники.";
export const clinicProfileMutationRejectedMessage =
	"Профиль клиники не сохранен: проверьте профиль, расписание и активные записи клиники.";
export const staffWorkingHoursRouteValidationMessage =
	"Расписание сотрудника не сохранено: выберите сотрудника.";
export const staffWorkingHoursNotFoundMessage =
	"Расписание сотрудника не сохранено: сотрудник не найден.";
export const staffWorkingHoursConflictMessage =
	"Расписание сотрудника не сохранено: есть активная запись за пределами нового расписания.";
export const staffWorkingHoursRejectedMessage =
	"Расписание сотрудника не сохранено: проверьте рабочие дни и активные записи.";
export const chairWorkingHoursRouteValidationMessage =
	"Расписание кресла не сохранено: выберите кресло.";
export const chairWorkingHoursNotFoundMessage =
	"Расписание кресла не сохранено: кресло не найдено.";
export const chairWorkingHoursConflictMessage =
	"Расписание кресла не сохранено: есть активная запись за пределами нового расписания.";
export const chairWorkingHoursRejectedMessage =
	"Расписание кресла не сохранено: проверьте рабочие дни и активные записи.";
export const staffProfileRouteValidationMessage =
	"Карточка сотрудника не сохранена: выберите сотрудника.";
export const staffProfileValidationMessage =
	"Карточка сотрудника не сохранена: проверьте ФИО, роль, телефон и почту в допустимом формате.";
export const staffProfileEmptyUpdateMessage =
	"Карточка сотрудника не сохранена: не переданы поля для изменения. Расписание меняется отдельным адресом.";
export const staffCredentialsValidationMessage =
	"Доступы сотрудника не сохранены: проверьте почту, пароль и PIN в допустимом формате.";
export const staffCredentialsEmptyUpdateMessage = "Не переданы данные для обновления.";
export const staffProfileNotFoundMessage =
	"Карточка сотрудника не сохранена: сотрудник не найден в этой клинике.";
export const staffProfileRejectedMessage =
	"Карточка сотрудника не сохранена: проверьте переданные поля.";
export const staffDeactivateRouteValidationMessage =
	"Сотрудник не отключен: выберите сотрудника.";
export const staffDeactivateNotFoundMessage =
	"Сотрудник не отключен: сотрудник не найден в этой клинике.";
export const staffDeactivateRejectedMessage =
	"Сотрудник не отключен: проверьте выбранного сотрудника.";
export const chairProfileRouteValidationMessage =
	"Карточка кресла не сохранена: выберите кресло.";
export const chairProfileValidationMessage =
	"Карточка кресла не сохранена: проверьте название кресла.";
export const chairProfileEmptyUpdateMessage =
	"Карточка кресла не сохранена: не переданы поля для изменения. Расписание меняется отдельным адресом.";
export const chairProfileNotFoundMessage =
	"Карточка кресла не сохранена: кресло не найдено в этой клинике.";
export const chairProfileRejectedMessage =
	"Карточка кресла не сохранена: проверьте переданные поля.";
export const doctorCommissionRouteValidationMessage =
	"Ставка врача не сохранена: выберите сотрудника.";
export const doctorCommissionValidationMessage =
	"Ставка врача не сохранена: укажите процент от кассы числом от 0 до 100.";
export const doctorCommissionNotFoundMessage =
	"Ставка врача не сохранена: сотрудник не найден в этой клинике.";
export const doctorCommissionRejectedMessage =
	"Ставка врача не сохранена: проверьте выбранного сотрудника и процент.";
export const staffAuthorityRouteValidationMessage =
	"Полномочия не сохранены: выберите сотрудника.";
export const staffAuthorityValidationMessage =
	"Полномочия не сохранены: каждое полномочие задаётся признаком «да» или «нет».";
export const staffAuthorityEmptyUpdateMessage =
	"Полномочия не сохранены: не переданы поля для изменения.";
export const staffAuthorityNotFoundMessage =
	"Полномочия не сохранены: сотрудник не найден в этой клинике.";
export const staffAuthoritySelfMessage =
	"Полномочия не сохранены: свои собственные полномочия не выдают. " +
	"Роль, которая может их выдавать, все три полномочия уже имеет, поэтому такая правка ничего не добавляет.";
export const staffAuthorityUnverifiedMessage =
	"Полномочия не сохранены: клиника определена не подписанным токеном, а заголовком разработки. " +
	"Выдача полномочий по такому запросу не выполняется: войдите в рабочий кабинет клиники.";
export const staffAuthorityRejectedMessage =
	"Полномочия не сохранены: проверьте выбранного сотрудника и переданные поля.";

/**
 * Названия полномочий для человека. Отдельный словарь, потому что отказ должен
 * называть КОНКРЕТНУЮ галочку, которая не снялась, а не набор целиком:
 * `PERMISSION_ACTIONS` в security/permissions.ts подписывает права матрицы, а не
 * поля карточки сотрудника, и одно право стоит за разными полномочиями. Тип
 * закрыт: четвёртое полномочие не скомпилируется без подписи.
 */
export const staffAuthorityFlagTitles: Record<StaffAuthorityFlagKey, string> = {
	canSignMedicalRecords: "подпись медицинской документации",
	canManageMoney: "работа с кассой, оплатами и возвратами",
	canManageImports: "перенос данных из прежней программы",
};

export const chairDeactivateRouteValidationMessage =
	"Кресло не отключено: выберите кресло.";
export const chairDeactivateNotFoundMessage =
	"Кресло не отключено: кресло не найдено в этой клинике.";
export const chairDeactivateRejectedMessage =
	"Кресло не отключено: проверьте выбранное кресло.";
export const serviceCatalogRouteValidationMessage =
	"Услуга не сохранена: выберите услугу прайса.";
export const serviceCatalogCreateValidationMessage =
	"Услуга не создана: заполните название, категорию, специальность, цену с точностью до копейки и длительность приёма.";
export const serviceCatalogUpdateValidationMessage =
	"Услуга не изменена: проверьте название, категорию, специальность, цену с точностью до копейки и длительность приёма.";
export const serviceCatalogEmptyUpdateMessage =
	"Услуга не изменена: не переданы поля для изменения.";
export const serviceCatalogCreateNotFoundMessage =
	"Услуга не создана: клиника не найдена.";
export const serviceCatalogUpdateNotFoundMessage =
	"Услуга не изменена: услуга не найдена в прайсе этой клиники.";
export const serviceCatalogDeactivateNotFoundMessage =
	"Услуга не отключена: услуга не найдена в прайсе этой клиники.";
export const protocolTemplateRouteValidationMessage =
	"Шаблон не сохранён: выберите шаблон протокола.";
export const protocolTemplateCreateValidationMessage =
	"Шаблон не создан: заполните название, выберите специальность, длительность приёма и допустимые виды документов и снимков.";
export const protocolTemplateUpdateValidationMessage =
	"Шаблон не сохранён: проверьте название, специальность, длительность приёма и допустимые виды документов и снимков.";
export const protocolTemplateEmptyUpdateMessage =
	"Шаблон не сохранён: не переданы поля для изменения.";
export const protocolTemplateCreateNotFoundMessage =
	"Шаблон не создан: клиника не найдена.";
export const protocolTemplateUpdateNotFoundMessage =
	"Шаблон не сохранён: шаблон не найден в этой клинике.";
export const protocolTemplateDeleteNotFoundMessage =
	"Шаблон не удалён: шаблон не найден в этой клинике.";
export const protocolTemplateDeleteRejectedMessage =
	"Шаблон не удалён: проверьте выбранный шаблон.";
