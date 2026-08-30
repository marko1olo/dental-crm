import type React from "react";
import { useMemo } from "react";
import {
	Activity,
	Clock,
	FileBadge,
	FileCheck2,
	ShieldCheck,
	Sparkles,
	User,
	Zap,
} from "lucide-react";
import {
	calculateDoctorShiftEarnings,
	filterDoctorShiftAppointments,
	formatKopecksRu,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
} from "@dental/shared";

export interface DoctorDesktopHeaderProps {
	readonly doctorId?: string;
	readonly doctorName?: string;
	readonly doctorSpecialty?: string;
	readonly chairName?: string;
	readonly shiftDateIso?: string;
	readonly appointments?: readonly DoctorShiftAppointment[];
	readonly onOpenCockpit?: () => void;
	readonly onInitiateBatchSign?: () => void;
}

export const DoctorDesktopHeader: React.FC<DoctorDesktopHeaderProps> = ({
	doctorId = "doc-1",
	doctorName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Терапевт-ортопед",
	chairName = "Кресло 1 (Терапия)",
	shiftDateIso = "2026-08-29",
	appointments = SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	onOpenCockpit,
	onInitiateBatchSign,
}) => {
	const doctorAppointments = useMemo(() => {
		return filterDoctorShiftAppointments(appointments, doctorId, shiftDateIso);
	}, [appointments, doctorId, shiftDateIso]);

	const earnings = useMemo(() => {
		return calculateDoctorShiftEarnings(
			doctorAppointments,
			doctorId,
			shiftDateIso,
			25,
		);
	}, [doctorAppointments, doctorId, shiftDateIso]);

	const unsignedCount = earnings.unsignedEmr043Count;

	return (
		<div
			data-testid="doctor-desktop-header"
			className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4 text-[var(--ink)] shadow-xs transition-colors mb-3"
		>
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
				{/* Left: Doctor Bio & Context */}
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal)] flex items-center justify-center shrink-0 border border-[var(--teal-surface,rgba(13,148,136,0.24))]">
						<User className="w-5 h-5" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-extrabold text-sm sm:text-base text-[var(--ink)] truncate">
								{doctorName}
							</span>
							<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] border border-[var(--teal-surface,rgba(13,148,136,0.2))]">
								{doctorSpecialty}
							</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--muted)] flex-wrap">
							<span className="font-medium">{chairName}</span>
							<span>•</span>
							<span className="inline-flex items-center gap-1">
								<Clock size={12} className="text-[var(--teal)]" />
								<span>Смена: {earnings.completedAppointmentsCount} из {earnings.totalAppointmentsCount} завершено</span>
							</span>
						</div>
					</div>
				</div>

				{/* Middle: Live Piece-rate Accrual & Financial Metrics */}
				<div className="flex items-center gap-2 sm:gap-4 px-3 py-2 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex-wrap sm:flex-nowrap">
					<div className="min-w-0">
						<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
							<Sparkles size={11} className="text-[var(--emerald)]" />
							<span>Заработано (сделка %):</span>
						</div>
						<div
							className="text-base sm:text-lg font-black text-[var(--emerald)] font-mono leading-tight mt-0.5"
							data-testid="doctor-header-earned-deal"
						>
							{formatKopecksRu(earnings.totalEarnedDealKop)}
						</div>
					</div>
					<div className="hidden sm:block w-px h-8 bg-[var(--line)]" />
					<div className="text-[11px] text-[var(--muted)] space-y-0.5 shrink-0">
						<div>
							Выручка: <strong className="text-[var(--ink)]">{formatKopecksRu(earnings.grossRevenueKop)}</strong>
						</div>
						<div>
							Вычет ЗТЛ/Мат: <strong className="text-[var(--gold)]">−{formatKopecksRu(earnings.totalLabDeductionsKop + earnings.totalMaterialDeductionsKop)}</strong>
						</div>
					</div>
				</div>

				{/* Right: Quick Action Controls */}
				<div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
					{unsignedCount > 0 && onInitiateBatchSign && (
						<button
							type="button"
							onClick={onInitiateBatchSign}
							className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[var(--gold-soft,rgba(217,119,6,0.12))] text-[var(--gold,#d97706)] hover:bg-[var(--gold-surface,rgba(217,119,6,0.2))] border border-[var(--gold,#d97706)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
							data-testid="doctor-header-batch-pep-btn"
							title="Подписать незаверенные карты ф. 043/у через СМС ПЭП (63-ФЗ)"
						>
							<Zap size={14} className="text-[var(--gold)] shrink-0" />
							<span>Подписать 043/у ({unsignedCount})</span>
						</button>
					)}

					{unsignedCount === 0 && (
						<div className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--emerald-soft,rgba(16,185,129,0.1))] text-[var(--emerald)] border border-[var(--emerald-surface,rgba(16,185,129,0.2))] text-xs font-bold">
							<ShieldCheck size={14} />
							<span>Все карты 043/у подписаны</span>
						</div>
					)}

					<button
						type="button"
						onClick={onOpenCockpit}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--teal-fill,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
						data-testid="doctor-header-cockpit-trigger-btn"
						title="Открыть полноэкранный рабочий стол смены врача (Doctor Shift Cockpit)"
					>
						<Activity size={15} className="shrink-0" />
						<span>Рабочий стол врача</span>
					</button>
				</div>
			</div>
		</div>
	);
};
