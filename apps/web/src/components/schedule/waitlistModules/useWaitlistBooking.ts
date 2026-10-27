/**
 * useWaitlistBooking.ts — Hook for 1-click booking of waitlist candidates into freed schedule slots.
 */

import { useState } from "react";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	type TargetSlotInfo,
	type WaitlistCandidateItem,
	generateWaitlistOfferMessage,
} from "../waitlistCancellationEngine";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";
import { waitlistWriteHeaders } from "./waitlistTypes";

export interface UseWaitlistBookingProps {
	readonly targetSlot?: TargetSlotInfo | null | undefined;
	readonly onBookSlot?:
		| ((patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void)
		| undefined;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	readonly updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
	readonly focusNewAppointmentEditor?: (() => void) | undefined;
	readonly onAppointmentCreated?: (() => void) | undefined;
	readonly onClose: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard & auth
	readonly dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: auth
	readonly auth?: any;
	readonly onRefreshWaitlist: () => void;
	readonly clinicName?: string;
}

export function useWaitlistBooking({
	targetSlot,
	onBookSlot,
	updateNewAppointmentDraft,
	focusNewAppointmentEditor,
	onAppointmentCreated,
	onClose,
	dashboard,
	auth,
	onRefreshWaitlist,
	clinicName = "DENTE",
}: UseWaitlistBookingProps) {
	const [bookedItemIds, setBookedItemIds] = useState<Set<string>>(new Set());
	const [bookingId, setBookingId] = useState<string | null>(null);

	const staff = dashboard?.clinicSettings?.staff ?? [];

	const handleOneClickBookSlot = async (item: WaitlistCandidateItem) => {
		if (bookingId === item.id) return;
		setBookingId(item.id);
		try {
			if (onBookSlot && targetSlot) {
				await onBookSlot(item, targetSlot);
			} else if (targetSlot) {
				if (targetSlot.appointmentId) {
					const patchRes = await fetch(
						`/api/appointments/${encodeURIComponent(targetSlot.appointmentId)}`,
						{
							method: "PATCH",
							headers: waitlistWriteHeaders(),
							body: JSON.stringify({
								patientId: item.patientId,
								status: "planned",
								expectedCurrentStatus: ["cancelled", "no_show"],
								reason:
									item.treatmentCategory ||
									item.notes ||
									targetSlot.reason ||
									"Запись из листа ожидания (посадка в окно)",
								comment: `Посадка из листа ожидания: пациент ${item.patientName || ""}`,
								assistantUserId: "",
							}),
						},
					);

					if (!patchRes.ok) {
						const err = await patchRes.json().catch(() => null);
						showToast(err?.message || "Не удалось занять окно расписания", "error");
						return;
					}
				} else {
					const effectiveDoctorUserId =
						targetSlot.doctorUserId ||
						item.preferredDoctorId ||
						auth?.user?.id ||
						staff.find(
							// biome-ignore lint/suspicious/noExplicitAny: doctor filtering
							(s: any) =>
								s.role === "doctor" ||
								s.role === "Врач" ||
								s.role === "admin" ||
								s.role === "owner",
						)?.id ||
						undefined;

					const effectiveChairId =
						targetSlot.chairId ||
						dashboard?.clinicSettings?.chairs?.[0]?.id ||
						dashboard?.chairs?.[0]?.id ||
						DEFAULT_SOLO_CHAIR.id;

					const postRes = await fetch("/api/appointments", {
						method: "POST",
						headers: waitlistWriteHeaders(),
						body: JSON.stringify({
							patientId: item.patientId,
							doctorUserId: effectiveDoctorUserId,
							chairId: effectiveChairId,
							startsAt: targetSlot.startsAt,
							endsAt: targetSlot.endsAt,
							status: "planned",
							reason: item.treatmentCategory || item.notes || "Запись из листа ожидания",
							comment: "Запись из листа ожидания",
							assistantUserId: "",
							clientMutationId: `waitlist-direct-${Date.now()}`,
						}),
					});

					if (!postRes.ok) {
						const err = await postRes.json().catch(() => null);
						showToast(err?.message || "Не удалось создать запись на прием", "error");
						return;
					}
				}

				await fetch(`/api/waitlist/${encodeURIComponent(item.id)}`, {
					method: "PUT",
					headers: waitlistWriteHeaders(),
					body: JSON.stringify({ status: "fulfilled" }),
				}).catch((e) => logger.warn("Failed to mark waitlist item fulfilled", e));
			} else {
				updateNewAppointmentDraft?.("patientId", item.patientId);
				if (item.preferredDoctorId) {
					updateNewAppointmentDraft?.("doctorUserId", item.preferredDoctorId);
				}
				onClose();
				focusNewAppointmentEditor?.();
				showToast(`Пациент «${item.patientName || ""}» выбран. Укажите время записи.`, "success");
				return;
			}

			const offerMsg = generateWaitlistOfferMessage({
				patientName: item.patientName,
				doctorName: targetSlot?.doctorName || item.preferredDoctorName,
				startsAt: targetSlot?.startsAt || new Date().toISOString(),
				clinicName,
			});

			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				void navigator.clipboard.writeText(offerMsg).catch(() => {});
			}

			setBookedItemIds((prev) => new Set(prev).add(item.id));
			showToast(
				`Пациент «${item.patientName || "Пациент"}» записан в слот! Сообщение WhatsApp/SMS скопировано.`,
				"success",
				5000,
			);

			onRefreshWaitlist();
			onAppointmentCreated?.();
		} catch (err) {
			logger.error("Failed to book waitlist candidate", err);
			showToast("Ошибка при записи пациента в слот", "error");
		} finally {
			setBookingId(null);
		}
	};

	return {
		bookedItemIds,
		bookingId,
		handleOneClickBookSlot,
	};
}
