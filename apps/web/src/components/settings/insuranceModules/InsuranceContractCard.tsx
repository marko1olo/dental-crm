/**
 * apps/web/src/components/settings/insuranceModules/InsuranceContractCard.tsx
 *
 * Card component for single Insurance Contract with coverage grid and touch-friendly controls.
 * Compliant with Mandates 8b, 8d, and Apple HIG touch guidelines (>= 36px/44px).
 */

import { Edit2, FileCheck2, Trash2 } from "lucide-react";
import type React from "react";
import type {
	GuaranteeLetterSummary,
	InsuranceContract,
} from "./insuranceContractsTypes";

interface InsuranceContractCardProps {
	contract: InsuranceContract;
	guaranteeLetters: GuaranteeLetterSummary[];
	onEdit: (contract: InsuranceContract) => void;
	onDeactivate: (contract: InsuranceContract) => void;
}

export const InsuranceContractCard: React.FC<InsuranceContractCardProps> = ({
	contract,
	guaranteeLetters,
	onEdit,
	onDeactivate,
}) => {
	const franchiseVal = contract.patientFranchisePct ?? 0;
	const attachedLetters = guaranteeLetters.filter(
		(l) =>
			l.contractId === contract.id ||
			l.insurerName.toLowerCase() === contract.companyName.toLowerCase(),
	);

	const coverageCategories = [
		{ label: "Терапия", val: contract.coverageTherapyPct },
		{ label: "Хирургия", val: contract.coverageSurgeryPct },
		{ label: "Ортопедия", val: contract.coverageOrthoPct },
		{ label: "Профгигиена", val: contract.coverageHygienePct },
	];

	return (
		<div
			className="rounded-xl p-4 flex flex-col justify-between gap-3 border shadow-xs"
			style={{
				borderColor: "var(--line)",
				background: "var(--surface)",
				color: "var(--ink)",
			}}
			data-testid={`insurance-contract-card-${contract.id}`}
		>
			<div className="flex justify-between items-start gap-2">
				<div className="min-w-0">
					<h3
						className="m-0 text-sm font-bold truncate"
						style={{ color: "var(--ink)" }}
					>
						{contract.companyName}
					</h3>
					<div className="flex items-center gap-1.5 flex-wrap mt-1.5">
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold border"
							style={{
								background: "var(--paper-soft)",
								borderColor: "var(--line)",
								color: "var(--ink)",
							}}
						>
							{franchiseVal > 0
								? `Франшиза ${franchiseVal}%`
								: "Франшиза 0% (100% ДМС)"}
						</span>
						{contract.requiresGuaranteeLetter !== false && (
							<span
								className="px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1"
								style={{
									background: "var(--paper-soft)",
									borderColor: "var(--line)",
									color: "var(--muted)",
								}}
							>
								<FileCheck2 size={11} />
								<span>ГП обязательно</span>
							</span>
						)}
						{attachedLetters.length > 0 && (
							<span
								className="px-2 py-0.5 rounded text-[11px] font-semibold border"
								style={{
									background: "var(--paper-soft)",
									borderColor: "var(--line)",
									color: "var(--teal, #0d9488)",
								}}
							>
								Активных ГП: {attachedLetters.length}
							</span>
						)}
					</div>
					<div className="flex items-center gap-3 flex-wrap mt-1.5">
						{contract.policyNumberMask && (
							<p className="m-0 text-[11px]" style={{ color: "var(--muted)" }}>
								Маска: {contract.policyNumberMask}
							</p>
						)}
						{contract.annualLimitRub != null && (
							<p className="m-0 text-[11px]" style={{ color: "var(--muted)" }}>
								Лимит:{" "}
								<strong style={{ color: "var(--ink)" }}>
									{contract.annualLimitRub.toLocaleString("ru-RU")} ₽
								</strong>
							</p>
						)}
					</div>
				</div>
				<div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
					<button
						type="button"
						onClick={() => onEdit(contract)}
						data-testid={`btn-edit-contract-${contract.id}`}
						style={{
							background: "var(--paper-soft)",
							color: "var(--muted)",
							border: "1px solid var(--line)",
							width: 36,
							height: 36,
							minWidth: 36,
							minHeight: 36,
							borderRadius: 8,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title="Редактировать договор"
						aria-label={`Редактировать договор ${contract.companyName}`}
					>
						<Edit2 size={15} />
					</button>
					<button
						type="button"
						onClick={() => onDeactivate(contract)}
						data-testid={`btn-deactivate-contract-${contract.id}`}
						style={{
							background: "var(--paper-soft)",
							color: "var(--muted)",
							border: "1px solid var(--line)",
							width: 36,
							height: 36,
							minWidth: 36,
							minHeight: 36,
							borderRadius: 8,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title="Убрать из работы"
						aria-label={`Убрать из работы договор ${contract.companyName}`}
					>
						<Trash2 size={15} />
					</button>
				</div>
			</div>

			{/* Coverage grid */}
			<div className="grid grid-cols-2 gap-2">
				{coverageCategories.map(({ label, val }) => (
					<div
						key={label}
						className="rounded-lg p-2.5 border"
						style={{
							background: "var(--paper-soft)",
							borderColor: "var(--line)",
						}}
					>
						<div className="flex items-center justify-between gap-1">
							<span
								className="text-[11px]"
								style={{ color: "var(--muted)" }}
							>
								{label}
							</span>
							<span
								className="text-sm font-bold"
								style={{
									color: val > 0 ? "var(--teal, #0d9488)" : "var(--muted)",
								}}
							>
								{val}%
							</span>
						</div>
						{/* Visual bar */}
						<div
							className="h-1 rounded mt-1.5 overflow-hidden"
							style={{ background: "var(--line)" }}
						>
							<div
								className="h-full rounded transition-all duration-300"
								style={{
									width: `${val}%`,
									background: val > 0 ? "var(--teal, #0d9488)" : "transparent",
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
