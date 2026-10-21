import { AlertTriangle, User } from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

interface GridAppointmentHudHeaderProps {
	pName: string;
	pBalance: number | null;
	patObj?: any;
	pAllergyAlert: string | null;
}

export function GridAppointmentHudHeader({
	pName,
	pBalance,
	patObj,
	pAllergyAlert,
}: GridAppointmentHudHeaderProps) {
	return (
		<div className="space-y-2 border-b border-[var(--line)] pb-2.5">
			<div className="flex items-start justify-between gap-2">
				<span className="text-[15px] leading-snug font-black text-[var(--ink)] flex items-start gap-1.5 min-w-0 break-words">
					<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0 mt-0.5" />
					<span className="min-w-0 break-words">{pName || "Пациент"}</span>
				</span>
				{pBalance !== null && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (patObj?.id) {
								usePatientStore.getState().setSelectedPatientId(patObj.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(`Касса: расчёт ${pName}`, "info");
						}}
						className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
							pBalance > 0
								? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
								: pBalance < 0
									? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
						}`}
						title={
							pBalance > 0
								? "Долг за лечение. Клик для оплаты"
								: pBalance < 0
									? "Депозит пациента"
									: "Баланс нулевой"
						}
					>
						<span>
							{pBalance > 0
								? `Долг ${pBalance.toLocaleString("ru-RU")} ₽`
								: pBalance < 0
									? `Аванс ${Math.abs(pBalance).toLocaleString("ru-RU")} ₽`
									: "0 ₽"}
						</span>
					</button>
				)}
			</div>

			{pAllergyAlert && (
				<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[11px] animate-pulse">
					<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
					<span className="truncate">{pAllergyAlert}</span>
				</div>
			)}
		</div>
	);
}
