/**
 * ============================================================================
 * FOOLPROOF DANGER GUARD PRESETS & TYPES
 * SanPiN / 54-FZ / Medical Record 043/u Protection Layer
 * Protects senior nurses and novice receptionists from accidental irreversible actions.
 * ============================================================================
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
		titleRu: "Удаление зуба / изменение зубной формулы 043/у",
		descriptionRu: "Вы собираетесь отметить удаление постоянного зуба в медицинской карте пациента.",
		confirmButtonLabelRu: "Подтвердить удаление зуба",
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
