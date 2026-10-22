import React from "react";
import { FileCheck, Tag } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";

export interface ProtocolStatusLocalisAndDiagnosisProps {
	readonly statusLocalis: string;
	readonly diagnosisIcd10: string;
	readonly recommendations: string;
	readonly onChangeStatusLocalis: (val: string) => void;
	readonly onChangeDiagnosisIcd10: (val: string) => void;
	readonly onChangeRecommendations: (val: string) => void;
}

export const ProtocolStatusLocalisAndDiagnosis: React.FC<ProtocolStatusLocalisAndDiagnosisProps> = ({
	statusLocalis,
	diagnosisIcd10,
	recommendations,
	onChangeStatusLocalis,
	onChangeDiagnosisIcd10,
	onChangeRecommendations,
}) => {
	return (
		<>
			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<ToothMolar className="w-3.5 h-3.5 text-teal-500" />
					<span>Осмотр и зубная формула:</span>
				</label>
				<textarea
					rows={4}
					value={statusLocalis}
					onChange={(e) => onChangeStatusLocalis(e.target.value)}
					className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
					placeholder="Слизистая оболочка, зондирование кариозной полости, термопроба, перкуссия..."
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Tag className="w-3.5 h-3.5 text-indigo-500" />
					<span>Клинический диагноз:</span>
				</label>
				<input
					type="text"
					value={diagnosisIcd10}
					onChange={(e) => onChangeDiagnosisIcd10(e.target.value)}
					className="w-full h-9 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all"
					placeholder="Например: K02.1 Кариес дентина зуба 16"
				/>

				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 mt-2">
					<FileCheck className="w-3.5 h-3.5 text-emerald-500" />
					<span>Рекомендации и назначения:</span>
				</label>
				<textarea
					rows={2}
					value={recommendations}
					onChange={(e) => onChangeRecommendations(e.target.value)}
					className="w-full p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
					placeholder="Ограничения в пище, гигиена, контрольный осмотр..."
				/>
			</div>
		</>
	);
};
