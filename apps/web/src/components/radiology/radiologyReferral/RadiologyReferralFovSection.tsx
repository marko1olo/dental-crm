import React from "react";
import { Activity, Check, Sparkles } from "lucide-react";
import {
	CLINICAL_EXPRESS_PRESETS,
	type ClinicalExpressPreset,
} from "../radiologyReferralPrintTemplate.js";
import {
	CBCT_SCAN_FOV_PROTOCOLS,
	type CbctScanFovProtocol,
} from "../radiologyProtocols.js";

export interface RadiologyReferralFovSectionProps {
	selectedFovId: string;
	currentFov: CbctScanFovProtocol;
	estimatedDose: { badgeClass: string };
	onApplyExpressPreset: (preset: ClinicalExpressPreset) => void;
	onSelectFov: (fov: CbctScanFovProtocol) => void;
}

export function RadiologyReferralFovSection({
	selectedFovId, currentFov, estimatedDose,
	onApplyExpressPreset, onSelectFov,
}: RadiologyReferralFovSectionProps) {
	return (
		<>
			{/* 0. Fast 1-Click Clinical Express Presets */}
			<div className="p-3 rounded-2xl bg-[var(--teal-surface)]/40 border border-[var(--teal-soft)]">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--teal)] mb-2">
					<Sparkles className="w-4 h-4" />
					<span>Быстрые клинические пресеты:</span>
				</div>
				<div className="dente-filter-chips" data-testid="referral-express-presets">
					{CLINICAL_EXPRESS_PRESETS.map((preset) => (
						<button
							key={preset.label}
							type="button"
							onClick={() => onApplyExpressPreset(preset)}
							className="dente-filter-chip hover:border-[var(--teal)] hover:text-[var(--ink)] cursor-pointer"
						>
							{preset.label}
						</button>
					))}
				</div>
			</div>

			{/* 1. Clinical Scanning Zone / FOV Selection */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
						1. Зона сканирования (FOV):
					</span>
					<div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${estimatedDose.badgeClass}`}>
						<Activity className="w-3.5 h-3.5" />
						<span>Доза: ~{currentFov.typicalDoseMicrosv} мкЗв</span>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{CBCT_SCAN_FOV_PROTOCOLS.map((fov) => {
						const isSelected = selectedFovId === fov.id;
						return (
							<button
								key={fov.id}
								type="button"
								onClick={() => onSelectFov(fov)}
								className={`flex flex-col p-3 rounded-2xl border text-left transition-all min-h-[44px] cursor-pointer ${
									isSelected
										? "bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--teal-soft)]"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`referral-fov-${fov.code}`}
							>
								<div className="flex items-center justify-between w-full mb-1">
									<span className="text-xs font-bold text-[var(--ink)]">{fov.badge}</span>
									<div className={`flex items-center justify-center w-5 h-5 rounded-md border ${isSelected ? "bg-[var(--teal)] border-[var(--teal)] text-white" : "border-[var(--line)]"}`}>
										{isSelected && <Check className="w-3.5 h-3.5" />}
									</div>
								</div>
								<span className="text-xs font-semibold text-[var(--ink)] mb-0.5 line-clamp-1">{fov.titleRu}</span>
								<span className="text-xs text-[var(--muted)] leading-tight line-clamp-2">{fov.description}</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}
