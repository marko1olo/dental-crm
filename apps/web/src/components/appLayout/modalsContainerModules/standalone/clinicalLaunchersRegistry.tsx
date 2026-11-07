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
import { DirectOdontogramModuleLauncher } from "../../../odontogram/DirectOdontogramModuleLauncher";
import { Tooth46InspectionStand } from "../../../odontogram/gate0/Tooth46InspectionStand";
import { DirectVisiographLauncher } from "../../../visiograph/DirectVisiographLauncher";
import { DirectRvgCaptureModal } from "../../../radiology/DirectRvgCaptureModal";
import { DirectEndodonticsLauncher } from "../../../endo/DirectEndodonticsLauncher";
import { DirectOrthopedicsLauncher } from "../../../orthopedics/DirectOrthopedicsLauncher";
import { DirectOrthodonticsLauncher } from "../../../orthodontics/DirectOrthodonticsLauncher";
import { DirectSurgeryLauncher } from "../../../surgery/DirectSurgeryLauncher";
import { DirectHygieneLauncher } from "../../../hygiene/DirectHygieneLauncher";
import { DirectConsentLauncher } from "../../../consents/DirectConsentLauncher";
import { ChairsideCopilotHUD } from "../../../copilot/ChairsideCopilotHUD";
import { DemoCaseViewerModal } from "../../../demo/DemoCaseViewerModal";
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

		// 5. Анатомическая одонтограмма Wheeler 2.5D и зубная формула FDI 11–48 / 51–85
		{
			id: "odontogram-studio",
			title: "Анатомическая зубная формула Wheeler 2.5D",
			criteria: {
				tokens: [
					"odontogram",
					"dental-chart",
					"dental_chart",
					"odontogram-studio",
					"odontogram-gate0",
					"odontogram-32",
					"odontogram-mandible",
				],
			},
			render: () => <DirectOdontogramLauncher />,
		},

		// 5b. Живой интерактивный модуль зубной формулы OdontogramModule (SSOT)
		{
			id: "odontogram-module",
			title: "Интерактивный модуль зубной формулы (OdontogramModule)",
			criteria: {
				tokens: ["odontogram-module", "stand=module", "stand=odontogram"],
				searchIncludes: ["stand=module", "stand=odontogram", "odontogram-module=1"],
				hashIncludes: ["#odontogram-module", "#stand-module"],
			},
			render: () => <DirectOdontogramModuleLauncher />,
		},

		// 7. Аппаратный захват визиографа Direct RVG (Мандат 8e & [RAD-03])
		{
			id: "direct-rvg-capture",
			title: "Аппаратный захват визиографа Direct RVG",
			criteria: {
				tokens: ["direct-rvg", "rvg-capture", "rvg-hardware"],
				exactHashes: ["#rvg-capture", "#direct-rvg", "#rvg-hardware"],
				searchIncludes: ["rvg-capture=1", "standalone=rvg-capture", "direct-rvg=1"],
			},
			render: () => (
				<DirectRvgCaptureModal
					isOpen={true}
					onClose={() => clearUrlTokens(["direct-rvg", "rvg-capture", "rvg-hardware"])}
					patientName="Захаров Иван Дмитриевич"
					patientCardNumber="ЭМК №2026/891"
					doctorName="Д-р Захаров А. В."
					initialToothFdi="16"
				/>
			),
		},

		// 7b. Радиовизиограф и снимки RVG (Студия)
		{
			id: "visiograph-rvg",
			title: "Радиовизиограф и снимки RVG",
			criteria: {
				tokens: ["visiograph", "rvg", "rvg-studio"],
				exclude: ["rvg-capture", "direct-rvg", "rvg-hardware"],
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
				tokens: ["orthopedics", "crowns", "prosthetics", "crowns-studio"],
				searchIncludes: [
					"orthopedics=1",
					"crowns=1",
					"prosthetics=1",
					"standalone=orthopedics",
				],
				exactHashes: [
					"#orthopedics",
					"#crowns",
					"#prosthetics",
					"#crowns-studio",
				],
				hashPrefixes: [
					"#orthopedics?",
					"#orthopedics/",
					"#crowns?",
					"#prosthetics?",
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
					"aligners",
					"braces",
				],
				searchIncludes: [
					"ortho=1",
					"orthodontics=1",
					"aligners=1",
					"standalone=orthodontics",
				],
				exactHashes: [
					"#ortho",
					"#orthodontics",
					"#ortho-protocol",
					"#ortho_protocol",
					"#ortho-studio",
					"#aligners",
				],
				hashPrefixes: [
					"#ortho?",
					"#orthodontics?",
					"#ortho-protocol?",
					"#ortho-studio?",
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

		// 13. Информированные согласия и медицинские договоры (SSOT)
		{
			id: "consents-studio",
			title: "Информированные согласия и договоры",
			criteria: {
				tokens: ["consents", "consent", "consent-studio", "consents-studio"],
				searchIncludes: ["consents=1", "consent=1", "standalone=consents"],
				exactHashes: ["#consents", "#consent", "#consent-studio", "#consents-studio"],
				hashPrefixes: ["#consents?", "#consent?", "#consent-studio?"],
			},
			render: () => <DirectConsentLauncher />,
		},

		// 14. Кресельный ИИ-Копилот HUD (DEF-COPILOT-01 & Mandate 8aq)
		{
			id: "chairside-hud",
			title: "Кресельный ИИ-Копилот HUD",
			criteria: {
				tokens: ["chairside-hud", "hud"],
				searchIncludes: ["hud=open", "chairside-hud=1"],
				exactHashes: ["#chairside-hud", "#hud"],
			},
			render: () => (
				<ChairsideCopilotHUD
					initialOpen={true}
					patientName="Иванов И.И."
					activeTooth={16}
				/>
			),
		},

		// 15. Клиническая демонстрационная витрина кейсов (Мандаты 8aq & 8wy)
		{
			id: "demo-cases-showcase",
			title: "Клинические кейсы и демонстрационная витрина",
			criteria: {
				tokens: ["demo-case", "demo-cases", "case-viewer", "clinical-cases"],
				searchIncludes: ["demo_case=1", "demo-case=1", "case=demo"],
				exactHashes: ["#demo-case", "#demo-cases", "#case-viewer", "#clinical-cases"],
				hashPrefixes: ["#demo-case?", "#demo-cases?", "#case-viewer?"],
			},
			render: () => (
				<div style={{ minHeight: "100vh", background: "var(--paper-subtle, #0f172a)", padding: "16px" }}>
					<DemoCaseViewerModal
						isOpen={true}
						activeRoleKey="surgeon"
						onClose={() => clearUrlTokens(["demo-case", "demo-cases", "case-viewer", "clinical-cases"])}
					/>
				</div>
			),
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
