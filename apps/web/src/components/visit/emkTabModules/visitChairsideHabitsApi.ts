/**
 * visitChairsideHabitsApi.ts — API-клиент сценариев кресла:
 * 1) Ближайшие свободные окна врача (GET /api/appointments/next-free-slots -> POST /api/appointments)
 * 2) Краткая сводка последних визитов пациента (GET /api/patients/:patientId/visits/recent-summary)
 */

import React from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { denteQueryClient } from "../../../lib/queryClient";
import { clientLogger } from "../../../services/logging/clientLogger";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { appendClinicalText } from "../emk";

export interface NextFreeSlotCandidate {
	readonly offsetDays: number;
	readonly targetDate: string;
	readonly actualDate: string;
	readonly startsAt: string;
	readonly endsAt: string;
	readonly localTime: string;
	readonly durationMinutes: number;
	readonly chairId: string | null;
	readonly chairName: string | null;
	readonly doctorId: string;
	readonly doctorName: string;
}

export interface RecentVisitServiceSummary {
	readonly id: string;
	readonly title: string;
	readonly toothCode: string | null;
	readonly serviceCode: string | null;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalPriceKopecks: number;
}

export interface RecentVisitSummaryItem {
	readonly id: string;
	readonly appointmentId: string | null;
	readonly status: string;
	readonly visitDate: string;
	readonly signedAt: string | null;
	readonly diagnosis: string | null;
	readonly complaint: string | null;
	readonly objectiveStatus: string | null;
	readonly treatmentPlan: string | null;
	readonly recommendations: string | null;
	readonly services: readonly RecentVisitServiceSummary[];
}

export function formatSlotChipLabel(slot: NextFreeSlotCandidate): string {
	const offsetLabel = slot.offsetDays >= 180
		? "Через 6 мес"
		: `Через ${slot.offsetDays} дн`;
	const dateObj = new Date(slot.startsAt);
	const shortDate = Number.isNaN(dateObj.getTime())
		? slot.actualDate
		: dateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
	return `${offsetLabel} · ${shortDate} ${slot.localTime}`;
}

export async function fetchNextFreeSlots(
	doctorId?: string | null,
	durationMinutes = 30,
	signal?: AbortSignal,
): Promise<NextFreeSlotCandidate[]> {
	if (typeof fetch !== "function") return [];
	const params = new URLSearchParams({
		offsetsDays: "5,7,14,180",
		durationMinutes: String(durationMinutes),
	});
	if (doctorId && doctorId.trim()) {
		params.set("doctorId", doctorId.trim());
	}
	const res = await fetch(`/api/appointments/next-free-slots?${params.toString()}`, {
		headers: denteClinicalReadHeaders(),
		...(signal ? { signal } : {}),
	});
	if (!res.ok) {
		throw new Error(`Не удалось загрузить свободные окна врача (${res.status})`);
	}
	const raw = (await res.json()) as {
		data?: NextFreeSlotCandidate[];
		slots?: NextFreeSlotCandidate[];
	};
	const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.slots) ? raw.slots : [];
	return list;
}

export async function bookFollowupSlot(params: {
	patientId: string;
	slot: NextFreeSlotCandidate;
	sourceVisitId?: string | null;
	reason?: string;
}): Promise<{ appointmentId?: string | undefined }> {
	if (typeof fetch !== "function") {
		throw new Error("Сетевой клиент недоступен");
	}
	const idempotencyKey = generateUuidV7();
	const body: Record<string, unknown> = {
		patientId: params.patientId,
		doctorUserId: params.slot.doctorId,
		status: "planned",
		startsAt: params.slot.startsAt,
		endsAt: params.slot.endsAt,
		reason: params.reason ?? "Повторный приём",
	};
	if (params.slot.chairId) {
		body.chairId = params.slot.chairId;
	}
	if (params.sourceVisitId) {
		body.rebookingSourceVisitId = params.sourceVisitId;
	}
	const res = await fetch("/api/appointments", {
		method: "POST",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": idempotencyKey,
		}),
		body: JSON.stringify(body),
	});
	let raw: {
		id?: string;
		data?: { id?: string };
		appointment?: { id?: string };
		message?: string;
		error?: string;
	} | null = null;
	try {
		raw = (await res.json()) as typeof raw;
	} catch (parseErr) {
		clientLogger.warn("[visitChairsideHabitsApi] Failed to parse appointment response JSON:", parseErr);
	}
	if (!res.ok) {
		const msg = raw?.message || raw?.error || `Ошибка записи на повторный визит (${res.status})`;
		throw new Error(msg);
	}
	const createdId = raw?.data?.id ?? raw?.appointment?.id ?? raw?.id;
	return { ...(createdId ? { appointmentId: createdId } : {}) };
}

export async function fetchRecentVisitSummaries(
	patientId: string,
	signal?: AbortSignal,
): Promise<RecentVisitSummaryItem[]> {
	if (typeof fetch !== "function" || !patientId.trim()) return [];
	const res = await fetch(
		`/api/patients/${encodeURIComponent(patientId.trim())}/visits/recent-summary`,
		{
			headers: denteClinicalReadHeaders(),
			...(signal ? { signal } : {}),
		},
	);
	if (!res.ok) {
		throw new Error(`Ошибка загрузки прошлых визитов (${res.status})`);
	}
	const raw = (await res.json()) as {
		data?: RecentVisitSummaryItem[];
		visits?: RecentVisitSummaryItem[];
	};
	return Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.visits) ? raw.visits : [];
}

