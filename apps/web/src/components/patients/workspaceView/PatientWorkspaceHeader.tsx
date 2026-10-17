import React from "react";
import { Users } from "lucide-react";
import { PatientDuplicateAlert } from "../PatientDuplicateAlert";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export interface PatientWorkspaceHeaderProps {
	patientId: string;
	patientName?: string | null | undefined;
	currentPatient?: any;
	patientCardNumber?: string | null | undefined;
	patientBalanceRub?: number | null | undefined;
	compact?: boolean | undefined;
}

export const PatientWorkspaceHeader: React.FC<PatientWorkspaceHeaderProps> = React.memo(
	({ patientId, patientName, patientCardNumber, patientBalanceRub, compact = false }) => {
		const [familySummary, setFamilySummary] = React.useState<{ id: string; name: string; balance: number } | null>(null);

		const loadFamilySummary = React.useCallback(async (pid: string) => {
			if (!pid) { setFamilySummary(null); return; }
			try {
				const res = await fetch(`/api/finance/family/patient/${encodeURIComponent(pid)}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (res.ok) {
					const data = await res.json();
					if (data?.id) {
						setFamilySummary({
							id: data.id,
							name: data.name || "Семья",
							balance: typeof data.balance === "number" ? data.balance : Number(data.balance) || 0,
						});
						return;
					}
				}
				setFamilySummary(null);
			} catch {
				setFamilySummary(null);
			}
		}, []);

		React.useEffect(() => {
			loadFamilySummary(patientId);
		}, [patientId, loadFamilySummary]);

		const handleOpenFamilyWallet = () => {
			window.dispatchEvent(new CustomEvent("dente-open-family-wallet", { detail: { patientId } }));
		};

		if (compact) return null;

		return (
			<>
				<PatientDuplicateAlert patientId={patientId} />
				<div className="flex items-center gap-2 min-w-0 flex-wrap">
					<span className="text-sm md:text-base font-black text-[var(--ink)] truncate">
						{patientName || "Карточка пациента"}
					</span>
					<span className="text-xs font-mono font-bold text-[var(--muted)] bg-[var(--paper-soft)] px-2 py-0.5 rounded-md border border-[var(--line)] shrink-0">
						{patientCardNumber ? `Карта: ${patientCardNumber}` : patientId ? `№ ${String(patientId || "").slice(0, 8)}` : "—"}
					</span>
					{typeof patientBalanceRub === "number" && (
						<span
							className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
								patientBalanceRub < 0
									? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
									: patientBalanceRub > 0
										? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
							}`}
							title={`Текущий баланс: ${patientBalanceRub.toLocaleString("ru-RU")} ₽`}
							data-testid="patient-workspace-balance-badge"
						>
							Баланс: {patientBalanceRub > 0 ? "+" : ""}{patientBalanceRub.toLocaleString("ru-RU")} ₽
						</span>
					)}

					{familySummary ? (
						<button
							type="button"
							onClick={handleOpenFamilyWallet}
							className="text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 inline-flex items-center gap-1.5 cursor-pointer bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
							data-testid="patient-workspace-family-balance-badge"
						>
							<Users size={12} className="shrink-0" />
							<span>Семья: {familySummary.balance > 0 ? "+" : ""}{familySummary.balance.toLocaleString("ru-RU")} ₽</span>
						</button>
					) : (
						<button
							type="button"
							onClick={handleOpenFamilyWallet}
							className="text-xs font-medium px-2 py-0.5 rounded-md border border-dashed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--teal)] transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
							data-testid="patient-workspace-open-family-btn"
						>
							<Users size={12} className="text-[var(--teal)] shrink-0" />
							<span>+ Семейный счет</span>
						</button>
					)}
				</div>
			</>
		);
	},
);

PatientWorkspaceHeader.displayName = "PatientWorkspaceHeader";
