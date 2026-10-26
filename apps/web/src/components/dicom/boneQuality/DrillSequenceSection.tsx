/**
 * DrillSequenceSection.tsx — Выбор системы имплантации, предупреждения и протокол сверления (Мандат 8b <= 120 строк).
 */

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { DrillProtocol, ImplantSystem } from "../../../utils/dicom/boneQualityEngine";

export const SYSTEMS: { value: ImplantSystem; label: string }[] = [
	{ value: "osstem", label: "Osstem (TS III / TS IV)" },
	{ value: "straumann", label: "Straumann (BLX / BLT)" },
	{ value: "nobel", label: "Nobel Biocare (Active / Parallel)" },
	{ value: "bredent", label: "Bredent (SKY / Blue Sky)" },
	{ value: "mdi", label: "MDI Mini Implants" },
];

interface DrillSequenceSectionProps {
	implantSystem: ImplantSystem;
	onSystemChange?: ((s: ImplantSystem) => void) | undefined;
	protocol: DrillProtocol;
}

export const DrillSequenceSection: React.FC<DrillSequenceSectionProps> = ({
	implantSystem,
	onSystemChange,
	protocol,
}) => {
	return (
		<>
			<div>
				<label htmlFor="bone-implant-system-select" className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
					Система имплантации
				</label>
				<select
					id="bone-implant-system-select"
					value={implantSystem}
					onChange={(e) => onSystemChange?.(e.target.value as ImplantSystem)}
					className="w-full text-xs p-1.5 min-h-[44px] rounded-md border"
					style={{ background: "var(--surface-50)", color: "var(--ink)", borderColor: "var(--line)" }}
				>
					{SYSTEMS.map((s) => (
						<option key={s.value} value={s.value}>{s.label}</option>
					))}
				</select>
			</div>

			{protocol.warnings.length > 0 && (
				<div className="space-y-1">
					{protocol.warnings.map((w) => (
						<div key={w} className="text-[11px] p-2 rounded border flex items-center gap-1.5" style={{ background: "var(--warning-soft, rgba(245, 158, 11, 0.1))", borderColor: "var(--warning-border, rgba(245, 158, 11, 0.3))", color: "var(--warning-ink, var(--ink))" }}>
							<AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--amber, #f59e0b)" }} />
							<span>{w}</span>
						</div>
					))}
				</div>
			)}

			<div>
				<div className="text-xs font-semibold mb-1.5 flex items-center justify-between" style={{ color: "var(--ink)" }}>
					<span>Протокол сверления</span>
					{protocol.underdrillingApplied && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ background: "var(--warning-soft, rgba(245, 158, 11, 0.15))", borderColor: "var(--warning-border, rgba(245, 158, 11, 0.3))", color: "var(--warning-ink, var(--ink))" }}>
							НЕДОСВЕРЛИВАНИЕ (МЯГКАЯ КОСТЬ)
						</span>
					)}
					{protocol.corticalTapRequired && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ background: "var(--danger-soft, rgba(239, 68, 68, 0.15))", borderColor: "var(--danger-border, rgba(239, 68, 68, 0.3))", color: "var(--danger-ink, var(--ink))" }}>
							МЕТЧИК (ПЛОТНЫЙ КОРТИКАЛ)
						</span>
					)}
				</div>
				<div className="space-y-1.5">
					{protocol.steps.map((step) => (
						<div key={step.step} className="flex gap-2 items-start p-2 rounded-lg" style={{ background: "var(--paper-soft)" }}>
							<div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--surface-200, var(--paper-soft))", color: "var(--ink)" }}>
								{step.step}
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-xs font-medium truncate" title={`${step.drillType} • Ø${step.diameterMm}мм × ${step.depthMm}мм`} style={{ color: "var(--ink)" }}>
									{step.drillType} • Ø{step.diameterMm}мм × {step.depthMm}мм
								</div>
								<div className="text-[11px]" style={{ color: "var(--muted)" }}>
									{step.rpmRange} RPM • {step.torqueNcm} Ncm {step.irrigation ? "• Охлаждение физраствором" : ""}
								</div>
								{step.note && (
									<div className="text-[11px] mt-0.5" style={{ color: "var(--amber, #f59e0b)" }}>
										{step.note}
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</>
	);
};