export interface UseVisitChairsideHabitsParams {
	readonly patientId: string | null | undefined;
	readonly doctorId: string | null | undefined;
	readonly visitId: string | null | undefined;
	readonly isSignedVisit: boolean;
	readonly isRevisingVisitNote: boolean;
	readonly setIsRevisingVisitNote: (val: boolean) => void;
	readonly recommendationsValue: string;
	readonly updateVisitNoteField: (field: string, value: unknown) => void;
	readonly triggerDebouncedAutosave: () => void;
	readonly hasCompletionResult: boolean;
}

export function useVisitChairsideHabits({
	patientId,
	doctorId,
	visitId,
	isSignedVisit,
	isRevisingVisitNote,
	setIsRevisingVisitNote,
	recommendationsValue,
	updateVisitNoteField,
	triggerDebouncedAutosave,
	hasCompletionResult,
}: UseVisitChairsideHabitsParams) {
	const [nextFreeSlots, setNextFreeSlots] = React.useState<NextFreeSlotCandidate[]>([]);
	const [isLoadingSlots, setIsLoadingSlots] = React.useState<boolean>(false);
	const [bookingSlotKey, setBookingSlotKey] = React.useState<string | null>(null);
	const [recentVisits, setRecentVisits] = React.useState<RecentVisitSummaryItem[]>([]);

	React.useEffect(() => {
		if (!patientId) {
			setRecentVisits([]);
			return;
		}
		const controller = new AbortController();
		void fetchRecentVisitSummaries(patientId, controller.signal)
			.then((items) => {
				if (!controller.signal.aborted) {
					setRecentVisits(items);
				}
			})
			.catch((err) => {
				if (!controller.signal.aborted) {
					clientLogger.warn("[VisitEmkTab] Не удалось загрузить прошлые визиты пациента", err, {
						module: "useVisitChairsideHabits",
					});
					setRecentVisits([]);
				}
			});
		return () => controller.abort();
	}, [patientId]);

	const loadNextFreeSlots = React.useCallback(async () => {
		setIsLoadingSlots(true);
		try {
			const loaded = await fetchNextFreeSlots(doctorId, 30);
			setNextFreeSlots(loaded);
		} catch (err) {
			clientLogger.warn("[VisitEmkTab] Не удалось загрузить ближайшие окна врача", err, {
				module: "useVisitChairsideHabits",
			});
			setNextFreeSlots([]);
		} finally {
			setIsLoadingSlots(false);
		}
	}, [doctorId]);

	React.useEffect(() => {
		if (hasCompletionResult && nextFreeSlots.length === 0) {
			void loadNextFreeSlots();
		}
	}, [hasCompletionResult, loadNextFreeSlots, nextFreeSlots.length]);

	const handleBookFollowupSlot = React.useCallback(
		async (slot: NextFreeSlotCandidate) => {
			if (!patientId) {
				showToast("Выберите пациента для записи на повторный визит", "error", 3500);
				return;
			}
			const slotKey = `${slot.offsetDays}-${slot.startsAt}`;
			setBookingSlotKey(slotKey);
			try {
				await bookFollowupSlot({
					patientId,
					slot,
					sourceVisitId: visitId ?? null,
				});
				const chairSuffix = slot.chairName ? `, ${slot.chairName}` : "";
				const scheduleLine = `Повторный приём: ${formatSlotChipLabel(slot)}${chairSuffix} (${slot.doctorName})`;
				updateVisitNoteField(
					"recommendations",
					appendClinicalText(recommendationsValue, scheduleLine, "\n"),
				);
				triggerDebouncedAutosave();
				void denteQueryClient.invalidateQueries({ queryKey: ["appointments"] });
				void denteQueryClient.invalidateQueries({ queryKey: ["dashboard"] });
				showToast(
					`Повторный визит записан: ${formatSlotChipLabel(slot)}`,
					"success",
					5000,
					{
						label: "Открыть расписание",
						onAction: () => {
							useAppStore.getState().setCurrentView("schedule");
						},
					},
				);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Не удалось записать на повторный визит";
				showToast(message, "error", 4500);
			} finally {
				setBookingSlotKey(null);
			}
		},
		[patientId, visitId, recommendationsValue, triggerDebouncedAutosave, updateVisitNoteField],
	);

	const handleCopyRecentVisit = React.useCallback(
		(visit: RecentVisitSummaryItem) => {
			if (isSignedVisit && !isRevisingVisitNote) {
				setIsRevisingVisitNote(true);
			}
			if (visit.complaint) updateVisitNoteField("complaint", visit.complaint);
			if (visit.diagnosis) updateVisitNoteField("diagnosis", visit.diagnosis);
			if (visit.objectiveStatus) updateVisitNoteField("objectiveStatus", visit.objectiveStatus);
			if (visit.treatmentPlan) updateVisitNoteField("treatmentPlan", visit.treatmentPlan);
			if (visit.recommendations) updateVisitNoteField("recommendations", visit.recommendations);
			if (visit.services.length > 0 && typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services: visit.services.map((srv) => ({
								id: srv.id,
								code: srv.serviceCode ?? undefined,
								title: srv.title,
								toothCode: srv.toothCode ?? undefined,
								quantity: srv.quantity,
								priceKopecks: srv.unitPriceKopecks,
							})),
						},
					}),
				);
			}
			triggerDebouncedAutosave();
			showToast("Данные прошлого визита перенесены в текущий приём", "success", 3000);
		},
		[isRevisingVisitNote, isSignedVisit, setIsRevisingVisitNote, triggerDebouncedAutosave, updateVisitNoteField],
	);

	return {
		nextFreeSlots,
		isLoadingSlots,
		bookingSlotKey,
		loadNextFreeSlots,
		handleBookFollowupSlot,
		recentVisits,
		handleCopyRecentVisit,
	};
}
