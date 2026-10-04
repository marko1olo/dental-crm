import type { Appointment } from "@dental/shared";
import { STOMX_REFUSE_REASONS_CATALOG } from "@dental/shared";
import React from "react";
import { AlertTriangle, Check, CreditCard, Zap } from "lucide-react";

export interface AppointmentStatusBadgeSelectorProps {
	appointmentId: string;
	displayStatus: Appointment["status"];
	appointmentLabels: Record<Appointment["status"], string>;
	isQuickStatusUpdating: boolean;
	isLocked: boolean;
	compactMicro?: boolean;
	onStatusChange: (newStatus: Appointment["status"]) => void;
}

export function AppointmentStatusBadgeSelector({
	appointmentId,
	displayStatus,
	appointmentLabels,
	isQuickStatusUpdating,
	isLocked,
	compactMicro = false,
	onStatusChange,
}: AppointmentStatusBadgeSelectorProps) {
	return (
		<div
			className={`appointment-status-badge-selector relative inline-flex items-center gap-1 ${
				compactMicro
					? "h-6 min-h-[24px] max-h-6 px-1.5 py-0 rounded-md text-[11px]"
					: "min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg text-xs"
			} font-bold border transition-colors shrink-0 ${
				displayStatus === "in_treatment"
					? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-500/60 font-black"
					: displayStatus === "confirmed"
						? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500"
						: displayStatus === "arrived"
							? "bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500 font-black"
							: displayStatus === "completed"
								? "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
								: displayStatus === "cancelled" || displayStatus === "no_show"
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
			}`}
			data-testid={`appointment-status-badge-${appointmentId}`}
		>
			{displayStatus === "in_treatment" ? (
				<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" aria-hidden="true" />
			) : displayStatus === "completed" ? (
				<Check size={compactMicro ? 11 : 12} className="shrink-0 text-current" aria-hidden="true" />
			) : (
				<span
					className={`w-1.5 h-1.5 rounded-full shrink-0 ${
						displayStatus === "confirmed"
							? "bg-emerald-500"
							: displayStatus === "arrived"
								? "bg-amber-500"
								: displayStatus === "cancelled" || displayStatus === "no_show"
									? "bg-rose-500"
									: "bg-[var(--line-strong)]"
					}`}
					aria-hidden="true"
				/>
			)}
			<select
				className={`appointment-status-select bg-transparent text-current font-bold ${
					compactMicro ? "text-[11px] p-0 h-auto" : "text-xs p-0 pr-0.5 min-h-[44px] sm:min-h-0 sm:h-auto"
				} cursor-pointer outline-none border-none appearance-none`}
				value={displayStatus}
				disabled={isQuickStatusUpdating || isLocked}
				onChange={(e) => {
					e.stopPropagation();
					onStatusChange(e.target.value as Appointment["status"]);
				}}
				title={`Статус записи: ${appointmentLabels?.[displayStatus] || displayStatus}`}
				aria-label="Изменить статус приема"
			>
				{(Object.keys(appointmentLabels ?? {}) as Appointment["status"][]).map((status) => (
					<option
						key={status}
						value={status}
						className="bg-[var(--paper)] text-[var(--ink)] font-normal"
						disabled={isLocked}
					>
						{appointmentLabels?.[status] ?? status}
					</option>
				))}
			</select>
		</div>
	);
}

export function AppointmentBalanceBadge({ balance }: { balance: number | null }) {
	if (balance === null) return null;
	if (balance < 0) {
		return (
			<span
				className="px-2.5 py-1 rounded-lg text-xs font-black font-mono tracking-tight bg-rose-500/15 text-rose-800 dark:text-rose-100 dark:bg-rose-950/70 border-2 border-rose-500 shadow-xs flex items-center gap-1 shrink-0 whitespace-nowrap"
				title={`Задолженность пациента: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`}
				data-testid="appointment-debt-badge"
			>
				<CreditCard size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
				<span className="whitespace-nowrap">Долг: {Math.abs(balance).toLocaleString("ru-RU")} ₽</span>
			</span>
		);
	}
	if (balance > 0) {
		return (
			<span
				className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-tight bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 dark:bg-emerald-950/50 border border-emerald-500/40 shadow-xs shrink-0 whitespace-nowrap"
				title={`Аванс/депозит пациента: ${balance.toLocaleString("ru-RU")} ₽`}
			>
				Аванс: {balance.toLocaleString("ru-RU")} ₽
			</span>
		);
	}
	return (
		<span
			className="px-2 py-0.5 rounded-lg text-xs font-medium font-mono text-[var(--muted)] bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 whitespace-nowrap"
			title="Баланс пациента: 0 ₽"
		>
			Баланс: 0 ₽
		</span>
	);
}

