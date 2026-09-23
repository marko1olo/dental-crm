/**
 * ============================================================================
 * FOOLPROOF DANGER GUARD PRESETS & TYPES
 * SanPiN / 54-FZ / Medical Record 043/u Protection Layer
 * Protects senior nurses and novice receptionists from accidental irreversible actions.
 * ============================================================================
 * Мандат 8e (Автономия врача и администратора):
 * Запрещено навязывать блокирующие подтверждения на рутинные действия персонала:
 * - Автосохранение дневника приёма (debounced autosave)
 * - Редактирование зубной формулы при обычном осмотре
 * - Применение скидки врачом (до 100%)
 * - Печать бланков/договоров со штампом ЧЕРНОВИК
 * - Касса 54-ФЗ без ИНН физлиц
 * - Списание пустых карпул анестетика медсестрой в 1 клик
 * - Создание записи в расписании без обязательного выбора ассистента
 */

export type DangerousActionType =
	| "cancel_appointment"
	| "delete_tooth"
	| "void_receipt"
	| "delete_inventory_item"
	| "discard_medical_waste"
	| "breach_kraft_batch";

export interface DangerousActionDefinition {
	readonly type: DangerousActionType;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly confirmButtonLabelRu: string;
	readonly cancelButtonLabelRu: string;
	readonly consequencesRu: readonly string[];
	readonly requiresExplicitCheckbox?: boolean;
	readonly dangerSeverity: "critical" | "high" | "moderate";
}

export const DANGEROUS_ACTIONS_REGISTRY: Record<DangerousActionType, DangerousActionDefinition> = {
	cancel_appointment: {
		type: "cancel_appointment",
		titleRu: "Отмена записи пациента на приём",
		descriptionRu: "Вы действительно хотите отменить приём? Пациент будет снят с расписания.",
		confirmButtonLabelRu: "Да, отменить приём",
		cancelButtonLabelRu: "Не отменять (Оставить запись)",
		consequencesRu: [
			"Время врача в расписании освободится для других пациентов",
			"Пациент будет перемещен в список отмененных визитов",
			"Если была внесена предоплата, потребуется оформить возврат или оставить на депозите",
		],
		requiresExplicitCheckbox: false,
		dangerSeverity: "high",
	},
	delete_tooth: {
		type: "delete_tooth",
		titleRu: "Хирургическое удаление зуба (экстракция 043/у)",
		descriptionRu: "Вы собираетесь зафиксировать операцию хирургического удаления постоянного зуба в карте пациента. Обычное заполнение зубной формулы при осмотре подтверждения не требует (Мандат 8e).",
		confirmButtonLabelRu: "Подтвердить операцию удаления",
		cancelButtonLabelRu: "Отмена (Сохранить статус)",
		consequencesRu: [
			"Статус зуба изменится на «Отсутствует (удалён)» в электронной карте 043/у",
			"Запись о хирургическом вмешательстве будет зафиксирована в протоколе приема",
			"Действие повлияет на дальнейший план ортопедического лечения и расчет сметы",
		],
		requiresExplicitCheckbox: true,
		dangerSeverity: "critical",
	},
	void_receipt: {
		type: "void_receipt",
		titleRu: "Аннулирование / возврат фискального чека 54-ФЗ",
		descriptionRu: "Вы собираетесь аннулировать пробитый фискальный чек и оформить возврат прихода.",
		confirmButtonLabelRu: "Аннулировать чек и вернуть средства",
		cancelButtonLabelRu: "Не аннулировать чек",
		consequencesRu: [
			"На кассовом аппарате (ККТ) будет пробит чек «Возврат прихода» по 54-ФЗ",
			"Информация о возврате будет отправлена в ОФД и налоговую инспекцию (ФНС)",
			"Сумма будет вычтена из выручки смены кассира",
		],
		requiresExplicitCheckbox: true,
		dangerSeverity: "critical",
	},
	delete_inventory_item: {
		type: "delete_inventory_item",
		titleRu: "Удаление материала со склада клиники",
		descriptionRu: "Вы собираетесь безвозвратно удалить позицию материала из номенклатуры склада.",
		confirmButtonLabelRu: "Удалить материал со склада",
		cancelButtonLabelRu: "Отмена",
		consequencesRu: [
			"Все остатки и партии по данному материалу будут списаны",
			"Правила автоматического списания по Приказу 804н перестанут работать для этой позиции",
		],
		requiresExplicitCheckbox: false,
		dangerSeverity: "moderate",
	},
	discard_medical_waste: {
		type: "discard_medical_waste",
		titleRu: "Списание и утилизация медотходов (Класс Б / В)",
		descriptionRu: "Подтвердите передачу опасных медицинских отходов на дезинфекцию и вывоз.",
		confirmButtonLabelRu: "Зафиксировать утилизацию",
		cancelButtonLabelRu: "Отмена",
		consequencesRu: [
			"Запись будет внесена в официальный технологический журнал СанПиН 2.1.3684-21",
			"Вес отходов будет списан с ответственного лица кабинета",
		],
		requiresExplicitCheckbox: false,
		dangerSeverity: "high",
	},
	breach_kraft_batch: {
		type: "breach_kraft_batch",
		titleRu: "Брак или нарушение герметичности крафт-пакетов",
		descriptionRu: "Внимание! Вы фиксируете брак индикатора или повреждение крафт-пакетов стерилизации.",
		confirmButtonLabelRu: "Отправить партию на повторную стерилизацию",
		cancelButtonLabelRu: "Отмена (Пакеты герметичны)",
		consequencesRu: [
			"Вся партия пакетов будет заблокирована для использования на пациентах",
			"Инструменты будут направлены на повторную предстерилизационную очистку (ПСО)",
			"В журнал контроля автоклавов 257/у будет внесена запись о браке",
		],
		requiresExplicitCheckbox: true,
		dangerSeverity: "critical",
	},
};

export function getDangerousActionDefinition(actionType: DangerousActionType): DangerousActionDefinition {
	return DANGEROUS_ACTIONS_REGISTRY[actionType] || DANGEROUS_ACTIONS_REGISTRY.cancel_appointment;
}

/**
 * Реестр рутинных клинических и административных действий (Мандаты 8e, 8n).
 * Для этих операций категорически ЗАПРЕЩЕНЫ любые блокирующие диалоги,
 * обязательные подтверждающие чекбоксы или искусственные препоны.
 */
export const ROUTINE_CLINICAL_ACTIONS = [
	"autosave_visit_diary",
	"update_dental_formula_routine",
	"apply_doctor_discount",
	"print_outpatient_document",
	"cash_desk_routine_checkout",
	"nurse_dispose_carpule",
	"schedule_create_appointment",
] as const;

export type RoutineClinicalAction = (typeof ROUTINE_CLINICAL_ACTIONS)[number];

/**
 * Проверяет, является ли операция рутинной клинической деятельностью.
 */
export function isRoutineClinicalAction(action: string): boolean {
	return (ROUTINE_CLINICAL_ACTIONS as readonly string[]).includes(action as RoutineClinicalAction);
}

/**
 * Проверяет необходимость отображения диалога подтверждения опасной операции.
 * Рутинные действия врача и персонала никогда не блокируются (Мандат 8e).
 */
export function requiresDangerConfirmation(action: string): boolean {
	if (isRoutineClinicalAction(action)) {
		return false;
	}
	return action in DANGEROUS_ACTIONS_REGISTRY;
}
