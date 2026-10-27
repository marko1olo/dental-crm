import type { QuestTrack } from "./trainingTourTypes";
import { SOLO_DOCTOR_TRACK_STEPS } from "./tracks/soloDoctorTrack";
import { RECEPTION_ADMIN_TRACK_STEPS } from "./tracks/receptionAdminTrack";
import { IMAGING_DIAGNOSTICS_TRACK_STEPS } from "./tracks/imagingDiagnosticsTrack";

export {
	SOLO_DOCTOR_TRACK_STEPS,
	RECEPTION_ADMIN_TRACK_STEPS,
	IMAGING_DIAGNOSTICS_TRACK_STEPS,
};

export const CLINICAL_QUEST_TRACKS: readonly QuestTrack[] = [
	{
		id: "solo_doctor",
		title: "Быстрый старт соло-врача",
		shortTitle: "Соло-врач",
		description: "4 ключевые операции за креслом: расписание, зубная формула, медицинская карта и касса.",
		roleBadge: "Врач-стоматолог",
		estimatedMinutes: 2,
		steps: SOLO_DOCTOR_TRACK_STEPS,
	},
	{
		id: "reception_admin",
		title: "Регистратура и администратор",
		shortTitle: "Регистратура",
		description: "Быстрый приём первичных пациентов: быстрый поиск, бронь времени, договор и чек.",
		roleBadge: "Администратор",
		estimatedMinutes: 2,
		steps: RECEPTION_ADMIN_TRACK_STEPS,
	},
	{
		id: "imaging_diagnostics",
		title: "Рентген, КТ и диагностика",
		shortTitle: "КТ и рентген",
		description: "Работа с визиографом, 3D томографией MPR и точные замеры костного гребня.",
		roleBadge: "Диагностика",
		estimatedMinutes: 2,
		steps: IMAGING_DIAGNOSTICS_TRACK_STEPS,
	},
];
