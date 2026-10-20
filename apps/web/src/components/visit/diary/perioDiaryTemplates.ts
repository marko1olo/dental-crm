import { generatePediatricCariogramDiaryText } from "../../odontogram/pediatricDentitionEngine";

export function buildPerioStatusText(doctorName: string): string {
	return `[ПАРОДОНТОЛОГИЧЕСКИЙ СТАТУС (ФИЗИОЛОГИЧЕСКАЯ НОРМА)]
Десна бледно-розовая, плотная, зубодесневое прикрепление сохранено, патологических карманов нет (норма).
Глубина зондирования зубодесневых борозд: 1–2 мм во всех секстантах.
Кровоточивость при зондировании (BOP): отсутствует (0%).
Патологическая подвижность зубов и фуркационные дефекты: не выявлены.
Клинический диагноз: Клинически здоровый пародонт (К05.0 / Здоровый пародонт).
Врач: ${doctorName || "Лечащий врач"}.`;
}

export function buildPediatricStatusText(
	patientBirthDate: string | null | undefined,
	activeTeeth: readonly any[],
): string {
	const patientAgeYears = patientBirthDate
		? Math.floor(
				(Date.now() - new Date(patientBirthDate).getTime()) /
					(365.25 * 24 * 3600 * 1000),
			)
		: 8;

	const teethStatesMap = activeTeeth.reduce(
		(acc, t) => ({ ...acc, [t.toothNumber]: t.state }),
		{} as Record<number, string>,
	);

	return generatePediatricCariogramDiaryText({
		patientAgeYears: Math.max(1, Math.min(18, patientAgeYears || 8)),
		teethStates: teethStatesMap,
	});
}