export function AppointmentAlertBadges({
	isCito,
	collisionMessage,
	hasOpenVisit,
}: {
	isCito: boolean;
	collisionMessage: string | null;
	hasOpenVisit: boolean;
}) {
	return (
		<>
			{isCito && (
				<span
					className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-500/20 text-rose-800 dark:text-rose-100 border border-rose-500 ring-2 ring-rose-500/50 shadow-xs flex items-center gap-1 animate-pulse shrink-0"
					title="CITO! Прием по острой боли (наивысший приоритет)"
					data-testid="appointment-cito-badge"
				>
					<Zap size={13} className="text-rose-600 dark:text-rose-300 fill-rose-500" />
					<span>CITO Острая боль</span>
				</span>
			)}
			{collisionMessage ? (
				<span
					className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/50 shadow-xs flex items-center gap-1 animate-pulse shrink-0"
					title={collisionMessage}
					data-testid="appointment-collision-badge"
				>
					{collisionMessage}
				</span>
			) : null}
			{hasOpenVisit ? (
				<span className="handoff-lock text-xs break-words" title="Открыт прием: пациент закреплен">
					Открыт прием: пациент закреплен
				</span>
			) : null}
		</>
	);
}

export function AppointmentMedicalBadges({
	cardTeeth,
	allergyAlert,
	somaticAlert,
}: {
	cardTeeth: string[];
	allergyAlert: string | null;
	somaticAlert: string | null;
}) {
	return (
		<>
			{cardTeeth.length > 0 && (
				<span
					className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/30 text-[11px] font-bold font-mono shrink-0"
					title={`Зубы: ${cardTeeth.join(", ")}`}
					data-testid="appointment-teeth-badge"
				>
					Зуб {cardTeeth.join(", ")}
				</span>
			)}
			{allergyAlert && (
				<span
					className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-[11px] font-black flex items-center gap-1 shrink-0"
					title={allergyAlert}
					data-testid="appointment-card-allergy-badge"
				>
					<AlertTriangle size={11} className="text-amber-600 shrink-0" />
					<span className="truncate max-w-[160px]">{allergyAlert}</span>
				</span>
			)}
			{somaticAlert && (
				<span
					className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30 text-[11px] font-bold shrink-0"
					title={somaticAlert}
					data-testid="appointment-somatic-badge"
				>
					<span className="truncate max-w-[160px]">{somaticAlert}</span>
				</span>
			)}
		</>
	);
}

export function AppointmentRefusalBanner({
	appointment,
	isQuickStatusUpdating,
	appointmentHasOpenVisit,
	onQuickStatusChange,
}: {
	appointment: Appointment;
	isQuickStatusUpdating: boolean;
	appointmentHasOpenVisit: boolean;
	onQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
}) {
	if (appointment?.status !== "cancelled" && appointment?.status !== "no_show") {
		return null;
	}

	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	const match = text.match(/\[Отмена: ([^\]]+)\]/);
	const hasReason = /\[Отмена: [^\]]+\]/.test(text);

	return (
		<div
			className="mt-1.5 p-2 rounded-lg border text-xs flex flex-col gap-1.5"
			style={{
				borderColor:
					appointment.status === "cancelled"
						? "rgba(225, 29, 72, 0.25)"
						: "rgba(217, 119, 6, 0.25)",
				backgroundColor:
					appointment.status === "cancelled"
						? "rgba(225, 29, 72, 0.06)"
						: "rgba(217, 119, 6, 0.06)",
				color: "var(--ink)",
			}}
			data-testid="appointment-card-refusal-banner"
		>
			<div className="flex items-center justify-between gap-1 flex-wrap">
				<span className="font-semibold text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-300">
					{appointment.status === "cancelled" ? "Запись отменена" : "Пациент не явился"}
				</span>
				{match && match[1] && (
					<span className="font-medium text-xs text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800/40">
						{match[1]}
					</span>
				)}
			</div>
			{!hasReason && (
				<div className="flex flex-wrap gap-1 mt-0.5" data-testid="appointment-card-refusal-chips">
					<span className="text-[11px] text-[var(--muted)] w-full">Причина отказа (1 клик):</span>
					{STOMX_REFUSE_REASONS_CATALOG.slice(0, 4).map((refuse) => (
						<button
							key={refuse.code}
							type="button"
							disabled={isQuickStatusUpdating || appointmentHasOpenVisit}
							className="px-2 py-1 min-h-[28px] rounded text-[11px] font-medium bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-[var(--line)] text-[var(--ink)] hover:border-rose-300 transition-colors cursor-pointer"
							data-testid={`appointment-card-refusal-chip-${refuse.code}`}
							onClick={(e) => {
								e.stopPropagation();
								const statusToSet = appointment.status === "no_show" ? "no_show" : "cancelled";
								void onQuickStatusChange(statusToSet, `[Отмена: ${refuse.nameRu}]`);
							}}
						>
							{refuse.nameRu}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
