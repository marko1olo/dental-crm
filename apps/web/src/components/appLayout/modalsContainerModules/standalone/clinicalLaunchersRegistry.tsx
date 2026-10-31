/**
 * Clinical Launchers Registry — Реестр клинических автономных лончеров (Мандаты 8b, 8e, 8aq).
 * Визиты, дневники приёма, медицинские карты, одонтограмма, визиограф, эндодонтия, ортопедия, хирургия, гигиена.
 */

import React from "react";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import {
	type LauncherRegistryEntry,
	evaluateLaunchersRegistry,
} from "./deepLinkMatcher";
import { clearUrlTokens } from "./deepLinkUrl";
import { DirectVisitLauncher } from "../../../visit/DirectVisitLauncher";
import { EmkComplaintsSection } from "../../../visit/emk/EmkComplaintsSection";
import { StandaloneEmrMedicalRecordHost } from "./clinical/StandaloneEmrMedicalRecordHost";
import { StandaloneClinicalTemplatesHost } from "./clinical/StandaloneClinicalTemplatesHost";
import { DirectOdontogramLauncher } from "../../../odontogram/DirectOdontogramLauncher";
import { Tooth46InspectionStand } from "../../../odontogram/gate0/Tooth46InspectionStand";
import { DirectVisiographLauncher } from "../../../visiograph/DirectVisiographLauncher";
import { DirectEndodonticsLauncher } from "../../../endo/DirectEndodonticsLauncher";
import { DirectOrthopedicsLauncher } from "../../../orthopedics/DirectOrthopedicsLauncher";
import { DirectOrthodonticsLauncher } from "../../../orthodontics/DirectOrthodonticsLauncher";
import { DirectSurgeryLauncher } from "../../../surgery/DirectSurgeryLauncher";
import { DirectHygieneLauncher } from "../../../hygiene/DirectHygieneLauncher";
import { DirectConsentLauncher } from "../../../consents/DirectConsentLauncher";
import { renderSpecializedClinicalLaunchers } from "./SpecializedClinicalLaunchers";

