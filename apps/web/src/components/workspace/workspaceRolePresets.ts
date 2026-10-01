/**
 * workspaceRolePresets.ts
 *
 * Clinical role presets for dental specialists:
 * 1. Therapist (Терапевт) — FDI dental formula, 043/u diary, treatment plan AI.
 * 2. Orthopedist (Ортопед) — Dental lab (ЗТЛ), lab orders, VITA shades, installments.
 * 3. Orthodontist (Ортодонт) — Photoprotocol, aligners, brackets, TMJ gnathology.
 * 4. Surgeon (Хирург) — Surgical protocols, implantology, bone graft, reclamations.
 * 5. Pediatric (Детский врач) — Primary teeth 51–85, adaptation, legal guardian consent.
 *
 * Strict isolation: focus on clinical roles and workspace customization.
 */

import type { WorkspaceFeatureFlags } from "../../hooks/useWorkspaceProfile";
import type { DoctorSpecialtyKey } from "../../store/doctorPreferencesStore";

export interface ClinicalRolePreset {
	readonly key: DoctorSpecialtyKey;
	readonly title: string;
	readonly shortTitle: string;
	readonly badge: string;
	readonly description: string;
	readonly clinicalFocus: string;
	readonly color: string;
	readonly priorityToggleKeys: ReadonlyArray<
		| "hasClinicalRules"
		| "aiEnableTreatmentPlan"
		| "aiEnableRecommendations"
		| "aiEnableDocuments"
		| "hasDentalLab"
		| "hasOrthodontics"
		| "hasGnathology"
		| "hasTasks"
		| "hasReclamations"
		| "hasPediatricMode"
		| "hasInstallments"
		| "hasInsuranceCoPay"
	>;
	readonly presetFlags: Partial<WorkspaceFeatureFlags>;
}

export const CLINICAL_ROLE_PRESETS: readonly ClinicalRolePreset[] = [
	{
		key: "therapist",
		title: "Стоматолог-терапевт",
		shortTitle: "Терапевт",
		badge: "FDI + Дневник 043/у",
		description:
			"Фокус на терапевтическом и эндодонтическом приёме. Включает международную зубную формулу FDI, протоколы лечения кариеса/пульпита и мгновенное автозаполнение дневника 043/у.",
		clinicalFocus: "Формула FDI, протоколы кариеса/пульпита, дневник 043/у, AI-планы лечения.",
		color: "hsl(210 80% 60%)",
		priorityToggleKeys: [
			"hasClinicalRules",
			"aiEnableTreatmentPlan",
			"aiEnableRecommendations",
			"hasTasks",
		],
		presetFlags: {
			hasClinicalRules: true,
			aiEnableTreatmentPlan: true,
			aiEnableRecommendations: true,
			hasDentalLab: false,
			hasPediatricMode: false,
			hasOrthodontics: false,
			hasGnathology: false,
		},
	},
	{
		key: "orthopedist",
		title: "Стоматолог-ортопед",
		shortTitle: "Ортопед",
		badge: "ЗТЛ + Заказы лаборатории",
		description:
			"Фокус на ортопедии и протезировании. Включает модуль Зуботехнической лаборатории (ЗТЛ), отслеживание этапов примерки коронок/виниров, расцветку VITA и согласование этапных смет.",
		clinicalFocus: "ЗТЛ-наряды, контроль этапов коронок/протезов, шкала VITA, рассрочки.",
		color: "hsl(160 70% 50%)",
		priorityToggleKeys: [
			"hasDentalLab",
			"aiEnableTreatmentPlan",
			"hasInstallments",
			"hasClinicalRules",
		],
		presetFlags: {
			hasDentalLab: true,
			aiEnableTreatmentPlan: true,
			hasInstallments: true,
			hasClinicalRules: true,
			hasPediatricMode: false,
			hasOrthodontics: false,
		},
	},
	{
		key: "orthodontist",
		title: "Стоматолог-ортодонт",
		shortTitle: "Ортодонт",
		badge: "Брекеты + Элайнеры",
		description:
			"Фокус на ортодонтии и гнатологии. Включает планирование перемещения зубов, сменную окклюзию, протоколы элайнеров/брекет-систем и диагностику височно-нижнечелюстного сустава (ВНЧС).",
		clinicalFocus: "Брекет-системы, сетапы элайнеров, окклюзионная фотофиксация, ВНЧС.",
		color: "hsl(200 80% 50%)",
		priorityToggleKeys: [
			"hasOrthodontics",
			"hasGnathology",
			"hasDentalLab",
			"aiEnableTreatmentPlan",
		],
		presetFlags: {
			hasOrthodontics: true,
			hasGnathology: true,
			hasDentalLab: true,
			aiEnableTreatmentPlan: true,
			hasPediatricMode: false,
		},
	},
	{
		key: "surgeon",
		title: "Хирург-имплантолог",
		shortTitle: "Хирург",
		badge: "Имплантация + Протоколы",
		description:
			"Фокус на хирургии, удалении зубов и дентальной имплантации. Включает хирургические протоколы, работу с костными материалами, послеоперационные памятки и контроль осложнений.",
		clinicalFocus: "Имплантологические протоколы, костная пластика, памятки после операции, рекламации.",
		color: "hsl(348 83% 47%)",
		priorityToggleKeys: [
			"hasClinicalRules",
			"hasReclamations",
			"aiEnableRecommendations",
			"hasTasks",
		],
		presetFlags: {
			hasClinicalRules: true,
			hasReclamations: true,
			aiEnableRecommendations: true,
			hasTasks: true,
			hasPediatricMode: false,
			hasOrthodontics: false,
		},
	},
	{
		key: "pediatric",
		title: "Детский стоматолог",
		shortTitle: "Детский врач",
		badge: "Молочные зубы (51–85)",
		description:
			"Фокус на детской стоматологии и адаптационном приёме. Включает формулу молочного и сменного прикуса (зубы 51–85), специальные детские протоколы и согласия законных представителей.",
		clinicalFocus: "Молочная формула 51–85, психологическая адаптация, памятки родителям, детские ИДС.",
		color: "hsl(320 70% 60%)",
		priorityToggleKeys: [
			"hasPediatricMode",
			"aiEnableDocuments",
			"aiEnableRecommendations",
			"hasOrthodontics",
		],
		presetFlags: {
			hasPediatricMode: true,
			aiEnableDocuments: true,
			aiEnableRecommendations: true,
			hasOrthodontics: true,
			hasDentalLab: false,
		},
	},
];
