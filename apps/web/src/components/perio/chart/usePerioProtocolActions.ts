/**
 * usePerioProtocolActions.ts — Формирование протокола Формы 043/у, вставка в дневник визита и буфер.
 * Архитектурный слой Layer 3: Hook (Мандат 8b, <= 120 строк).
 */

import type { PerioChartSummary, PerioDynamicsSummary, PerioToothRecord } from "@dental/shared";
import { useCallback, useState } from "react";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import { generatePerioProtocolText } from "./perioPresets";

export interface UsePerioProtocolActionsOptions {
	readonly teeth: readonly PerioToothRecord[];
	readonly summary: PerioChartSummary;
	readonly doctorName?: string | undefined;
	readonly dynamics: PerioDynamicsSummary;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly handleSaveDraft: (options?: { closeAfter?: boolean; notes?: string }) => Promise<boolean>;
}

export function usePerioProtocolActions({
	teeth, summary, doctorName, dynamics, onInsertToProtocol, handleSaveDraft,
}: UsePerioProtocolActionsOptions) {
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	const generateProtocolText = useCallback((): string => {
		const customNotes = dynamics.hasComparison ? dynamics.form043DynamicsTextRu : undefined;
		return generatePerioProtocolText(teeth, summary, doctorName ?? undefined, customNotes);
	}, [teeth, summary, doctorName, dynamics]);

	const handleInsertToProtocol = useCallback(() => {
		const text = generateProtocolText();

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${text}` : text,
		}));

		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: { soap: text, mode: "smart_append" },
			}));
		}

		if (onInsertToProtocol) onInsertToProtocol(text);
		void handleSaveDraft({ closeAfter: true, notes: text });

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
		}

		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2500);
		showToast("Протокол пародонтограммы перенесён в дневник приёма и зафиксирован в ЭМК", "success", 4000);
	}, [generateProtocolText, onInsertToProtocol, handleSaveDraft]);

	const handleCopyProtocol = useCallback(() => {
		const text = generateProtocolText();
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Полный текст пародонтограммы скопирован", "success", 3000);
		}
	}, [generateProtocolText]);

	return { copyStatus, insertStatus, generateProtocolText, handleInsertToProtocol, handleCopyProtocol };
}
