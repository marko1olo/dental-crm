import React, { useState } from "react";
import { Check } from "lucide-react";
import type { StandardImplantationParams } from "../../../surgery/surgeryCatalogData";

export interface ImplantSystemSelectorProps {
	readonly implantBrand: string;
	readonly setImplantBrand: (b: string) => void;
	readonly onApplyPreset: (overrides?: Partial<StandardImplantationParams>) => void;
}

const EXTENDED_SYSTEMS = [
	{ id: "korean_conical_sla", brand: "Корейская конусная система 11° SLA", model: "SLA" },
	{ id: "premium_active_cone", brand: "Премиальная конусная система активного типа", model: "Active" },
	{ id: "cortical_microthread", brand: "Кортикальная система с микрорезьбой", model: "Microthread" },
	{ id: "conical_platform_switch", brand: "Система с конусным переключением платформ", model: "Platform Switch" },
] as const;

export const ImplantSystemSelector: React.FC<ImplantSystemSelectorProps> = ({
	implantBrand,
	setImplantBrand,
	onApplyPreset,
}) => {
	const [isCustomBrandOpen, setIsCustomBrandOpen] = useState(false);
	const [customBrandName, setCustomBrandName] = useState("");

	const handleCustomBrandSubmit = () => {
		const trimmed = customBrandName.trim();
		if (!trimmed) return;
		setImplantBrand(trimmed);
		onApplyPreset({ brand: trimmed, model: "Custom" });
		setIsCustomBrandOpen(false);
	};

	return (
		<div className="space-y-1" data-testid="implant-system-section">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted)]">Система:</span>
				<button
					type="button"
					onClick={() => setIsCustomBrandOpen(!isCustomBrandOpen)}
					className="text-[10px] text-[var(--primary)] font-bold hover:underline cursor-pointer"
					data-testid="btn-toggle-custom-brand"
				>
					{isCustomBrandOpen ? "Закрыть" : "+ Своя система"}
				</button>
			</div>

			{isCustomBrandOpen ? (
				<div className="flex items-center gap-1">
					<input
						type="text"
						value={customBrandName}
						onChange={(e) => setCustomBrandName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCustomBrandSubmit()}
						placeholder="Название системы..."
						className="min-h-[38px] px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] flex-1"
						data-testid="input-custom-brand-name"
					/>
					<button
						type="button"
						onClick={handleCustomBrandSubmit}
						className="min-h-[38px] px-2.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-xs font-bold shrink-0 cursor-pointer"
						data-testid="btn-apply-custom-brand"
					>
						<Check size={14} />
					</button>
				</div>
			) : (
				<div className="flex items-center gap-1 flex-wrap">
					{EXTENDED_SYSTEMS.map((s) => (
						<button
							key={s.id}
							type="button"
							onClick={() => onApplyPreset({ brand: s.brand, model: s.model })}
							className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								implantBrand === s.brand || implantBrand === s.id
									? "bg-[var(--primary)] text-white"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)]"
							}`}
							data-testid={`btn-implant-system-${s.id}`}
						>
							{s.brand}
						</button>
					))}
				</div>
			)}
		</div>
	);
};
