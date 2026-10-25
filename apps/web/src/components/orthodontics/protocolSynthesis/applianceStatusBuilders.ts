import {
	ARCHWIRE_MATERIALS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	TORQUE_PRESETS,
	ANGULATION_PRESETS,
} from "../OrthoArchwireSelector";
import {
	BRACKET_SYSTEMS,
	ALIGNER_ATTACHMENT_PRESETS,
} from "../OrthoBracketProtocolSection";
import type { SynthesizeProtocolParams } from "./types";

export function buildApplianceLabels(params: SynthesizeProtocolParams) {
	const systemObj = BRACKET_SYSTEMS.find((b) => b.id === params.bracketSystem);
	const materialObj = ARCHWIRE_MATERIALS.find((m) => m.id === params.archwireMaterial);
	const elasticObj = ELASTIC_SCHEMES.find((e) => e.id === params.elasticScheme);
	const elasticSizeObj = ELASTIC_SIZES.find((s) => s.id === params.elasticSize);

	const archLabel =
		params.targetArch === "upper"
			? "Верхняя челюсть (ВЧ)"
			: params.targetArch === "lower"
				? "Нижняя челюсть (НЧ)"
				: "Верхняя и нижняя челюсти (ВЧ + НЧ)";

	let elasticsText = "Межчелюстная тяга не назначена.";
	if (params.elasticScheme !== "none") {
		elasticsText = `Межчелюстные эластики: ${elasticObj?.label || ""} (${elasticSizeObj?.label || ""}, ${elasticSizeObj?.strength || ""}). Режим ношения: ${params.elasticWear}.`;
	}

	let powerChainText = "";
	if (params.selectedActions.includes("power_chain")) {
		powerChainText = `\nУстановлена эластическая цепочка Power Chain (${params.powerChainType === "short" ? "короткий шаг" : params.powerChainType === "long" ? "длинный шаг" : "сплошная"}) в сегменте ${params.powerChainSpan}.`;
	}

	const currentAttachmentObj = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === params.activeAttachmentPreset);
	const attachmentText = currentAttachmentObj ? `• Аттачменты элайнеров: ${currentAttachmentObj.description}\n` : "";

	let alignerSetText = "";
	if (params.alignerSetIssued) {
		alignerSetText = `• Выдача элайнеров: выдан следующий сет капп (+${params.alignerSetIssued.days} дн., ${params.alignerSetIssued.count} каппы). Режим ношения: 22 ч/сутки.\n`;
	}

	let plateText = "";
	if (params.bracketSystem === "removable_plate") {
		plateText = `• Состояние аппарата: съемная пластинка с расширяющим винтом на ${archLabel}. Фиксация стабильна. Раскрутка винта: ${params.plateActivationTurns}/4 оборота (${(params.plateActivationTurns * 0.25).toFixed(2)} мм).`;
	}

	let archwireText = `• Текущая дуга: ${archLabel} — ${materialObj?.badge || ""} сечением ${params.archwireSection}".`;
	if (params.bracketSystem === "aligners" || params.activeAttachmentPreset) {
		archwireText = "• Состояние аппаратуры: прозрачные каппы (элайнеры), фиксация на аттачментах плотная, окклюзионных помех нет.";
	} else if (params.bracketSystem === "removable_plate") {
		archwireText = plateText;
	} else if (params.selectedActions.includes("debonding")) {
		archwireText = "• Состояние аппаратуры: брекет-система снята. Зафиксирован несъемный проволочный ретейнер в сегментах 13-23 и 33-43.";
	} else if (params.activePreset === "wire_change" || params.notes.includes("верхняя челюсть .016\", нижняя челюсть .014\"")) {
		archwireText = "• Установленные дуги: ВЧ — NiTi .016\", НЧ — NiTi .014\" (круглые нивелирующие, норма).";
	} else if (params.activePreset === "activation") {
		archwireText = `• Текущие дуги: ${archLabel} — ${materialObj?.badge || ""} сечением ${params.archwireSection}" (дуги сохранены без деформаций, активация замков).`;
	}

	let torqueAngulationText = "";
	const torqueObj = TORQUE_PRESETS.find((t) => t.id === params.torquePreset);
	const angulationObj = ANGULATION_PRESETS.find((a) => a.id === params.angulationPreset);
	if (torqueObj) {
		torqueAngulationText = `• Торк и ангуляция: пропись ${torqueObj.label}, ангуляция резцов/клыков: ${angulationObj?.label || "норма"}. Контроль наклона и инклинации выполнен.\n`;
	}

	let alignerTrackerText = "";
	if (params.bracketSystem === "aligners" || params.activeAttachmentPreset) {
		alignerTrackerText = params.isSplitArchAligners
			? `• Трекер элайнеров: ВЧ Каппа №${params.alignerStepUpper} из ${params.alignerTotalUpper} (${params.alignerTotalUpper > 0 ? Math.round((params.alignerStepUpper / params.alignerTotalUpper) * 100) : 0}%), НЧ Каппа №${params.alignerStepLower} из ${params.alignerTotalLower} (${params.alignerTotalLower > 0 ? Math.round((params.alignerStepLower / params.alignerTotalLower) * 100) : 0}%). Режим ношения: 22 ч/сутки. Следующая смена: ${params.nextAlignerDateStr} (каждые ${params.alignerDaysPerStep} дн.).\n`
			: `• Трекер элайнеров: Каппа №${params.alignerStep} из ${params.alignerTotal} (${params.alignerProgressPercent}% курса завершено). Режим ношения: 22 ч/сутки. Следующая смена: ${params.nextAlignerDateStr} (каждые ${params.alignerDaysPerStep} дн.).\n`;
	}

	return {
		systemObj,
		archLabel,
		elasticsText,
		powerChainText,
		currentAttachmentObj,
		attachmentText,
		alignerSetText,
		archwireText,
		torqueAngulationText,
		alignerTrackerText,
	};
}
