import { getVitaShadeHex } from "@dental/shared";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	ExternalLink,
} from "lucide-react";
import React from "react";
import { AppointmentModalLabCollisionAlert } from "./AppointmentModalLabCollisionAlert";
import type { NormalizedLabItem } from "./labSectionNormalize";

export interface AppointmentModalLabCardProps {
	item: NormalizedLabItem;
	startsAtLocal?: string | undefined;
	setStartsAtLocal?: ((val: string) => void) | undefined;
	setEndsAtLocal?: ((val: string) => void) | undefined;
	onNavigateToLab: (orderNumber?: string) => void;
	onConfirmFitting: (item: NormalizedLabItem) => void;
}

export function AppointmentModalLabCard({
	item,
	startsAtLocal,
	setStartsAtLocal,
	setEndsAtLocal,
	onNavigateToLab,
	onConfirmFitting,
}: AppointmentModalLabCardProps) {
	const hasDue = Boolean(item.dueDateIso);
	const dueDateObj = hasDue ? new Date(item.dueDateIso!) : null;
	const isBeforeLab =
		dueDateObj &&
		startsAtLocal &&
		new Date(startsAtLocal).getTime() < dueDateObj.getTime();
	const dueDayMonthRu = dueDateObj
		? `${String(dueDateObj.getDate()).padStart(2, "0")}.${String(dueDateObj.getMonth() + 1).padStart(2, "0")}`
		: "";
	const hexColor = item.colorVita ? getVitaShadeHex(item.colorVita) : null;

	const handleSyncDate = () => {
		if (dueDateObj && setStartsAtLocal && setEndsAtLocal) {
			const year = dueDateObj.getFullYear();
			const month = String(dueDateObj.getMonth() + 1).padStart(2, "0");
			const day = String(dueDateObj.getDate()).padStart(2, "0");
			const timePart = startsAtLocal ? startsAtLocal.slice(11, 16) : "10:00";
			setStartsAtLocal(`${year}-${month}-${day}T${timePart}`);
			const [hh, mm] = timePart.split(":").map(Number);
			const endHh = String(Math.min(23, (hh || 10) + 1)).padStart(2, "0");
			setEndsAtLocal(
				`${year}-${month}-${day}T${endHh}:${String(mm || 0).padStart(2, "0")}`,
			);
		}
	};

	return (
		<div
			className={`p-3 rounded-xl border text-xs shadow-2xs space-y-2 transition-all ${
				item.statusInfo.isOverdue
					? "bg-rose-500/10 border-rose-500/40"
					: item.statusInfo.state === "ready_in_clinic"
						? "bg-emerald-500/10 border-emerald-500/40"
						: "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)]/30"
			}`}
			data-testid={`appointment-modal-lab-card-${item.id}`}
		>
			<div className="flex items-center justify-between gap-2 flex-wrap font-bold">
				<div className="flex items-center gap-1.5 min-w-0">
					{item.statusInfo.isOverdue ? (
						<AlertTriangle size={13} className="text-rose-500 shrink-0" />
					) : item.statusInfo.state === "ready_in_clinic" ? (
						<CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
					) : (
						<Clock size={13} className="text-amber-500 shrink-0" />
					)}
					<span className="text-[var(--ink)] font-bold">Наряд ЗТЛ:</span>
					<span className="font-mono text-[var(--muted)]">
						{item.orderNumber}
					</span>
				</div>
				<span
					className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold border ${item.statusInfo.badgeClass}`}
					data-testid="appointment-modal-lab-status"
				>
					{item.statusInfo.isOverdue
						? `⚠️ ЗТЛ задерживает: +${item.statusInfo.daysOverdue} дн`
						: item.statusInfo.state === "ready_in_clinic"
							? `✓ ${item.statusInfo.labelRu || "Поступил в клинику"}`
							: item.statusInfo.labelRu}
				</span>
			</div>

			{item.statusInfo.state === "ready_in_clinic" && (
				<div
					className="w-full p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-bold flex items-center justify-between gap-2 flex-wrap"
					data-testid="appointment-modal-lab-readiness-indicator"
				>
					<div className="flex items-center gap-1.5 min-w-0">
						<CheckCircle2
							size={13}
							className="text-emerald-600 dark:text-emerald-400 shrink-0"
						/>
						<span className="truncate">
							{item.statusInfo.readinessText ||
								`Работа из ЗТЛ доставлена: ${item.construction}${item.toothFdi ? ` зуб ${item.toothFdi}` : ""}`}
						</span>
					</div>
					<button
						type="button"
						onClick={() => onConfirmFitting(item)}
						className="h-6 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs transition-all active:scale-95"
						data-testid="appointment-confirm-fitting-btn"
						title="Подтвердить успешную примерку конструкции в 1 клик"
					>
						<CheckCircle2 size={11} />
						<span>Подтвердить примерку</span>
					</button>
				</div>
			)}

			<div className="flex items-center justify-between gap-2 flex-wrap text-xs">
				<div
					className="flex items-center gap-1.5 font-semibold text-[var(--ink)]"
					data-testid="appointment-modal-lab-construction"
				>
					<span>{item.construction}</span>
					{item.toothFdi && (
						<span className="px-1.5 py-0.2 rounded bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] font-bold font-mono text-[11px] border border-[var(--teal)]/30">
							Зуб {item.toothFdi}
						</span>
					)}
				</div>
				{item.colorVita && (
					<div
						className="flex items-center gap-1.5 font-bold text-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]"
						data-testid="appointment-modal-lab-vita"
						title={`Расцветка VITA: ${item.colorVita}`}
					>
						<span
							className="inline-block w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs shrink-0"
							style={{ backgroundColor: hexColor || "#EBD7BB" }}
						/>
						<span className="font-mono text-[11px]">VITA {item.colorVita}</span>
					</div>
				)}
			</div>

			{isBeforeLab && (
				<AppointmentModalLabCollisionAlert
					dueDayMonthRu={dueDayMonthRu}
					setStartsAtLocal={setStartsAtLocal}
					setEndsAtLocal={setEndsAtLocal}
					onSyncDate={handleSyncDate}
				/>
			)}

			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--line)]/50 text-[11px]">
				<div className="space-y-0.5">
					{hasDue ? (
						<div className="text-[var(--muted)] flex items-center gap-1">
							<Clock size={12} className="shrink-0" />
							<span>
								Срок готовности:{" "}
								<strong className="text-[var(--ink)]">
									{dueDateObj?.toLocaleDateString("ru-RU")}
								</strong>
							</span>
							{isBeforeLab && (
								<span className="text-amber-600 dark:text-amber-400 font-bold ml-1 inline-flex items-center gap-1">
									<AlertTriangle size={11} className="shrink-0" />
									<span>(прием раньше готовности ЗТЛ)</span>
								</span>
							)}
						</div>
					) : (
						<span className="text-[var(--muted)]">
							Срок готовности: по согласованию
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{hasDue && setStartsAtLocal && setEndsAtLocal && (
						<button
							type="button"
							onClick={handleSyncDate}
							className="h-7 px-2 rounded-md bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
							title="Перенести приём на дату готовности наряда ЗТЛ"
							data-testid="appointment-modal-sync-lab-date-btn"
						>
							<Calendar size={12} className="text-[var(--teal)]" />
							<span>На дату ЗТЛ</span>
						</button>
					)}
					<button
						type="button"
						onClick={() => onNavigateToLab(item.orderNumber)}
						className="h-7 px-2.5 rounded-md bg-[var(--teal)] hover:opacity-90 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-all"
						title="Открыть реестр лаборатории и наряд ЗТЛ (#lab)"
						data-testid="appointment-modal-open-lab-order-btn"
					>
						<span>Открыть в ЗТЛ</span>
						<ExternalLink size={11} />
					</button>
				</div>
			</div>
		</div>
	);
}
