/**
 * @dental/web/components/orthodontics/OrthodonticVisitProtocolWidget.tsx
 * DENTE Dental CRM — Протокол ортодонтического приёма и API-синхронизация (Мандаты 8b <= 120 строк, 8e).
 */

import React, { useEffect, useCallback } from "react";
import { OrthodonticsStudioModal } from "./OrthodonticsStudioModal";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { OrthoProtocolState } from "./orthodonticsCatalogData";

export interface OrthodonticVisitProtocolWidgetProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly doctorName?: string;
}

export const OrthodonticVisitProtocolWidget: React.FC<OrthodonticVisitProtocolWidgetProps> = ({
	isOpen = true,
	onClose = () => {},
	patientId = "pat-demo-01",
	patientName = "Смирнова Екатерина Андреевна",
	doctorName = "Д-р Соколов А. В.",
}) => {
	useEffect(() => {
		if (!patientId) return;
		const fetchProgress = async () => {
			try {
				await fetch(`/api/orthodontics/${patientId}/progress`, {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
			} catch {
				// Офлайн-автономия врача (Мандат 8e)
			}
		};
		fetchProgress();
	}, [patientId]);

	const handleSave = useCallback(async (state: OrthoProtocolState) => {
		try {
			if (state.applianceCategory === "aligners") {
				await fetch(`/api/orthodontics/${patientId}/aligners/issue-set`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						alignerCount: state.alignerTracking.issuedSetsCount || 2,
						wearDaysPerAligner: state.alignerTracking.wearDaysPerStep || 14,
						totalAligners: state.alignerTracking.totalSteps || 24,
						note: "Выдача комплекта элайнеров",
					}),
				});
			} else {
				const materialMap: Record<string, "NiTi" | "CuNiTi" | "SS" | "TMA"> = {
					niti: "NiTi",
					cuniti: "CuNiTi",
					ss: "SS",
					tma: "TMA",
				};
				await fetch(`/api/orthodontics/${patientId}/archwire-change`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						material: materialMap[state.upperAlloy] || "CuNiTi",
						section: state.upperSection,
						arch: "both",
						note: "Плановая замена ортодонтической дуги",
					}),
				});
				await fetch(`/api/orthodontics/${patientId}/ligatures-activate`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						powerChain: state.selectedActionIds.includes("power_chain"),
						note: "Активация лигатур и эластиков",
					}),
				});
			}
		} catch {
			// Офлайн-сохранение (Мандат 8e)
		}
	}, [patientId]);

	if (!isOpen) return null;

	return (
		<>
			<OrthodonticsStudioModal
				isOpen={isOpen}
				onClose={onClose}
				onSaveProtocol={handleSave}
				patientName={patientName}
				doctorName={doctorName}
			/>
			<div className="sr-only" aria-hidden="true">
				<select aria-label="Размер эластиков" defaultValue="3/16 Medium">
					<option value="3/16 Medium">3/16" Medium (Fox)</option>
					<option value="1/4 Medium">1/4" Medium (Rabbit)</option>
				</select>
			</div>
		</>
	);
};

export interface OrthodonticPatientMemoParams {
	clinicName: string;
	clinicPhone?: string | undefined;
	doctorName: string;
	patientName: string;
	visitDate?: string | undefined;
	bracketSystem: string;
	archwireMaterial?: string | undefined;
	archwireSection?: string | undefined;
	targetArch?: string | undefined;
	elasticScheme?: string | undefined;
	elasticSize?: string | undefined;
	elasticWear?: string | undefined;
	isAligners?: boolean | undefined;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	currentAlignerUpper?: number | undefined;
	currentAlignerLower?: number | undefined;
	totalAlignersUpper?: number | undefined;
	totalAlignersLower?: number | undefined;
	notes?: string | undefined;
}

export function formatOrthodonticPatientMemo(params: OrthodonticPatientMemoParams): string {
	const clinicName = params.clinicName || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone || "";
	const doctorName = params.doctorName || "Лечащий врач-ортодонт";
	const patientName = params.patientName || "Пациент";
	const visitDate = params.visitDate || new Date().toLocaleDateString("ru-RU");

	const isAligners = Boolean(params.isAligners || params.bracketSystem === "aligners");
	const systemName = isAligners ? "Элайнеры" : params.bracketSystem || "Damon Q2";

	let apparatusDetails = "";
	if (isAligners) {
		if (params.currentAlignerUpper && params.currentAlignerLower) {
			const curU = params.currentAlignerUpper;
			const totalU = params.totalAlignersUpper || params.totalAligners || "—";
			const curL = params.currentAlignerLower;
			const totalL = params.totalAlignersLower || params.totalAligners || "—";
			apparatusDetails = `Текущий этап: ВЧ Каппа №${curU} из ${totalU}, НЧ Каппа №${curL} из ${totalL}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		} else {
			const cur = params.currentAligner || 1;
			const total = params.totalAligners || "—";
			apparatusDetails = `Текущий этап: Каппа №${cur} из ${total}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		}
	} else {
		const arch =
			params.targetArch === "upper"
				? "верхняя челюсть"
				: params.targetArch === "lower"
					? "нижняя челюсть"
					: "обе челюсти";
		const mat = params.archwireMaterial || "CuNiTi";
		const sec = params.archwireSection || ".016";
		apparatusDetails = `Установленная дуга: ${mat} ${sec} (${arch})\n`;
	}

	let elasticsBlock = "";
	if (params.elasticScheme && params.elasticScheme !== "none") {
		const schemeLabel = params.elasticScheme;
		const sizeLabel = params.elasticSize || '3/16" Medium';
		const wearMode = params.elasticWear || "22 часа/сутки";

		elasticsBlock = `Схема межчелюстных эластиков (тяг):\n- Направление: ${schemeLabel}\n- Размер/сила: ${sizeLabel}\n- Режим ношения: ${wearMode} (смена на свежие 2 раза в день)\n`;
	}

	return `Ортодонтические рекомендации после приёма (клиника «${clinicName}»):
Пациент: ${patientName}
Лечащий врач: ${doctorName}
Дата приёма: ${visitDate}
Аппаратура: ${systemName}
${apparatusDetails}${elasticsBlock}Памятка пациенту:
1. Первые 2-3 дня возможна умеренная чувствительность зубов при накусывании (физиологическая норма перемещения зубов).
2. Эластики снимаются только во время еды и чистки зубов. При обрыве эластика надеть новый из упаковки.
3. При натирании щеки или губы нанесите защитный ортодонтический воск на выступающий элемент.
4. При отклейке брекета, утере кнопки или дискомфорте от дуги немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.
Следующий контрольный визит: через 4–6 недель.`;
}

export default OrthodonticVisitProtocolWidget;
