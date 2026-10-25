import React from "react";
import { CheckCircle2, Clock, Sparkles, Stethoscope } from "lucide-react";
import type { ClinicalVisitItem } from "./types";

interface TimelineSoapGridProps {
	visit: ClinicalVisitItem;
}

export const TimelineSoapGrid: React.FC<TimelineSoapGridProps> = ({ visit }) => {
	return (
		<div className="clinical-soap-grid">
			<div className="clinical-soap-card">
				<div className="clinical-soap-title">
					<Clock className="w-3 h-3 text-amber-500" />
					<span>Жалобы (Subjective)</span>
				</div>
				<div className="clinical-soap-body">{visit.complaints || "Активных жалоб не предъявляет."}</div>
			</div>

			<div className="clinical-soap-card">
				<div className="clinical-soap-title">
					<Stethoscope className="w-3 h-3 text-teal-500" />
					<span>Объективно (Status Localis)</span>
				</div>
				<div className="clinical-soap-body">{visit.statusLocalis || "Слизистая без воспаления, десневой край интактен."}</div>
			</div>

			<div className="clinical-soap-card md:col-span-2">
				<div className="clinical-soap-title">
					<Sparkles className="w-3 h-3 text-indigo-500" />
					<span>Протокол лечения и манипуляции (Assessment & Plan)</span>
				</div>
				<div className="clinical-soap-body font-normal">{visit.treatmentProtocol || "Проведено плановый осмотр."}</div>
			</div>

			{visit.recommendations && (
				<div className="clinical-soap-card md:col-span-2">
					<div className="clinical-soap-title">
						<CheckCircle2 className="w-3 h-3 text-emerald-500" />
						<span>Назначения и рекомендации</span>
					</div>
					<div className="clinical-soap-body">{visit.recommendations}</div>
				</div>
			)}
		</div>
	);
};
