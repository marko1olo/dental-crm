import type { Appointment, Dashboard } from "@dental/shared";
import { Clock, FileText, Stethoscope } from "lucide-react";
import {
	extractTeethList,
	resolveAppointmentLabStatus,
} from "../appointmentCardHelpers";

interface GridAppointmentHudDetailsProps {
	appointment: Appointment;
	docObj?: any;
	chair: { id: string; name: string };
	aStart: string;
	aEnd: string;
	dashboard: Dashboard;
}

export function GridAppointmentHudDetails({
	appointment: a,
	docObj,
	chair,
	aStart,
	aEnd,
	dashboard,
}: GridAppointmentHudDetailsProps) {
	const teeth = extractTeethList(a);
	const labStatus = resolveAppointmentLabStatus(a, dashboard?.labOrders ?? []);

	return (
		<div className="space-y-1.5 text-xs text-[var(--ink)]">
			<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
				<span className="flex items-center gap-1 font-semibold text-[var(--ink)]">
					<Clock className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
					<span>
						{aStart} – {aEnd}
					</span>
				</span>
				<span className="truncate max-w-[140px] font-medium">{chair.name}</span>
			</div>

			{docObj && (
				<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
					<Stethoscope className="w-3.5 h-3.5 shrink-0 text-[var(--teal,#0d9488)]" />
					<span className="truncate">{docObj.fullName || docObj.name}</span>
				</div>
			)}

			<div className="flex items-start gap-1.5 pt-0.5">
				<FileText className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
				<span className="font-semibold text-[var(--ink)] line-clamp-2 leading-tight">
					{a.reason || "Консультация и осмотр"}
				</span>
			</div>

			{(teeth.length > 0 || (a as any).vitaShade || labStatus) && (
				<div className="flex flex-wrap items-center gap-1.5 pt-1">
					{teeth.length > 0 && (
						<span className="px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] font-bold text-[var(--ink)]">
							Зубы: {teeth.join(", ")}
						</span>
					)}
					{(a as any).vitaShade && (
						<span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-800 dark:text-amber-200">
							VITA: {(a as any).vitaShade}
						</span>
					)}
					{labStatus && (
						<span
							className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${labStatus.badgeClass}`}
						>
							{labStatus.label}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
