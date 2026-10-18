import React from "react";
import { Building2 } from "lucide-react";
import {
	CBCT_DIAGNOSTIC_GOALS, CBCT_REFERRAL_PARTNERS,
	type CbctDiagnosticGoal, type CbctDiagnosticGoalId, type CbctScanFovProtocol,
} from "../radiologyProtocols.js";

export interface RadiologyReferralGoalPartnerSectionProps {
	selectedGoalId: CbctDiagnosticGoalId; selectedPartnerId: string; diagnosisIcd10: string;
	referralNumber: string; isPregnancyExcluded: boolean; hasMetallicArtifacts: boolean;
	isTmjOpenClosedProtocol: boolean; currentFov: CbctScanFovProtocol;
	onSelectGoal: (goal: CbctDiagnosticGoal) => void; onSelectPartnerId: (id: string) => void;
	onChangeDiagnosisIcd10: (val: string) => void; onChangeReferralNumber: (val: string) => void;
	onChangePregnancy: (val: boolean) => void; onChangeMetallic: (val: boolean) => void;
	onChangeTmjProtocol: (val: boolean) => void;
}

export function RadiologyReferralGoalPartnerSection({
	selectedGoalId, selectedPartnerId, diagnosisIcd10, referralNumber,
	isPregnancyExcluded, hasMetallicArtifacts, isTmjOpenClosedProtocol, currentFov,
	onSelectGoal, onSelectPartnerId, onChangeDiagnosisIcd10, onChangeReferralNumber,
	onChangePregnancy, onChangeMetallic, onChangeTmjProtocol,
}: RadiologyReferralGoalPartnerSectionProps) {
	return (
		<>
			{/* 2. Clinical Goal Selection */}
			<div>
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
					2. Клиническая цель исследования:
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{CBCT_DIAGNOSTIC_GOALS.map((goal) => {
						const isSelected = selectedGoalId === goal.id;
						return (
							<button
								key={goal.id}
								type="button"
								onClick={() => onSelectGoal(goal)}
								className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
									isSelected ? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-sm" : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`referral-goal-${goal.id}`}
							>
								<div className="text-xs font-bold line-clamp-1">{goal.titleRu}</div>
								<div className="text-xs text-[var(--muted)] line-clamp-1 font-medium">{goal.shortBadge}</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 3. Destination Diagnostic Center / Partner */}
			<div>
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
					3. Рентген-центр назначения:
				</span>
				<div className="grid grid-cols-2 gap-2">
					{CBCT_REFERRAL_PARTNERS.map((partner) => {
						const isSelected = selectedPartnerId === partner.id;
						return (
							<button
								key={partner.id}
								type="button"
								onClick={() => onSelectPartnerId(partner.id)}
								className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
									isSelected ? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] font-bold shadow-sm" : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`referral-partner-${partner.id}`}
							>
								<Building2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-[var(--teal)]" : "text-[var(--muted)]"}`} />
								<div className="min-w-0">
									<div className="text-xs font-bold truncate">{partner.nameRu}</div>
									<div className="text-xs text-[var(--muted)] truncate font-medium">{partner.integrationNote}</div>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 5. ICD-10 & Numbers */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<label htmlFor="diagnosis-icd10-input" className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block">Диагноз (МКБ-10):</label>
					<input id="diagnosis-icd10-input" type="text" value={diagnosisIcd10} onChange={(e) => onChangeDiagnosisIcd10(e.target.value)} className="w-full px-3 h-9 text-xs font-mono font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]" />
				</div>
				<div>
					<label htmlFor="referral-number-input" className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block">Номер направления:</label>
					<input id="referral-number-input" type="text" value={referralNumber} onChange={(e) => onChangeReferralNumber(e.target.value)} className="w-full px-3 h-9 text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]" />
				</div>
			</div>

			{/* Safety Checkboxes */}
			<div className="flex flex-wrap items-center gap-4 text-xs text-[var(--ink)]">
				<label className="flex items-center gap-1.5 cursor-pointer">
					<input type="checkbox" checked={isPregnancyExcluded} onChange={(e) => onChangePregnancy(e.target.checked)} className="rounded text-[var(--teal)] focus:ring-0" />
					<span>Беременность исключена</span>
				</label>
				<label className="flex items-center gap-1.5 cursor-pointer">
					<input type="checkbox" checked={hasMetallicArtifacts} onChange={(e) => onChangeMetallic(e.target.checked)} className="rounded text-[var(--teal)] focus:ring-0" />
					<span>Металлоконструкции в полости рта</span>
				</label>
				{currentFov.isDualPhase && (
					<label className="flex items-center gap-1.5 cursor-pointer font-bold text-[var(--teal)]">
						<input type="checkbox" checked={isTmjOpenClosedProtocol} onChange={(e) => onChangeTmjProtocol(e.target.checked)} className="rounded text-[var(--teal)] focus:ring-0" />
						<span>Протокол: Закрытый + Открытый рот</span>
					</label>
				)}
			</div>
		</>
	);
}
