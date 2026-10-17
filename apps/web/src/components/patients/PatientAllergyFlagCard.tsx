import React from "react";
import {
	Activity,
	AlertOctagon,
	Baby,
	HeartPulse,
	Pill,
	ShieldAlert,
	Syringe,
	ZapOff,
} from "lucide-react";
import type { EvaluatedSafetyFlag } from "./safetyMath";

export const PatientAllergyFlagCard: React.FC<{ flag: EvaluatedSafetyFlag }> = ({ flag }) => (
	<div className={`safety-flag-card ${flag.severity === "critical" ? "safety-flag-card--critical" : "safety-flag-card--high"}`}>
		<div className="safety-flag-card__header">
			<div className="safety-flag-card__title">
				{flag.id.includes("pacemaker") && <ZapOff className="w-4 h-4 text-rose-600" />}
				{flag.id.includes("bisphosphonate") && <ShieldAlert className="w-4 h-4 text-rose-600" />}
				{flag.id.includes("anticoagulant") && <Pill className="w-4 h-4 text-rose-600" />}
				{flag.id.includes("pregnancy") && <Baby className="w-4 h-4 text-pink-500" />}
				{flag.id.includes("hypertension") && <HeartPulse className="w-4 h-4 text-amber-600" />}
				{flag.id.includes("asthma") && <Activity className="w-4 h-4 text-amber-600" />}
				{flag.id.includes("nsaid") && <ShieldAlert className="w-4 h-4 text-rose-600" />}
				{flag.id.includes("penicillin") && <Pill className="w-4 h-4 text-amber-600" />}
				{flag.id.includes("latex") && <AlertOctagon className="w-4 h-4 text-amber-600" />}
				<span>{flag.titleRu}</span>
			</div>
			<span className={`safety-flag-card__badge ${flag.severity === "critical" ? "safety-flag-card__badge--critical" : "safety-flag-card__badge--high"}`}>
				{flag.severity === "critical" ? "Стоп-фактор" : "Внимание"}
			</span>
		</div>

		<div className="safety-flag-card__body">{flag.description}</div>

		{flag.forbiddenProcedures.length > 0 && (
			<div className="safety-flag-card__section">
				<div className="safety-flag-card__section-title safety-flag-card__section-title--forbidden inline-flex items-center gap-1.5">
					<AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
					<span>Категорически противопоказано:</span>
				</div>
				<ul className="safety-flag-card__list">
					{flag.forbiddenProcedures.map((proc, i) => (
						<li key={`${flag.id}-proc-${i}`}>{proc}</li>
					))}
				</ul>
			</div>
		)}

		{flag.mandatoryPrecautions.length > 0 && (
			<div className="safety-flag-card__section">
				<div className="safety-flag-card__section-title safety-flag-card__section-title--precautions inline-flex items-center gap-1.5">
					<ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
					<span>Обязательный протокол ведения:</span>
				</div>
				<ul className="safety-flag-card__list">
					{flag.mandatoryPrecautions.map((prec, i) => (
						<li key={`${flag.id}-prec-${i}`}>{prec}</li>
					))}
				</ul>
			</div>
		)}

		{flag.recommendedAnesthesiaNotes && (
			<div className="safety-flag-card__anesthesia-badge inline-flex items-center gap-1.5">
				<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
				<span>Обезболивание: {flag.recommendedAnesthesiaNotes}</span>
			</div>
		)}
	</div>
);
