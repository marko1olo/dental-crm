/**
 * Общие типы форм документов.
 *
 * `DocumentSelectOption` был объявлен внутри DocumentsView.tsx и повторно — как
 * `any` — в вынесенных формах. Один тип на всех избавляет от расхождения между
 * списком вариантов в AppHelpers и тем, что форма из него читает.
 */
export interface DocumentSelectOption<T extends string> {
	value: T;
	label: string;
}

/**
 * Подсказки из активного визита. Формы документов не лезут за ними в контекст
 * приложения: значения приходят сверху, а формулировки подсказок остаются в
 * самой форме, потому что это её текст.
 */
export interface DocumentVisitHints {
	/** ФИО лечащего врача активного визита, если визит выбран. */
	activeDoctorFullName?: string;
	/** Жалоба активного визита — подсказка для диагноза и показания. */
	activeVisitComplaint?: string;
	/** Зона лечения, выведенная из зубной формулы визита. */
	inferredTreatmentArea?: string;
}
