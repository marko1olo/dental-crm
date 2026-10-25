import { CLINICAL_ACTIONS } from "../orthoProtocolTypes";
import { buildOcclusionStatusText } from "./objectiveStatusBuilders";
import { buildApplianceLabels } from "./applianceStatusBuilders";
import { buildRecommendationsText } from "./recommendationsBuilder";
import type { SynthesizeProtocolParams } from "./types";

export type { SynthesizeProtocolParams };

function getSystemDescription(bracketSystem: string, systemLabel: string, bracketSlot: string): string {
	switch (bracketSystem) {
		case "aligners":
			return "Ортодонтические элайнеры (каппы с аттачментами)";
		case "removable_plate":
			return "Съемный пластиночный аппарат с расширяющим винтом";
		case "marco_rosa":
			return "Несъемный аппарат Марко Роса с нёбным винтом";
		case "haas_rpe":
			return "Несъемный аппарат Хааса (RPE) с акриловым базисом и винтом";
		case "pendulum":
			return "Несъемный аппарат Pendulum для дистализации моляров";
		case "twin_block":
			return "Функциональный двухчелюстной аппарат Твин-блок (Twin Block)";
		default:
			return `${systemLabel || "Брекет-система"} (паз ${bracketSlot}")`;
	}
}

export function synthesizeOrthodonticProtocolText(params: SynthesizeProtocolParams): string {
	const dateStr = new Date().toLocaleDateString("ru-RU");
	const occlusionText = buildOcclusionStatusText(params);
	const app = buildApplianceLabels(params);
	const recommendations = buildRecommendationsText(params);

	const teethListStr = params.selectedTeeth.length > 0
		? params.selectedTeeth.join(", ")
		: "аппаратура не активирована";

	const actionsListStr = params.selectedActions
		.map((aId) => CLINICAL_ACTIONS.find((a) => a.id === aId)?.label)
		.filter(Boolean)
		.join("; ");

	const systemDescription = getSystemDescription(
		params.bracketSystem,
		app.systemObj?.label || "",
		params.bracketSlot,
	);

	const separationText = params.selectedActions.includes("separation")
		? "\n• Сепарационные эластики: установлены эластические сепараторы в межзубные промежутки."
		: "";

	return `ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА
Дата приёма: ${dateStr}
Пациент: ${params.patientName}

1. ЖАЛОБЫ:
${params.notes || "Плановый визит по графику ортодонтического лечения. Жалоб на острую боль и отклейку аппаратуры нет."}

2. ОБЪЕКТИВНЫЙ СТАТУС:
${occlusionText}• Аппаратура: ${systemDescription}.
• Зона фиксации/активации (зубы): ${teethListStr}.
${app.attachmentText}${app.alignerTrackerText}${app.alignerSetText}${app.archwireText}${separationText}
${app.torqueAngulationText}• Фиксация аппаратуры стабильна, окклюзионных контактов с замками/каппами не выявлено.
• Фотопротокол: ${params.isPhotoProtocolCompleted ? "выполнен (8 ракурсов ABO: анфас, профиль, улыбка, окклюзия)" : "не проводился на текущем визите"}.

3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ:
• Выполненные манипуляции: ${actionsListStr || (params.activeAttachmentPreset ? app.currentAttachmentObj?.shortLabel : "Активация аппаратуры")}.${app.powerChainText}
${app.currentAttachmentObj ? `• ${app.currentAttachmentObj.description}\n` : ""}${params.alignerSetIssued ? `• Сдан сет элайнеров на ${params.alignerSetIssued.days} дн. (смена капп каждые ${Math.round(params.alignerSetIssued.days / params.alignerSetIssued.count)} дней).\n` : ""}• ${app.elasticsText}
• Антисептическая обработка полости рта (0.05% раствор хлоргексидина).
• Коррекция элементов аппаратуры выполнена в полном объеме.

4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:
${recommendations}`;
}
