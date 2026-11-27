import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, Trash2, X, Clock } from "lucide-react";
import {
	extractWallTimePartsInTimeZone,
	generateUuidV7,
	todayDateKeyInTimeZone,
} from "@dental/shared";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { fromDateTimeLocalValue } from "../../utils/dateTimeUtils";
import { showToast } from "../GlobalToast";

export type ScheduleTimeReservationItem = {
	id: string;
	organizationId: string;
	chairName: string;
	reservationType: "lunch" | "maintenance" | "meeting" | "sanitation" | "other" | string;
	startTime: string;
	endTime: string;
	bookingLocked: boolean;
	hatchingStyle: "diagonal_red" | "diagonal_amber" | "diagonal_slate" | string;
	note: string;
	createdAt: string;
};

export interface ScheduleTimeReservationModalProps {
	isOpen: boolean;
	onClose: () => void;
	defaultDateKey?: string | undefined;
	chairs?: readonly { id: string; name: string }[] | undefined;
	defaultChairName?: string | undefined;
	timezone?: string | undefined;
}

type ReservationPreset = {
	id: "lunch" | "meeting" | "maintenance" | "sanitation";
	label: string;
	defaultNote: string;
	hatchingStyle: "diagonal_amber" | "diagonal_slate" | "diagonal_red";
};

const RESERVATION_PRESETS: readonly ReservationPreset[] = [
	{
		id: "lunch",
		label: "Обед",
		defaultNote: "Обеденный перерыв",
		hatchingStyle: "diagonal_amber",
	},
	{
		id: "meeting",
		label: "Планёрка",
		defaultNote: "Утренняя планёрка врачей",
		hatchingStyle: "diagonal_slate",
	},
	{
		id: "maintenance",
		label: "Ремонт кресла",
		defaultNote: "Техобслуживание кресла",
		hatchingStyle: "diagonal_red",
	},
	{
		id: "sanitation",
		label: "Санобработка",
		defaultNote: "Дезинфекция и кварцевание",
		hatchingStyle: "diagonal_amber",
	},
];

function addMinutesToTimeStr(hm: string, deltaMinutes: number): string {
	const [hStr, mStr] = hm.split(":");
	const h = Number.parseInt(hStr ?? "9", 10);
	const m = Number.parseInt(mStr ?? "0", 10);
	const total = Math.max(0, Math.min(23 * 60 + 59, (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0) + deltaMinutes));
	return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatReservationTimeRange(
	startTime: string,
	endTime: string,
	timezone?: string,
): string {
	const extractHm = (iso: string) => {
		const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso.trim());
		if (hasOffset) {
			const parts = extractWallTimePartsInTimeZone(iso, timezone);
			if (parts) return parts.hm;
		}
		const match = iso.match(/T(\d{2}:\d{2})/);
		if (match?.[1]) return match[1];
		const parts = extractWallTimePartsInTimeZone(iso, timezone);
		return parts ? parts.hm : iso.slice(0, 5);
	};
	return `${extractHm(startTime)} – ${extractHm(endTime)}`;
}

