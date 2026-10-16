import React, { useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, UserCheck, Clock, ShieldAlert, X } from "lucide-react";
import {
	computePatientSentiment,
	type PatientSentimentType,
	type PatientSentimentInfo,
} from "./patientSentimentComputation";

export { computePatientSentiment, type PatientSentimentType, type PatientSentimentInfo };

export interface PatientSentimentBadgeProps {
	patientId?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: flexible patient record
	patient?: any | null | undefined;
	ltvRub?: number | null | undefined;
	complianceScore?: number | null | undefined;
	sentiment?: PatientSentimentType | null | undefined;
	variant?: "compact" | "pill" | "detailed" | "card" | undefined;
	showLtv?: boolean | undefined;
	showCompliance?: boolean | undefined;
	interactive?: boolean | undefined;
	className?: string | undefined;
	onClick?: (() => void) | undefined;
}

export const PatientSentimentBadge: React.FC<PatientSentimentBadgeProps> = ({
	patient,
	ltvRub,
	complianceScore,
	sentiment,
	showLtv = true,
	className = "",
	onClick,
}) => {
	const info = useMemo(() => computePatientSentiment(patient, { sentiment, ltvRub, complianceScore }), [patient, sentiment, ltvRub, complianceScore]);
	const [isOpen, setIsOpen] = useState(false);
	const popoverId = useId();
	const btnRef = useRef<HTMLButtonElement | null>(null);

	const formattedLtv = info.calculatedLtvRub > 0 ? `${info.calculatedLtvRub.toLocaleString("ru-RU")} ₽` : "";

	return (
		<div className={`inline-flex items-center shrink-0 ${className}`} data-testid="patient-sentiment-badge-root">
			<button
				ref={btnRef}
				type="button"
				onClick={(e) => {
					if (onClick) { onClick(); return; }
					e.stopPropagation();
					setIsOpen((v) => !v);
				}}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1.5 text-xs select-none"
				data-testid={`sentiment-badge-${info.type}`}
				title={`${info.label} • ${info.shortLabel}`}
			>
				{info.type === "loyal_vip" && <Crown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
				{info.type === "cancellation_risk" && <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
				{info.type === "strict_ids_required" && <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
				{info.type === "standard" && <UserCheck className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />}
				<span>{info.shortLabel}</span>
				{showLtv && formattedLtv && <span className="font-mono text-[10px] opacity-75">{formattedLtv}</span>}
			</button>

			{isOpen && typeof document !== "undefined" && createPortal(
				<>
					<div className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-2xs" onClick={() => setIsOpen(false)} aria-hidden="true" />
					<div
						id={popoverId}
						role="dialog"
						className="fixed z-[9999] top-1/3 left-1/2 -translate-x-1/2 w-80 p-4 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xl space-y-3"
						onClick={(e) => e.stopPropagation()}
						data-testid="patient-sentiment-popover"
					>
						<div className="flex items-center justify-between pb-2 border-b border-[var(--line-subtle)]">
							<div className="font-bold text-sm">{info.label}</div>
							<button type="button" onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-[var(--paper-soft)] text-[var(--muted)]" aria-label="Закрыть">
								<X size={16} />
							</button>
						</div>
						<p className="text-xs text-[var(--muted)] leading-relaxed m-0">{info.description}</p>
						<div className="text-xs font-medium text-[var(--teal)] bg-[var(--paper-soft)] p-2 rounded-lg">{info.clinicalDirective}</div>
					</div>
				</>,
				document.body
			)}
		</div>
	);
};

export default PatientSentimentBadge;
