import { Building2, FileCheck, ShieldCheck } from "lucide-react";
import React, { useState, useEffect } from "react";
import { formatOmsPolicy } from "../../../utils/inputSanitation";
import { showToast } from "../../GlobalToast";

export interface InsurancePolicySectionProps {
	readonly initialPolicy?: string | undefined;
	readonly onUpdatePolicy?: ((policy: string) => void) | undefined;
}

export const InsurancePolicySection: React.FC<InsurancePolicySectionProps> = React.memo(({
	initialPolicy,
	onUpdatePolicy,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [policy, setPolicy] = useState(initialPolicy || "");

	useEffect(() => {
		setPolicy(initialPolicy || "");
	}, [initialPolicy]);

	const handleSave = () => {
		setIsEditing(false);
		if (onUpdatePolicy) {
			onUpdatePolicy(policy);
			showToast("Полис ДМС / ОМС обновлен", "success");
		}
	};

	return (
		<div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
			<div className="flex items-center justify-between gap-1.5">
				<span className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
					<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Страховой полис</span>
				</span>
				{policy ? (
					<span className="text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
						<FileCheck size={12} />
						<span>Прикреплён</span>
					</span>
				) : (
					<span className="text-[11px] text-[var(--muted)]">Не указан</span>
				)}
			</div>

			{isEditing ? (
				<div className="flex items-center gap-1.5 mt-1">
					<input
						type="text"
						value={policy}
						onChange={(e) => setPolicy(formatOmsPolicy(e.target.value))}
						placeholder="Номер полиса ДМС / ОМС"
						className="flex-1 h-7 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						autoFocus
					/>
					<button type="button" onClick={handleSave} className="primary-button h-7 px-2 text-xs font-semibold rounded">
						OK
					</button>
					<button type="button" onClick={() => setIsEditing(false)} className="secondary-button h-7 px-1.5 text-xs rounded">
						✕
					</button>
				</div>
			) : (
				<div className="flex items-center justify-between gap-1.5 mt-0.5">
					<span className="font-mono text-xs text-[var(--ink)]">{policy || "Нет полиса ДМС / ОМС"}</span>
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="secondary-button button-sm text-xs h-7 px-2.5 rounded-lg"
					>
						{policy ? "Изменить" : "+ Добавить"}
					</button>
				</div>
			)}
			<p className="text-[11px] text-[var(--muted)] m-0 flex items-center gap-1">
				<Building2 size={11} className="shrink-0" />
				<span>Согласование услуг по гарантийным письмам страховых компаний</span>
			</p>
		</div>
	);
});

InsurancePolicySection.displayName = "InsurancePolicySection";