export function ScheduleTimeReservationModal({
	isOpen,
	onClose,
	defaultDateKey,
	chairs = [],
	defaultChairName,
	timezone,
}: ScheduleTimeReservationModalProps) {
	const titleId = useId();
	const initialDate = defaultDateKey && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateKey)
		? defaultDateKey
		: todayDateKeyInTimeZone(timezone);

	const [reservationType, setReservationType] = useState<ReservationPreset["id"]>("lunch");
	const [hatchingStyle, setHatchingStyle] = useState<ReservationPreset["hatchingStyle"]>("diagonal_amber");
	const [note, setNote] = useState<string>("Обеденный перерыв");
	const [dateKey, setDateKey] = useState<string>(initialDate);
	const [startTime, setStartTime] = useState<string>("13:00");
	const [endTime, setEndTime] = useState<string>("14:00");
	const [chairName, setChairName] = useState<string>(defaultChairName || "Все кресла");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [isLoadingList, setIsLoadingList] = useState(false);
	const [dayReservations, setDayReservations] = useState<ScheduleTimeReservationItem[]>([]);
	const [errorText, setErrorText] = useState<string | null>(null);

	const resetDraft = useCallback(() => {
		setReservationType("lunch");
		setHatchingStyle("diagonal_amber");
		setNote("Обеденный перерыв");
		setDateKey(
			defaultDateKey && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateKey)
				? defaultDateKey
				: todayDateKeyInTimeZone(timezone),
		);
		setStartTime("13:00");
		setEndTime("14:00");
		setChairName(defaultChairName || "Все кресла");
		setErrorText(null);
	}, [defaultChairName, defaultDateKey, timezone]);

	const handleClose = useCallback(() => {
		resetDraft();
		onClose();
	}, [onClose, resetDraft]);

	const fetchReservationsForDate = useCallback(async (targetDate: string) => {
		if (typeof window === "undefined" || typeof globalThis.fetch !== "function") return;
		setIsLoadingList(true);
		try {
			const res = await fetch(
				`/api/schedule/time-reservations?date=${encodeURIComponent(targetDate)}`,
				{ headers: getDenteAuthHeaders() },
			);
			if (!res.ok) {
				setDayReservations([]);
				return;
			}
			const json = (await res.json()) as { data?: ScheduleTimeReservationItem[] };
			const list = Array.isArray(json?.data) ? json.data : [];
			setDayReservations(list);
		} catch (err) {
			void err;
			setDayReservations([]);
		} finally {
			setIsLoadingList(false);
		}
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		resetDraft();
	}, [isOpen, resetDraft]);

	useEffect(() => {
		if (!isOpen) return;
		void fetchReservationsForDate(dateKey);
	}, [isOpen, dateKey, fetchReservationsForDate]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, handleClose]);

	if (!isOpen) return null;

	const handleSelectPreset = (preset: ReservationPreset) => {
		setReservationType(preset.id);
		setHatchingStyle(preset.hatchingStyle);
		setNote(preset.defaultNote);
		setErrorText(null);
	};

	const handleApplyDuration = (minutes: number) => {
		setEndTime(addMinutesToTimeStr(startTime, minutes));
		setErrorText(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const normalizedNote = note.trim() || "Технологический резерв";
		if (endTime <= startTime) {
			setErrorText("Время окончания должно быть позже начала.");
			return;
		}
		setIsSubmitting(true);
		setErrorText(null);
		try {
			const res = await fetch("/api/schedule/time-reservations", {
				method: "POST",
				headers: getDenteAuthHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					chairName: chairName.trim() || "Все кресла",
					reservationType,
					startTime: timezone
						? fromDateTimeLocalValue(`${dateKey}T${startTime}`, timezone)
						: `${dateKey}T${startTime}:00`,
					endTime: timezone
						? fromDateTimeLocalValue(`${dateKey}T${endTime}`, timezone)
						: `${dateKey}T${endTime}:00`,
					bookingLocked: true,
					hatchingStyle,
					note: normalizedNote,
				}),
			});
			if (!res.ok) {
				const errJson = (await res.json().catch(() => null)) as { message?: string } | null;
				const msg = errJson?.message ?? `Ошибка сохранения резерва (${res.status})`;
				setErrorText(msg);
				showToast(msg, "error");
				return;
			}
			const json = (await res.json().catch(() => null)) as {
				data?: ScheduleTimeReservationItem;
			} | null;
			const created = json?.data ?? null;
			if (created) {
				setDayReservations((prev) => [...prev, created]);
			}
			showToast(`Резерв «${normalizedNote}» добавлен в сетку`, "success");
			window.dispatchEvent(new CustomEvent("dente:schedule-reservations-updated"));
			await fetchReservationsForDate(dateKey);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Не удалось сохранить резерв";
			setErrorText(msg);
			showToast(msg, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteReservation = async (id: string) => {
		setDeletingId(id);
		try {
			const res = await fetch(`/api/schedule/time-reservations/${encodeURIComponent(id)}`, {
				method: "DELETE",
				headers: getDenteAuthHeaders({
					"Idempotency-Key": generateUuidV7(),
				}),
			});
			if (!res.ok) {
				showToast("Не удалось снять резерв времени", "error");
				return;
			}
			showToast("Резерв времени снят", "info");
			setDayReservations((prev) => prev.filter((item) => item.id !== id));
			window.dispatchEvent(new CustomEvent("dente:schedule-reservations-updated"));
		} catch (err) {
			void err;
			showToast("Ошибка сети при снятии резерва", "error");
		} finally {
			setDeletingId(null);
		}
	};

	const modalNode = (
		<div
			className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px] md:p-4 overflow-x-clip max-w-[100vw]"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="schedule-time-reservation-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) handleClose();
			}}
		>
			<form
				onSubmit={handleSubmit}
				className="w-full md:max-w-[520px] rounded-t-[24px] md:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Mobile Drag Handle */}
				<div className="md:hidden w-9 h-1.5 rounded-full bg-[var(--line)] mx-auto mt-3 shrink-0 pointer-events-none" />

				{/* Header (h-14 px-6) */}
				<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<span className="w-8 h-8 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center shrink-0 text-[var(--ink)]">
							<Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
						</span>
						<h2 id={titleId} className="text-base font-semibold text-[var(--ink)] truncate">
							Резерв времени
						</h2>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
						aria-label="Закрыть окно резерва"
					>
						<X className="w-4 h-4 shrink-0" aria-hidden="true" />
					</button>
				</div>

				{/* Body (p-6 space-y-4) */}
				<div className="p-6 overflow-y-auto space-y-4">
					{/* Поле 1: Причина и быстрые пресеты */}
					<div className="space-y-2">
						<label
							htmlFor="time-reservation-note-input"
							className="block text-sm font-medium text-[var(--ink)]"
						>
							Причина
						</label>
						<div className="flex flex-wrap gap-1.5" role="group" aria-label="Быстрый выбор причины">
							{RESERVATION_PRESETS.map((preset) => {
								const isSelected = reservationType === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleSelectPreset(preset)}
										className={`h-8 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
											isSelected
												? "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/40"
												: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
										}`}
										data-testid={`time-reservation-preset-${preset.id}`}
									>
										{preset.label}
									</button>
								);
							})}
						</div>
						<input
							id="time-reservation-note-input"
							type="text"
							value={note}
							onChange={(e) => {
								setNote(e.target.value);
								setErrorText(null);
							}}
							placeholder="Например: Обед, Планёрка, Ремонт кресла"
							maxLength={300}
							className="w-full h-9 md:h-9 min-h-[44px] md:min-h-0 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
							data-testid="time-reservation-note-input"
						/>
					</div>

					{/* Поле 2: Время и кресло */}
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium text-[var(--ink)] flex items-center gap-1.5">
								<Clock className="w-4 h-4 shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
								<span>Время</span>
							</span>
							<div className="flex items-center gap-1">
								{[30, 60, 120].map((mins) => (
									<button
										key={mins}
										type="button"
										onClick={() => handleApplyDuration(mins)}
										className="h-7 px-2 rounded-md text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer tabular-nums"
									>
										{mins === 30 ? "30 мин" : mins === 60 ? "1 ч" : "2 ч"}
									</button>
								))}
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<input
								type="date"
								value={dateKey}
								onChange={(e) => setDateKey(e.target.value)}
								aria-label="Дата резерва"
								className="h-9 min-h-[44px] md:min-h-0 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] tabular-nums"
								data-testid="time-reservation-date-input"
							/>
							<input
								type="time"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								aria-label="Время начала"
								className="h-9 min-h-[44px] md:min-h-0 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] tabular-nums"
								data-testid="time-reservation-start-input"
							/>
							<input
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
								aria-label="Время окончания"
								className="h-9 min-h-[44px] md:min-h-0 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] tabular-nums"
								data-testid="time-reservation-end-input"
							/>
						</div>

						{chairs.length > 0 && (
							<div className="pt-1">
								<label
									htmlFor="time-reservation-chair-select"
									className="block text-xs text-[var(--ink-muted)] mb-1"
								>
									Кресло
								</label>
								<select
									id="time-reservation-chair-select"
									value={chairName}
									onChange={(e) => setChairName(e.target.value)}
									className="w-full h-9 min-h-[44px] md:min-h-0 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
									data-testid="time-reservation-chair-select"
								>
									<option value="Все кресла">Все кресла</option>
									{chairs.map((c) => (
										<option key={c.id} value={c.name}>
											{c.name}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					{errorText && (
						<div
							className="px-3 py-2 rounded-lg text-xs font-medium bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/20"
							role="alert"
						>
							{errorText}
						</div>
					)}

					{/* Активные резервы на выбранную дату */}
					<div className="pt-2 border-t border-[var(--line)] space-y-2">
						<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
							<span>Активные резервы на {dateKey}</span>
							<span className="tabular-nums font-medium">{dayReservations.length}</span>
						</div>

						{isLoadingList ? (
							<div className="h-10 rounded-lg animate-pulse bg-[var(--paper-soft)]" />
						) : dayReservations.length === 0 ? (
							<div className="text-xs text-[var(--ink-muted)] py-2">
								На выбранный день технологических резервов нет.
							</div>
						) : (
							<div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
								{dayReservations.map((item) => (
									<div
										key={item.id}
										className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 text-xs"
										data-testid={`time-reservation-row-${item.id}`}
									>
										<div className="min-w-0 flex-1">
											<div className="font-medium text-[var(--ink)] truncate">{item.note}</div>
											<div className="text-[var(--ink-muted)] tabular-nums">
												{formatReservationTimeRange(item.startTime, item.endTime, timezone)} · {item.chairName}
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleDeleteReservation(item.id)}
											disabled={deletingId === item.id}
											className="h-8 px-2.5 rounded-md text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] border border-transparent hover:border-[var(--danger)]/20 inline-flex items-center gap-1 shrink-0 cursor-pointer"
											aria-label={`Удалить резерв ${item.note}`}
											data-testid={`delete-time-reservation-${item.id}`}
										>
											<Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
											<span>Снять</span>
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Footer (h-16 px-6, Отмена слева от Primary CTA) */}
				<div className="h-16 px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-end gap-3 shrink-0 pb-[env(safe-area-inset-bottom)]">
					<button
						type="button"
						onClick={handleClose}
						className="h-9 min-h-[44px] md:min-h-0 px-3.5 rounded-lg text-sm font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center shrink-0 cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="submit"
						className="h-9 min-h-[44px] md:min-h-0 px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
						data-testid="submit-time-reservation-btn"
					>
						<Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
						<span>{isSubmitting ? "Сохранение..." : "Забронировать время"}</span>
					</button>
				</div>
			</form>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalNode, document.body);
	}
	return modalNode;
}
