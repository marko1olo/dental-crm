import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
} from "../../../lib/safeLocalStorage";
import type {
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	WhatsAppApprovalCard,
} from "./types";
import { readEventStream } from "./copilotStreamReader";
import { createStreamEventHandler } from "./copilotStreamEventHandler";

interface UseCopilotStreamParams {
	apiBaseUrl: string;
	isOpen: boolean;
	setPhase: (phase: CopilotPhase) => void;
	setMessages: React.Dispatch<React.SetStateAction<CopilotUiMessage[]>>;
	setPending: (pending: PendingConfirmation | null) => void;
	setProactiveAlerts: React.Dispatch<
		React.SetStateAction<ProactiveAlertCardData[]>
	>;
	setWhatsappHitLCards: React.Dispatch<
		React.SetStateAction<WhatsAppApprovalCard[]>
	>;
	cacheNames: (toolName: string, result: unknown) => void;
}

const mapAssistantPhase = (p: string): CopilotPhase =>
	p === "thinking" || p === "working" || p === "writing" ? p : null;

export function useCopilotStream({
	apiBaseUrl,
	isOpen,
	setPhase,
	setMessages,
	setPending,
	setProactiveAlerts,
	setWhatsappHitLCards,
	cacheNames,
}: UseCopilotStreamParams) {
	const abortControllerRef = useRef<AbortController | null>(null);
	const streamAbortRef = useRef<AbortController | null>(null);

	const loadProactivePending = useCallback(async () => {
		try {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			const patientId = safeLocalStorageGetItem("dente_active_patient_id") || undefined;
			if (patientId) {
				const res = await fetch(`${apiBaseUrl}/api/patients/${encodeURIComponent(patientId)}`, {
					headers: { Authorization: token ? `Bearer ${token}` : "" },
				});
				if (res.ok) {
					const patient = await res.json();
					const alerts: ProactiveAlertCardData[] = [];
					if (Array.isArray(patient?.allergies) && patient.allergies.length > 0) {
						for (let i = 0; i < patient.allergies.length; i++) {
							const allergy = String(patient.allergies[i] || "").trim();
							if (allergy) {
								alerts.push({
									id: `patient-allergy-${i}-${patientId}`,
									urgency: "CRITICAL",
									title: "Аллергический статус",
									subtitle: "Электронная медицинская карта",
									description: `Аллергия на препарат: ${allergy}`,
									timestamp: new Date().toISOString(),
									category: "clinical_alert",
									actions: [],
								});
							}
						}
					}
					if (Array.isArray(patient?.somaticAlerts) && patient.somaticAlerts.length > 0) {
						for (let i = 0; i < patient.somaticAlerts.length; i++) {
							const som = patient.somaticAlerts[i];
							const desc = typeof som === "string" ? som : som?.message || som?.description || som?.label || "";
							if (desc) {
								alerts.push({
									id: `patient-somatic-${i}-${patientId}`,
									urgency: "URGENT",
									title: "Соматическое предостережение",
									subtitle: "Электронная медицинская карта",
									description: desc,
									timestamp: new Date().toISOString(),
									category: "clinical_alert",
									actions: [],
								});
							}
						}
					}
					setProactiveAlerts(alerts);
				}
			} else {
				setProactiveAlerts([]);
			}
		} catch (err: unknown) {
			console.warn("[useCopilotStream] loadProactivePending error:", err);
		}
	}, [apiBaseUrl, setProactiveAlerts]);

	const handleEvent = useMemo(
		() =>
			createStreamEventHandler({
				apiBaseUrl,
				setPhase,
				setMessages,
				setPending,
				setProactiveAlerts,
				setWhatsappHitLCards,
				cacheNames,
			}),
		[
			apiBaseUrl,
			setPhase,
			setMessages,
			setPending,
			setProactiveAlerts,
			setWhatsappHitLCards,
			cacheNames,
		],
	);

	const streamRequest = useCallback(
		async (pathStr: string, body: unknown) => {
			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			const controller = new AbortController();
			abortControllerRef.current = controller;

			try {
				const res = await fetch(`${apiBaseUrl}${pathStr}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: token ? `Bearer ${token}` : "",
					},
					body: JSON.stringify(body),
					signal: controller.signal,
				});

				if (!res.ok || !res.body) {
					handleEvent("error", {
						detail: `HTTP ${res.status}: ${res.statusText}`,
					});
					return;
				}

				await readEventStream(res.body, handleEvent, controller.signal);
			} catch (err: unknown) {
				if ((err as Error).name !== "AbortError") {
					handleEvent("error", { detail: String(err) });
				}
			} finally {
				if (abortControllerRef.current === controller) {
					abortControllerRef.current = null;
				}
			}
		},
		[apiBaseUrl, handleEvent],
	);

	// Clinical alerts sync on drawer open (Mandate 8v: quiet background sync, zero phantom stream)
	useEffect(() => {
		if (!isOpen) return;
		void loadProactivePending();
	}, [isOpen, loadProactivePending]);

	// Cleanup on unmount (Rotten Seeds invariant)
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			if (streamAbortRef.current) {
				streamAbortRef.current.abort();
			}
		};
	}, []);

	return {
		handleEvent,
		streamRequest,
		loadProactivePending,
		abortControllerRef,
		streamAbortRef,
	};
}
