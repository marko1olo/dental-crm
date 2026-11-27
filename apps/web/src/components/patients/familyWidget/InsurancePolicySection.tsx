import { Building2, FileCheck, ShieldCheck } from "lucide-react";
import React, { useState, useEffect } from "react";
import { formatDmsPolicy } from "../../../utils/inputSanitation";
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
		const cleanPolicy = policy.trim();
		setPolicy(cleanPolicy);
		if (onUpdatePolicy) {
			onUpdatePolicy(cleanPolicy);
			showToast("Полис ДМС / ОМС обновлен", "success");
		}
	};

	return (
		<div className="flex flex-col gap-2 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] min-w-0">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)] whitespace-nowrap">
					<ShieldCheck size={14} className="text-[var(--primary)] shrink-0" />
					<span>Страховой полис</span>
				</span>
				{policy ? (
					<span className="text-[11px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
						<FileCheck size={12} className="shrink-0" />
						<span>Прикреплён</span>
					</span>
				) : (
					<span className="text-[11px] text-[var(--muted)] whitespace-nowrap">Не указан</span>
				)}
			</div>

			{isEditing ? (
				<div className="flex items-center gap-1.5 mt-1 min-w-0">
					<input
						type="text"
						value={policy}
						onChange={(e) => setPolicy(formatDmsPolicy(e.target.value))}
						placeholder="Номер полиса ДМС / ОМС"
						className="flex-1 min-w-0 h-11 sm:h-9 px-2.5 text-sm sm:text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						autoFocus
					/>
					<button type="button" onClick={handleSave} className="primary-button h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3 text-xs font-semibold rounded-lg shrink-0">
						OK
					</button>
					<button type="button" onClick={() => setIsEditing(false)} className="secondary-button h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-2.5 text-xs rounded-lg shrink-0">
						✕
					</button>
				</div>
			) : (
				<div className="flex flex-wrap items-center justify-between gap-2 mt-0.5">
					<span className="font-mono text-xs text-[var(--ink)] min-w-0 break-all">{policy || "Нет полиса ДМС / ОМС"}</span>
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="secondary-button text-xs min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-lg whitespace-nowrap shrink-0"
					>
						{policy ? "Изменить" : "Добавить"}
					</button>
				</div>
			)}
			<p className="text-[11px] text-[var(--muted)] m-0 mt-auto flex items-start gap-1.5 leading-relaxed">
				<Building2 size={12} className="shrink-0 mt-0.5" />
				<span>Согласование услуг по гарантийным письмам страховых компаний</span>
			</p>
		</div>
	);
});

InsurancePolicySection.displayName = "InsurancePolicySection";
