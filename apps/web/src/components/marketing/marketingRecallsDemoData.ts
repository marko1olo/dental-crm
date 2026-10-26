/**
 * marketingRecallsDemoData.ts
 * Isolated showcase mock candidates strictly for isDemoShowcaseMode() (Mandate 8wy).
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import type { MarketingRecallCandidate } from "./marketingRecallsTypes";

export const DEMO_MARKETING_RECALLS: readonly MarketingRecallCandidate[] = [
	{
		id: "demo-rec-1",
		patientId: "pat-demo-01",
		fullName: "Смирнова Елена Викторовна",
		phone: "+7 916 234-56-78",
		badgeType: "hygiene",
		badgeText: "Пора на гигиену • 6 мес",
		procedureTitle: "Комплексная гигиена полости рта и Air-Flow",
		lastVisitDate: "2026-04-12",
		monthsSinceLastVisit: 6,
	},
	{
		id: "demo-rec-2",
		patientId: "pat-demo-02",
		fullName: "Ковалев Андрей Петрович",
		phone: "+7 925 345-67-89",
		badgeType: "ortho",
		badgeText: "Осмотр после ортопедии • 1 год",
		procedureTitle: "Контрольный осмотр коронки 2.6",
		lastVisitDate: "2025-10-15",
		monthsSinceLastVisit: 12,
	},
	{
		id: "demo-rec-3",
		patientId: "pat-demo-03",
		fullName: "Морозова Ольга Сергеевна",
		phone: "+7 903 456-78-90",
		badgeType: "implant",
		badgeText: "Контроль импланта • 3 мес",
		procedureTitle: "Контроль остеоинтеграции импланта 3.6",
		lastVisitDate: "2026-07-20",
		monthsSinceLastVisit: 3,
	},
	{
		id: "demo-rec-4",
		patientId: "pat-demo-04",
		fullName: "Фролов Дмитрий Николаевич",
		phone: "+7 985 567-89-01",
		badgeType: "general",
		badgeText: "Пропущен плановый осмотр",
		procedureTitle: "Терапевтический профосмотр",
		lastVisitDate: "2025-08-10",
		monthsSinceLastVisit: 14,
	},
];
