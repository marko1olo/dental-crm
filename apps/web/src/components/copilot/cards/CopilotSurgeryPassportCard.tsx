/**
 * @file CopilotSurgeryPassportCard.tsx
 * @description Generative UI Action Card for Chairside Surgery & Implant Passports.
 * Mandate 8b: <= 160 lines, exactly 1 Primary CTA, osteointegration timers (Mandate 8n).
 */

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, FileSignature, Gauge, Layers, ShieldCheck } from "lucide-react";

export interface CopilotSurgeryPassportData {
	toothNumber: number | string;
	procedureName: string;
	implantSystem?: string | undefined;
	implantSize?: string | undefined;
	torqueNcm?: number | undefined;
	isqIndex?: number | undefined;
	membrane?: string | undefined;
	boneGraft?: string | undefined;
	lotNumber?: string | undefined;
	osteointegrationMonths?: number | undefined;
	isApplied?: boolean | undefined;
}

export interface CopilotSurgeryPassportCardProps {
	data: CopilotSurgeryPassportData;
	onApplySurgeryProtocol?: (passport: CopilotSurgeryPassportData) => void;
}

export const CopilotSurgeryPassportCard: React.FC<CopilotSurgeryPassportCardProps> = ({
	data,
	onApplySurgeryProtocol,
}) => {
	const [applied, setApplied] = useState(Boolean(data.isApplied));
	const toothNum = Number(data.toothNumber);
	const isMandible = toothNum >= 31 && toothNum <= 48;
	const osteoMonths = data.osteointegrationMonths || (isMandible ? 3 : 5);

	const handleApply = () => {
		setApplied(true);
		if (onApplySurgeryProtocol) {
			onApplySurgeryProtocol(data);
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:open-surgery-hub", {
					detail: {
						tooth: data.toothNumber,
						procedure: data.procedureName,
						implantSystem: data.implantSystem,
						implantSize: data.implantSize,
						torque: data.torqueNcm,
						isq: data.isqIndex,
					},
				}),
			);
		}
	};

	return (
		<div
			className={`p-3.5 rounded-xl border transition-all text-xs shadow-xs ${
				applied
					? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20"
					: "border-[var(--teal,#0d9488)]/30 bg-[var(--paper)]"
			}`}
			data-testid="copilot-surgery-passport-card"
		>
			<div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)]/25 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
						<FileSignature size={13} />
					</div>
					<div>
						<div className="font-bold text-[var(--ink)] leading-tight flex items-center gap-1.5">
							<span>Хирургия: Зуб {data.toothNumber}</span>
							<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
								{isMandible ? "Н/Ч" : "В/Ч"}
							</span>
						</div>
						<div className="text-[10px] text-[var(--muted)]">{data.procedureName}</div>
					</div>
				</div>
				<span
					className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
						applied
							? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
							: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)]"
					}`}
				>
					{applied ? <CheckCircle2 size={11} /> : <Clock size={11} />}
					<span>{applied ? "В протоколе" : `Таймер: ${osteoMonths} мес`}</span>
				</span>
			</div>

			<div className="py-2 grid grid-cols-2 gap-2 border-b border-[var(--line)] text-[11px]">
				<div>
					<span className="text-[10px] text-[var(--muted)] block">Имплант</span>
					<span className="font-semibold text-[var(--ink)]">
						{data.implantSystem || "Nobel / Straumann"} {data.implantSize || "4.0x10 мм"}
					</span>
				</div>
				<div>
					<span className="text-[10px] text-[var(--muted)] block">Торк / Стабильность</span>
					<span className="font-semibold text-[var(--ink)] flex items-center gap-1">
						<Gauge size={11} className="text-[var(--teal,#0d9488)]" />
						<span>{data.torqueNcm || 40} Н·см • ISQ {data.isqIndex || 75}</span>
					</span>
				</div>
				{data.boneGraft && (
					<div className="col-span-2 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
						<Layers size={11} className="text-[var(--teal,#0d9488)]" />
						<span>Костная пластика: {data.boneGraft} {data.lotNumber ? `(Партия: ${data.lotNumber})` : ""}</span>
					</div>
				)}
			</div>

			<div className="pt-2.5 flex items-center justify-between gap-2">
				<div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
					<ShieldCheck size={11} className="text-emerald-600" />
					<span>Списание со склада в фоне (Soft Stock)</span>
				</div>
				<button
					type="button"
					onClick={handleApply}
					className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-95 cursor-pointer"
					data-testid="copilot-apply-surgery-primary-btn"
				>
					<span>{applied ? "Открыть протокол" : "Внести в протокол"}</span>
					<ArrowRight size={13} />
				</button>
			</div>
		</div>
	);
};
