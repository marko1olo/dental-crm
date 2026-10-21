import type React from "react";
import { ConsentCheckboxes } from "./ConsentCheckboxes";

export interface InformedConsentViewerContentProps {
	readonly patientName: string;
	readonly doctor: string;
	readonly interventionName: string;
	readonly questionsAnswered: boolean;
	readonly risksUnderstood: boolean;
	readonly withdrawUnderstood: boolean;
	readonly setQuestionsAnswered: (v: boolean) => void;
	readonly setRisksUnderstood: (v: boolean) => void;
	readonly setWithdrawUnderstood: (v: boolean) => void;
}

export const InformedConsentViewerContent: React.FC<
	InformedConsentViewerContentProps
> = ({
	patientName,
	doctor,
	interventionName,
	questionsAnswered,
	risksUnderstood,
	withdrawUnderstood,
	setQuestionsAnswered,
	setRisksUnderstood,
	setWithdrawUnderstood,
}) => {
	return (
		<>
			<div className="text-center border-b border-[var(--line)] pb-3">
				<h3 className="text-[14px] font-bold uppercase tracking-wide">
					Информированное добровольное согласие на медицинское вмешательство
				</h3>
				<p className="text-[12px] text-[var(--muted)] mt-1">
					В соответствии со ст. 20 Федерального закона № 323-ФЗ и Приказом
					Минздрава России № 1051н
				</p>
			</div>

			<div className="space-y-3 text-[12.5px] text-[var(--ink)]">
				<p>
					Я, <strong>{patientName}</strong>, даю информированное добровольное
					согласие на проведение медицинского вмешательства:{" "}
					<strong>{interventionName}</strong>.
				</p>
				<p>
					Мне в доступной форме разъяснены цели, методы оказания медицинской
					помощи, связанный с ними риск, возможные варианты медицинских
					вмешательств, их последствия, в том числе вероятность развития
					осложнений, а также предполагаемые результаты оказания медицинской
					помощи.
				</p>
				<p>
					Мне разъяснено, что я имею право отказаться от медицинского
					вмешательства или потребовать его прекращения в любой момент до начала
					процедуры.
				</p>
			</div>

			<ConsentCheckboxes
				questionsAnswered={questionsAnswered}
				risksUnderstood={risksUnderstood}
				withdrawUnderstood={withdrawUnderstood}
				setQuestionsAnswered={setQuestionsAnswered}
				setRisksUnderstood={setRisksUnderstood}
				setWithdrawUnderstood={setWithdrawUnderstood}
			/>

			<div className="pt-4 border-t border-[var(--line)] grid grid-cols-2 gap-6 text-[12px]">
				<div>
					<span className="text-[var(--muted)] block">
						Пациент (законный представитель):
					</span>
					<div className="mt-4 border-b border-[var(--ink)] pb-1 flex justify-between">
						<span>{patientName}</span>
						<span className="text-[var(--muted)] font-mono">/ подпись /</span>
					</div>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Врач:</span>
					<div className="mt-4 border-b border-[var(--ink)] pb-1 flex justify-between">
						<span>{doctor}</span>
						<span className="text-[var(--muted)] font-mono">/ подпись /</span>
					</div>
				</div>
			</div>
		</>
	);
};

InformedConsentViewerContent.displayName = "InformedConsentViewerContent";
