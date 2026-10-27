/**
 * patientCardSavePillDescriptor.ts — Чистая логика дескриптора сохранения карточки пациента
 */

/** Состояние сохранения одного блока карточки. Значения — из store/patientStore.ts. */
export type PatientSectionSaveState = "idle" | "saving" | "saved" | "error";

/**
 * Блок карточки, у которого есть своё сохранение: основные данные и реквизиты документов.
 */
export type PatientSaveSection = {
	readonly dirty: boolean;
	readonly saveState: PatientSectionSaveState;
	readonly validationMessage?: string | null;
};

export type PatientCardSavePillTone = "saving" | "error" | "dirty" | "saved";

export type PatientCardSavePillDescriptor = {
	readonly className: string;
	readonly label: string;
	readonly title: string;
	readonly tone: PatientCardSavePillTone;
};

export type PatientCardSavePillInput = {
	readonly hasSelectedPatient: boolean;
	readonly sections: readonly PatientSaveSection[];
};

/**
 * Что показывать. `null` означает «сказать нечего».
 * Ошибка идёт перед «сохраняю» (защита от маскирования сетевых сбоев).
 */
export function patientCardSavePill(
	input: PatientCardSavePillInput,
): PatientCardSavePillDescriptor | null {
	if (!input.hasSelectedPatient) return null;

	const failed = input.sections.some(
		(section) =>
			section.saveState === "error" ||
			(section.validationMessage !== undefined &&
				section.validationMessage !== null &&
				section.validationMessage.length > 0),
	);
	if (failed) {
		return {
			className: "save-pill save-pill-error",
			label: "Ошибка",
			title:
				"Сервер не принял данные пациента. Введённое осталось в полях — исправьте и сохраните снова.",
			tone: "error",
		};
	}

	if (input.sections.some((section) => section.saveState === "saving")) {
		return {
			className: "save-pill save-pill-saving",
			label: "Сохраняю...",
			title: "Данные пациента отправлены на сервер, ответ ещё не получен.",
			tone: "saving",
		};
	}

	if (input.sections.some((section) => section.dirty)) {
		return {
			className: "save-pill save-pill-dirty",
			label: "Не сохранено",
			title:
				"Изменения ещё не отправлены на сервер. Нажмите кнопку сохранения ниже.",
			tone: "dirty",
		};
	}

	if (input.sections.some((section) => section.saveState === "saved")) {
		return {
			className: "save-pill save-pill-saved",
			label: "Сохранено",
			title: "Изменения этой карточки записаны на сервер.",
			tone: "saved",
		};
	}

	return null;
}
