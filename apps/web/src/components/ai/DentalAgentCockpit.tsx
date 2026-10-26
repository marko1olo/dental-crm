import React, { useEffect, useCallback } from "react";
import { useAppStore } from "../../store/appStore";
import type { DentalAgentCockpitProps, ToolCallItem, AgentChatMessage } from "./cockpitLogic/agentTypes";

export type { DentalAgentCockpitProps, ToolCallItem, AgentChatMessage };

declare global {
	interface Window {
		__denteAgentCockpit?: {
			open: (context?: { patientId?: string; toothNumber?: number | string | null; prompt?: string }) => void;
			close: () => void;
			toggle: () => void;
			sendQuery: (query: string) => void;
		};
	}
}

/**
 * DentalAgentCockpit — Thin unified facade over the canonical Chairside Copilot (SSOT).
 * Eliminates dual-chat split per Mandate 8b & Mandate 8e.
 */
export const DentalAgentCockpit: React.FC<DentalAgentCockpitProps> = ({
	isOpen: propIsOpen,
	onClose: propOnClose,
	initialPatientId,
	initialToothNumber,
}) => {
	const openCanonicalCopilot = useCallback(
		(ctx?: { patientId?: string; toothNumber?: number | string | null; prompt?: string }) => {
			const targetPatientId = ctx?.patientId ?? initialPatientId;
			const targetTooth = ctx?.toothNumber ?? initialToothNumber;

			if (targetTooth !== undefined && targetTooth !== null) {
				useAppStore.getState().setActiveTooth(Number(targetTooth));
			}

			const copilot = (window as any).__denteCopilot;
			if (copilot?.open) {
				copilot.open();
				if (ctx?.prompt) {
					window.dispatchEvent(
						new CustomEvent("dente:copilot-send-prompt", { detail: { text: ctx.prompt } }),
					);
				}
			} else {
				window.dispatchEvent(
					new CustomEvent("dente:toggle-copilot", {
						detail: { patientId: targetPatientId, toothNumber: targetTooth, prompt: ctx?.prompt },
					}),
				);
			}
		},
		[initialPatientId, initialToothNumber],
	);

	const closeCanonicalCopilot = useCallback(() => {
		if (propOnClose) propOnClose();
		const copilot = (window as any).__denteCopilot;
		if (copilot?.close) {
			copilot.close();
		}
	}, [propOnClose]);

	useEffect(() => {
		(window as any).__denteAgentCockpit = {
			open: (ctx: { patientId?: string; toothNumber?: number; prompt?: string }) => openCanonicalCopilot(ctx),
			close: closeCanonicalCopilot,
			toggle: () => {
				const copilot = (window as any).__denteCopilot;
				if (copilot?.toggle) {
					copilot.toggle();
				} else {
					window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
				}
			},
			sendQuery: (query: string) => {
				openCanonicalCopilot({ prompt: query });
			},
		};

		const handleCustomOpen = (e: Event) => {
			const custom = e as CustomEvent<{ patientId?: string; toothNumber?: number | string | null; prompt?: string }>;
			openCanonicalCopilot(custom.detail);
		};

		window.addEventListener("dente:open-agent-cockpit", handleCustomOpen);
		return () => {
			window.removeEventListener("dente:open-agent-cockpit", handleCustomOpen);
		};
	}, [openCanonicalCopilot, closeCanonicalCopilot]);

	useEffect(() => {
		if (propIsOpen) {
			const payload: { patientId?: string; toothNumber?: string | number | null } = {};
			if (initialPatientId) payload.patientId = initialPatientId;
			if (initialToothNumber !== undefined) payload.toothNumber = initialToothNumber;
			openCanonicalCopilot(payload);
		}
	}, [propIsOpen, initialPatientId, initialToothNumber, openCanonicalCopilot]);

	return null;
};

export default DentalAgentCockpit;
