import type React from "react";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";
import { RecallPatientRowCard } from "./RecallPatientRowCard";

export interface RecallDispensaryFunnelProps {
	readonly candidates: readonly PatientRecallRecord[];
	readonly activeScriptCandidateId: string | null;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const RecallDispensaryFunnel: React.FC<RecallDispensaryFunnelProps> = ({
	candidates,
	activeScriptCandidateId,
	onBook,
	onToggleScript,
	onWhatsApp,
	onTelegram,
	onCopySms,
	onStatusUpdate,
}) => {
	const hygieneCandidates = candidates.filter((c) => c.cycleType === "standard_prophylaxis");
	const implantCandidates = candidates.filter(
		(c) => c.cycleType === "implant_monitoring" || c.cycleType === "prosthetic_check",
	);
	const customCandidates = candidates.filter(
		(c) =>
			c.cycleType !== "standard_prophylaxis" &&
			c.cycleType !== "implant_monitoring" &&
			c.cycleType !== "prosthetic_check",
	);

	const renderStage = (
		title: string,
		icon: React.ReactNode,
		stageCandidates: readonly PatientRecallRecord[],
		subtext: string,
	) => (
		<section className="recall-funnel-stage" aria-label={title}>
			<div className="recall-funnel-stage__header">
				<div className="recall-funnel-stage__icon">{icon}</div>
				<div>
					<h3 className="recall-funnel-stage__title">{title}</h3>
					<span className="recall-funnel-stage__count">
						{stageCandidates.length} пациентов • {subtext}
					</span>
				</div>
			</div>
			<div className="recall-funnel-stage__cards">
				{stageCandidates.length === 0 ? (
					<div className="recall-funnel-stage__empty">Нет пациентов в этом цикле</div>
				) : (
					stageCandidates.map((candidate) => (
						<RecallPatientRowCard
							key={candidate.id}
							candidate={candidate}
							isScriptActive={activeScriptCandidateId === candidate.id}
							onBook={onBook}
							onToggleScript={onToggleScript}
							onWhatsApp={onWhatsApp}
							onTelegram={onTelegram}
							onCopySms={onCopySms}
							onStatusUpdate={onStatusUpdate}
						/>
					))
				)}
			</div>
		</section>
	);

	return (
		<div className="recall-funnel-grid" data-testid="recall-dispensary-funnel">
			{renderStage(
				"Профгигиена и терапия (6 мес)",
				<ShieldCheck size={18} />,
				hygieneCandidates,
				"Базовый цикл сохранения зубов",
			)}
			{renderStage(
				"Контроль имплантов и ортопедии (12 мес)",
				<Sparkles size={18} />,
				implantCandidates,
				"Ежегодный рентген и гарантия",
			)}
			{renderStage(
				"Индивидуальный клинический срок",
				<Clock size={18} />,
				customCandidates,
				"Брекеты, детство, пародонтология",
			)}
		</div>
	);
};
