import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { showToast } from "../GlobalToast";

export interface SurgerySafetyChecklistProps {
	readonly toothFdi?: number;
	readonly patientName?: string;
	readonly onVerifiedChange?: (isVerified: boolean) => void;
	readonly className?: string;
}

export const SurgerySafetyChecklist: React.FC<SurgerySafetyChecklistProps> = ({
	toothFdi = 46,
	patientName = "Пациент",
	onVerifiedChange,
	className = "",
}) => {
	const [checks, setChecks] = useState<{
		patientIdentity: boolean;
		zoneVerified: boolean;
		sterilityConfirmed: boolean;
		warehouseNoticeAcknowledged: boolean;
	}>({
		patientIdentity: true,
		zoneVerified: true,
		sterilityConfirmed: true,
		warehouseNoticeAcknowledged: true,
	});

	const allPassed = Object.values(checks).every(Boolean);

	const handleToggle = (key: keyof typeof checks) => {
		const updated = { ...checks, [key]: !checks[key] };
		setChecks(updated);
		onVerifiedChange?.(Object.values(updated).every(Boolean));
	};

	const handleOneClickAllNorm = () => {
		const verified = {
			patientIdentity: true,
			zoneVerified: true,
			sterilityConfirmed: true,
			warehouseNoticeAcknowledged: true,
		};
		setChecks(verified);
		onVerifiedChange?.(true);
		showToast("Хирургический Time-Out (ВОЗ): норма подтверждена в 1 клик", "success");
	};

	return (
		<div
			className={`p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] space-y-2.5 ${className}`.trim()}
			data-testid="surgery-safety-checklist"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<ShieldCheck size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
						Хирургический Time-Out (Протокол безопасности ВОЗ)
					</span>
				</div>

				<button
					type="button"
					onClick={handleOneClickAllNorm}
					className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 active:scale-95 transition-all"
					data-testid="btn-timeout-all-norm"
				>
					<CheckCircle2 size={15} />
					<span>1-Клик норма (Time-Out)</span>
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
				<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={checks.patientIdentity}
						onChange={() => handleToggle("patientIdentity")}
						className="w-4 h-4 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)]"
						data-testid="check-patient-identity"
					/>
					<span className="font-semibold text-[var(--ink)]">
						Пациент идентифицирован ({patientName}), аллергоанамнез чист
					</span>
				</label>

				<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={checks.zoneVerified}
						onChange={() => handleToggle("zoneVerified")}
						className="w-4 h-4 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)]"
						data-testid="check-zone-verified"
					/>
					<span className="font-semibold text-[var(--ink)]">
						Область операции сверена: Зуб FDI #{toothFdi}
					</span>
				</label>

				<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={checks.sterilityConfirmed}
						onChange={() => handleToggle("sterilityConfirmed")}
						className="w-4 h-4 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)]"
						data-testid="check-sterility"
					/>
					<span className="font-semibold text-[var(--ink)]">
						Стерильность стола и физиодиспенсера подтверждена
					</span>
				</label>

				<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={checks.warehouseNoticeAcknowledged}
						onChange={() => handleToggle("warehouseNoticeAcknowledged")}
						className="w-4 h-4 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)]"
						data-testid="check-warehouse"
					/>
					<span className="font-semibold text-[var(--ink)]">
						Складской учет: овердрафт активен (без блокировки операции)
					</span>
				</label>
			</div>

			{!allPassed && (
				<div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--amber-surface,rgba(245,158,11,0.1))] text-xs text-[var(--amber-dark,#b45309)]">
					<AlertTriangle size={15} className="shrink-0" />
					<span>Отметьте пункты Time-Out или нажмите «1-Клик норма» для моментального подтверждения.</span>
				</div>
			)}
		</div>
	);
};

export default SurgerySafetyChecklist;
