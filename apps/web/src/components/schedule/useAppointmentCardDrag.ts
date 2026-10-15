import type { Appointment } from "@dental/shared";
import { useCallback, useRef, useState } from "react";
import { showToast } from "../GlobalToast";

export interface AppointmentDragOptions {
	appointment: Appointment;
	onAdjustDuration?: ((appt: Appointment, deltaMinutes: number) => void) | undefined;
	onShiftLateness?: ((appt: Appointment, deltaMinutes: number) => void) | undefined;
	collisionAppointments?: Appointment[];
}

export function useAppointmentCardDrag(options: AppointmentDragOptions) {
	const { appointment, onAdjustDuration, onShiftLateness, collisionAppointments } = options;
	const [isDragging, setIsDragging] = useState(false);
	const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
	const rafRef = useRef<number | null>(null);

	const handleDragStart = useCallback(
		(e: React.DragEvent<HTMLElement>) => {
			setIsDragging(true);
			e.dataTransfer.setData(
				"application/json",
				JSON.stringify({
					type: "appointment",
					appointmentId: appointment.id,
					doctorUserId: appointment.doctorUserId,
					startsAt: appointment.startsAt,
					endsAt: appointment.endsAt,
				}),
			);
			e.dataTransfer.effectAllowed = "move";
		},
		[appointment],
	);

	const handleDragEnd = useCallback(() => {
		setIsDragging(false);
		setDragOverSlot(null);
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	}, []);

	const checkSlotCollision = useCallback(
		(targetStartMs: number, targetEndMs: number, chairId?: string, doctorId?: string): boolean => {
			if (!collisionAppointments || collisionAppointments.length === 0) return false;
			return collisionAppointments.some((other) => {
				if (other.id === appointment.id || other.status === "cancelled" || other.status === "no_show") {
					return false;
				}
				const oStartMs = new Date(other.startsAt).getTime();
				const oEndMs = new Date(other.endsAt).getTime();
				const isOverlap = targetStartMs < oEndMs && targetEndMs > oStartMs;
				if (!isOverlap) return false;

				const sameDoc = Boolean(doctorId && other.doctorUserId === doctorId);
				const sameChair = Boolean(chairId && other.chairId === chairId);
				return sameDoc || sameChair;
			});
		},
		[appointment.id, collisionAppointments],
	);

	const handleSmoothDurationResize = useCallback(
		(deltaMinutes: number) => {
			if (!onAdjustDuration) return;
			if (rafRef.current) cancelAnimationFrame(rafRef.current);

			rafRef.current = requestAnimationFrame(() => {
				const curStart = new Date(appointment.startsAt).getTime();
				const curEnd = new Date(appointment.endsAt).getTime();
				const newEndMs = curEnd + deltaMinutes * 60000;
				if (newEndMs <= curStart + 10 * 60000) {
					showToast("Минимальная длительность визита: 15 минут", "info");
					return;
				}
				if (checkSlotCollision(curStart, newEndMs, appointment.chairId ?? undefined, appointment.doctorUserId ?? undefined)) {
					showToast("Невозможно продлить приём: наложение на следующую запись", "error");
					return;
				}
				onAdjustDuration(appointment, deltaMinutes);
			});
		},
		[appointment, checkSlotCollision, onAdjustDuration],
	);

	const handleSmoothShiftLateness = useCallback(
		(deltaMinutes: number) => {
			if (!onShiftLateness) return;
			if (rafRef.current) cancelAnimationFrame(rafRef.current);

			rafRef.current = requestAnimationFrame(() => {
				const curStart = new Date(appointment.startsAt).getTime();
				const curEnd = new Date(appointment.endsAt).getTime();
				const newStartMs = curStart + deltaMinutes * 60000;
				const newEndMs = curEnd + deltaMinutes * 60000;

				if (checkSlotCollision(newStartMs, newEndMs, appointment.chairId ?? undefined, appointment.doctorUserId ?? undefined)) {
					showToast("Невозможно сдвинуть приём: наложение на занятый слот", "error");
					return;
				}
				onShiftLateness(appointment, deltaMinutes);
			});
		},
		[appointment, checkSlotCollision, onShiftLateness],
	);

	return {
		isDragging,
		dragOverSlot,
		setDragOverSlot,
		handleDragStart,
		handleDragEnd,
		checkSlotCollision,
		handleSmoothDurationResize,
		handleSmoothShiftLateness,
	};
}
