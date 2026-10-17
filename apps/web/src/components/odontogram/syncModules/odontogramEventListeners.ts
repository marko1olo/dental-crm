/**
 * apps/web/src/components/odontogram/syncModules/odontogramEventListeners.ts
 *
 * DENTE Dental CRM — Odontogram External Event Listeners & Hardware Bridges.
 * Handles:
 * 1. 3D implant placement collisions (clinical-implant-placed)
 * 2. Cross-tab/WebSocket formula updates (dente-odontogram-update)
 * 3. AI Visiograph findings (clinical-finding-detected)
 * 4. Keyboard Shift multi-select modifier
 */

import { isValidFdiToothNumber } from "@dental/shared";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { TOOTH_STATE_LABELS, type ToothData, type ToothState } from "../ToothChart";

export interface AttachOdontogramEventListenersOptions {
	patientId: string;
	onUpdateToothState: (teeth: number[], state: ToothState) => Promise<void>;
	onSetTeethData: React.Dispatch<React.SetStateAction<ToothData[]>>;
	onSetAiPendingProposal?: React.Dispatch<
		React.SetStateAction<{
			source: "voice" | "vision" | "sensor";
			title: string;
			findings: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }>;
		} | null>
	> | undefined;
	onSetIsMultiSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function attachOdontogramEventListeners({
	patientId,
	onUpdateToothState,
	onSetTeethData,
	onSetAiPendingProposal,
	onSetIsMultiSelectMode,
}: AttachOdontogramEventListenersOptions): () => void {
	const handleClinicalCollision = (e: Event) => {
		const detail = (e as CustomEvent).detail as { toothNumber?: unknown } | undefined;
		const toothNumber = Number(detail?.toothNumber);
		if (!isValidFdiToothNumber(toothNumber)) {
			logger.error("[имплантат из 3D] номер зуба не читается", detail?.toothNumber);
			return;
		}
		showToast(
			`В карту записано: зуб ${toothNumber} — ${TOOTH_STATE_LABELS.Planned_Implant}. Запись пришла из трёхмерного просмотра. Если имплантат планируется не на этот зуб, исправьте отметку на схеме.`,
			"info",
			15000,
		);
		void onUpdateToothState([toothNumber], "Planned_Implant");
	};

	const handleWsUpdate = (e: Event) => {
		const detail = (e as CustomEvent).detail as { patientId?: unknown; states?: unknown } | undefined;
		if ((detail?.patientId && patientId && detail.patientId !== patientId) || !Array.isArray(detail?.states)) return;
		const incoming = detail.states as ToothData[];
		if (incoming.length === 0) return;
		onSetTeethData((prev) => {
			const merged = [...prev];
			for (const tooth of incoming) {
				const idx = merged.findIndex((x) => x.toothNumber === tooth.toothNumber);
				if (idx > -1) merged[idx] = tooth;
				else merged.push(tooth);
			}
			return merged;
		});
	};

	const handleFinding = (e: Event) => {
		const detail = (e as CustomEvent).detail as { toothNumber?: unknown; finding?: unknown } | undefined;
		const toothNumber = Number(detail?.toothNumber);
		const finding = detail?.finding;
		if (!isValidFdiToothNumber(toothNumber)) {
			logger.error("[находка со снимка] номер зуба не читается", detail?.toothNumber);
			return;
		}
		if (typeof finding !== "string" || !Object.hasOwn(TOOTH_STATE_LABELS, finding)) {
			logger.error("[находка со снимка] состояние не из списка схемы", finding);
			showToast(
				`Находка по зубу ${toothNumber} в карту не записана: состояние со снимка программе не знакомо. Отметьте зуб на схеме сами.`,
				"warning",
				15000,
			);
			return;
		}
		const state = finding as ToothState;
		onSetAiPendingProposal?.({
			source: "vision",
			title: "Снимок / Визиограф (ИИ-распознавание)",
			findings: [{ toothNumber, state }],
		});
		showToast(
			`ИИ обнаружил находку на снимке: зуб ${toothNumber} (${TOOTH_STATE_LABELS[state] || state}). Подтвердите внесение в формулу.`,
			"info",
			10000,
		);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Shift") onSetIsMultiSelectMode(true);
	};
	const handleKeyUp = (e: KeyboardEvent) => {
		if (e.key === "Shift") onSetIsMultiSelectMode(false);
	};

	window.addEventListener("clinical-implant-placed", handleClinicalCollision);
	window.addEventListener("dente-odontogram-update", handleWsUpdate);
	window.addEventListener("clinical-finding-detected", handleFinding);
	window.addEventListener("keydown", handleKeyDown);
	window.addEventListener("keyup", handleKeyUp);

	return () => {
		window.removeEventListener("clinical-implant-placed", handleClinicalCollision);
		window.removeEventListener("dente-odontogram-update", handleWsUpdate);
		window.removeEventListener("clinical-finding-detected", handleFinding);
		window.removeEventListener("keydown", handleKeyDown);
		window.removeEventListener("keyup", handleKeyUp);
	};
}