export const CLINICAL_LAUNCHERS_REGISTRY: readonly LauncherRegistryEntry<StandaloneLaunchersProps>[] =
	[
		// 1. Дневник приёма у кресла и протокол визита
		{
			id: "chairside-visit",
			title: "Дневник приёма у кресла",
			criteria: {
				searchIncludes: [
					"visit_standalone",
					"standalone=visit",
					"chairside-visit",
				],
				hashIncludes: ["visit_standalone", "chairside-visit"],
			},
			render: () => <DirectVisitLauncher />,
		},

		// 2. Жалобы и первичный анамнез пациента
		{
			id: "emk-complaints",
			title: "Жалобы и анамнез с голосовой диктовкой",
			criteria: {
				tokens: ["emk_complaints", "emk-complaints"],
			},
			render: () => (
				<div className="w-full min-h-screen p-4 sm:p-6 bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-start max-w-4xl mx-auto box-border">
					<EmkComplaintsSection
						visitNoteForm={{
							complaint:
								"Ноющая боль в зубе 36 от сладкого и термических раздражителей, сохраняющаяся до 15-20 минут.",
							complaints:
								"Ноющая боль в зубе 36 от сладкого и термических раздражителей, сохраняющаяся до 15-20 минут.",
							anamnesis:
								"Соматически здоров. Аллергологический анамнез не отягощен. Хронические заболевания отрицает.",
						}}
						updateVisitNoteField={() => {}}
					/>
				</div>
			),
		},

		// 3. Медицинская карта приёма (ЭМК)
		{
			id: "emr-medical-record",
			title: "Медицинская карта приёма пациента",
			criteria: {
				tokens: ["emr", "medical-card", "form043", "card043"],
			},
			render: () => (
				<StandaloneEmrMedicalRecordHost
					onClose={() =>
						clearUrlTokens(["emr", "medical-card", "form043", "card043"])
					}
				/>
			),
		},

		// 4. Клинические протоколы и стандарты лечения
		{
			id: "clinical-protocols",
			title: "Клинические протоколы и шаблоны приёма",
			criteria: {
				tokens: ["protocols", "clinical-templates"],
			},
			render: () => (
				<StandaloneClinicalTemplatesHost
					onClose={() => clearUrlTokens(["protocols", "clinical-templates"])}
				/>
			),
		},

		// 5. Тестовый стенд одонтограммы зуба 46 и зубного ряда
		{
			id: "odontogram-gate0",
			title: "Стенд одонтограммы зуба 46",
			criteria: {
				tokens: ["odontogram-gate0", "odontogram-32", "odontogram-mandible"],
			},
			render: () => <Tooth46InspectionStand />,
		},

		// 6. Одонтограмма и зубная формула FDI 11–48 / 51–85
		{
			id: "odontogram-studio",
			title: "Интерактивная зубная формула FDI",
			criteria: {
				tokens: [
					"odontogram",
					"dental-chart",
					"dental_chart",
					"odontogram-studio",
				],
				exclude: ["odontogram-gate0"],
			},
			render: () => <DirectOdontogramLauncher />,
		},

		// 7. Радиовизиограф и снимки RVG
		{
			id: "visiograph-rvg",
			title: "Радиовизиограф и снимки RVG",
			criteria: {
				tokens: ["visiograph", "rvg", "rvg-studio"],
			},
			render: () => <DirectVisiographLauncher />,
		},

		// 8. Эндодонтия и лечение корневых каналов
		{
			id: "endodontics-studio",
			title: "Эндодонтия и протокол корневых каналов",
			criteria: {
				tokens: [
					"endo",
					"endodontics",
					"root-canals",
					"root_canals",
					"endo-studio",
				],
				searchIncludes: [
					"endo=1",
					"endodontics=1",
					"root_canals=1",
					"standalone=endo",
				],
				exactHashes: ["#endo", "#endodontics", "#root-canals", "#endo-studio"],
				hashPrefixes: [
					"#endo?",
					"#endo/",
					"#endodontics?",
					"#root-canals?",
				],
			},
			render: () => <DirectEndodonticsLauncher />,
		},

		// 9. Ортопедия, коронки и мостовидные протезы
		{
			id: "orthopedics-studio",
			title: "Ортопедическая студия и коронки",
			criteria: {
				tokens: ["orthopedics", "crowns", "ortho-studio", "crowns-studio"],
				searchIncludes: [
					"ortho=1",
					"orthopedics=1",
					"crowns=1",
					"standalone=orthopedics",
				],
				exactHashes: [
					"#orthopedics",
					"#crowns",
					"#ortho-studio",
					"#crowns-studio",
				],
				hashPrefixes: [
					"#orthopedics?",
					"#orthopedics/",
					"#crowns?",
					"#ortho-studio?",
				],
			},
			render: () => <DirectOrthopedicsLauncher />,
		},

		// 10. Ортодонтия и протокол активации аппаратуры
		{
			id: "orthodontics-studio",
			title: "Ортодонтия и протокол активации",
			criteria: {
				tokens: [
					"orthodontics",
					"ortho",
					"ortho-protocol",
					"ortho_protocol",
					"ortho-studio",
				],
			},
			render: () => <DirectOrthodonticsLauncher />,
		},

		// 11. Хирургия у кресла и дентальная имплантация
		{
			id: "surgery-studio",
			title: "Хирургия и дентальная имплантация",
			criteria: {
				tokens: ["surgery", "extraction", "implant", "surgery-studio"],
				searchIncludes: [
					"surgery=1",
					"extraction=1",
					"implant=1",
					"standalone=surgery",
				],
				exactHashes: ["#surgery", "#extraction", "#implant", "#surgery-studio"],
				hashPrefixes: ["#surgery?", "#extraction?", "#implant?"],
			},
			render: () => <DirectSurgeryLauncher />,
		},

		// 12. Профессиональная гигиена и пародонтологический статус
		{
			id: "hygiene-studio",
			title: "Профессиональная гигиена полости рта",
			criteria: {
				tokens: ["hygiene", "cleaning", "prophy", "hygiene-studio"],
				searchIncludes: ["hygiene=1", "cleaning=1", "standalone=hygiene"],
				exactHashes: ["#hygiene", "#cleaning", "#prophy", "#hygiene-studio"],
				hashPrefixes: ["#hygiene?", "#hygiene/", "#cleaning?", "#prophy?"],
			},
			render: () => <DirectHygieneLauncher />,
		},

		// 13. Информированные согласия и медицинские договоры
		{
			id: "consents-studio",
			title: "Информированные согласия и договоры",
			criteria: {
				tokens: ["consents", "consent", "documents", "consent-studio"],
				searchIncludes: ["consents=1", "consent=1", "standalone=consents"],
				exactHashes: ["#consents", "#consent", "#documents", "#consent-studio"],
				hashPrefixes: ["#consents?", "#consent?", "#documents?"],
			},
			render: () => <DirectConsentLauncher />,
		},
	];

export function renderClinicalLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	// 1. Поиск совпадений в каноническом реестре клинических лончеров
	const matchedLauncher = evaluateLaunchersRegistry(
		CLINICAL_LAUNCHERS_REGISTRY,
		props,
	);
	if (matchedLauncher) {
		return matchedLauncher;
	}

	// 2. Специализированные клинические лончеры (3D КЛКТ, ТРГ, цефалометрия, ОПТГ)
	const specializedLauncher = renderSpecializedClinicalLaunchers(props);
	if (specializedLauncher) {
		return specializedLauncher;
	}

	return null;
}
