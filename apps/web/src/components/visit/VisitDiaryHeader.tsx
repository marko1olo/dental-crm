import { Activity, Clock, Lock, Printer, ShieldCheck } from "lucide-react";
import React from "react";
import { VisitDiaryTemplateSelector } from "../VisitDiaryTemplateSelector";

export interface VisitDiaryHeaderProps {
	lastSavedAt: Date | null;
	revisionCount: number;
	isLocked: boolean;
	setShowPreview: (show: boolean) => void;
	setDiary: React.Dispatch<React.SetStateAction<any>>;
	setIcdSearch: (search: string) => void;
}

export const VisitDiaryHeader: React.FC<VisitDiaryHeaderProps> = ({
	lastSavedAt,
	revisionCount,
	isLocked,
	setShowPreview,
	setDiary,
	setIcdSearch,
}) => {
	return (
		<div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div className="flex items-center gap-3">
				<div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
					<Activity className="w-5 h-5 text-emerald-400" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-zinc-100">
						Клинический дневник SOAP
					</h2>
					<div className="flex items-center gap-2 text-xs text-zinc-500">
						{lastSavedAt && (
							<span className="flex items-center gap-1">
								<Clock className="w-3 h-3" />
								Сохранено{" "}
								{lastSavedAt.toLocaleTimeString("ru-RU", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						)}
						{revisionCount > 0 && (
							<span className="text-orange-400 flex items-center gap-1">
								<ShieldCheck className="w-3 h-3" />
								{revisionCount} ревиз.
							</span>
						)}
					</div>
				</div>
			</div>

			{isLocked ? (
				<div className="flex items-center gap-2 flex-shrink-0">
					<button
						id="diary-print-btn"
						onClick={() => setShowPreview(true)}
						className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm border border-zinc-700"
					>
						<Printer className="w-4 h-4" /> Печать 043/у
					</button>
					<span className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-bold">
						<Lock className="w-4 h-4" /> ПОДПИСАНО
					</span>
				</div>
			) : (
				<VisitDiaryTemplateSelector
					isLocked={isLocked}
					onSelectTemplate={(tmpl: any) => {
						setDiary((prev: any) => ({
							...prev,
							anamnesis: tmpl.prefilledAnamnesis || prev.anamnesis,
							statusLocalis: tmpl.prefilledObjective || prev.statusLocalis,
							treatmentDescription:
								tmpl.prefilledTreatment || prev.treatmentDescription,
							diagnosisIcd10: tmpl.defaultIcd10 || prev.diagnosisIcd10,
						}));
						if (tmpl.defaultIcd10) {
							setIcdSearch(tmpl.defaultIcd10);
						}
					}}
				/>
			)}
		</div>
	);
};
