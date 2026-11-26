import { useCallback, useEffect, useMemo, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";
import { showToast } from "../../GlobalToast";
import type { ScheduleTimeReservationItem } from "../ScheduleTimeReservationModal";

const RESERVATIONS_UPDATED_EVENT = "dente:schedule-reservations-updated";

export function extractReservationIdFromBlockId(blockId: string): string | null {
	if (!blockId.startsWith("res::")) return null;
	const parts = blockId.split("::");
	return parts[1] ? parts[1] : null;
}

export function mapReservationsToMaintenanceBlocks(
	reservations: readonly ScheduleTimeReservationItem[],
	chairs: readonly { id: string; name: string }[],
): ChairMaintenanceBlock[] {
	const blocks: ChairMaintenanceBlock[] = [];
	for (const item of reservations) {
		const rawChair = item.chairName.trim();
		const isAllChairs =
			rawChair === "*" ||
			rawChair.toUpperCase() === "ALL" ||
			rawChair.toLowerCase() === "все кресла";

		if (isAllChairs) {
			for (const chair of chairs) {
				blocks.push({
					id: `res::${item.id}::${chair.id}`,
					chairId: chair.id,
					startsAt: item.startTime,
					endsAt: item.endTime,
					reason: item.reservationType,
					note: item.note,
					isReservation: true,
					reservationId: item.id,
					hatchingStyle: item.hatchingStyle,
				});
			}
			continue;
		}

		const normalizedTarget = rawChair.toLowerCase();
		const matchedChair =
			chairs.find(
				(c) =>
					c.id === rawChair ||
					c.name.trim().toLowerCase() === normalizedTarget,
			) ?? chairs[0];

		if (matchedChair) {
			blocks.push({
				id: `res::${item.id}::${matchedChair.id}`,
				chairId: matchedChair.id,
				startsAt: item.startTime,
				endsAt: item.endTime,
				reason: item.reservationType,
				note: item.note,
				isReservation: true,
				reservationId: item.id,
				hatchingStyle: item.hatchingStyle,
			});
		}
	}
	return blocks;
}

export function useScheduleTimeReservations(
	dateKey: string,
	chairs: readonly { id: string; name: string }[],
) {
	const [reservations, setReservations] = useState<ScheduleTimeReservationItem[]>([]);

	const fetchReservations = useCallback(async () => {
		if (typeof window === "undefined" || typeof globalThis.fetch !== "function") return;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
		try {
			const res = await fetch(
				`/api/schedule/time-reservations?date=${encodeURIComponent(dateKey)}`,
				{ headers: getDenteAuthHeaders() },
			);
			if (!res.ok) return;
			const json = (await res.json()) as { data?: ScheduleTimeReservationItem[] };
			if (Array.isArray(json?.data)) {
				setReservations(json.data);
			}
		} catch (err) {
			void err;
		}
	}, [dateKey]);

	useEffect(() => {
		void fetchReservations();
	}, [fetchReservations]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleUpdated = () => {
			void fetchReservations();
		};
		window.addEventListener(RESERVATIONS_UPDATED_EVENT, handleUpdated);
		return () => {
			window.removeEventListener(RESERVATIONS_UPDATED_EVENT, handleUpdated);
		};
	}, [fetchReservations]);

	const deleteTimeReservation = useCallback(async (blockIdOrReservationId: string) => {
		const reservationId =
			extractReservationIdFromBlockId(blockIdOrReservationId) ?? blockIdOrReservationId;
		if (!reservationId) return;
		try {
			const res = await fetch(
				`/api/schedule/time-reservations/${encodeURIComponent(reservationId)}`,
				{
					method: "DELETE",
					headers: getDenteAuthHeaders({
						"Idempotency-Key": generateUuidV7(),
					}),
				},
			);
			if (!res.ok) {
				showToast("Не удалось снять технологический резерв", "error");
				return;
			}
			setReservations((prev) => prev.filter((item) => item.id !== reservationId));
			showToast("Технологический резерв снят", "info");
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent(RESERVATIONS_UPDATED_EVENT));
			}
		} catch (err) {
			void err;
			showToast("Ошибка сети при снятии резерва", "error");
		}
	}, []);

	const reservationBlocks = useMemo(
		() => mapReservationsToMaintenanceBlocks(reservations, chairs),
		[reservations, chairs],
	);

	return {
		reservations,
		reservationBlocks,
		deleteTimeReservation,
		refreshReservations: fetchReservations,
	};
}
