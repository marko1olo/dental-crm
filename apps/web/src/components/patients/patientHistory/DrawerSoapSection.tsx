import React from "react";
import { CheckCircle2, Clock, Sparkles, Stethoscope, User } from "lucide-react";
import type { ClinicalVisitItem } from "./types";

interface DrawerSoapSectionProps {
	visit: ClinicalVisitItem;
}

export const DrawerSoapSection: React.FC<DrawerSoapSectionProps> = ({ visit }) => {
	return (
		<div className="space-y-3">
			<div className="clinical-soap-card">
				<div className="clinical-soap-title">
					<Clock className="w-3 h-3 text-amber-500" />
					<span>Жалобы (Subjective)</span>
				</div>
				<div className="clinical-soap-body">{visit.complaints || "Активных жалоб не предъявляет."}</div>
			</div>

			{visit.anamnesis && (
				<div className="clinical-soap-card">
					<div className="clinical-soap-title">
						<User className="w-3 h-3 text-blue-500" />
						<span>Анамнез заболевания и жизни</span>
					</div>
					<div className="clinical-soap-body">{visit.anamnesis}</div>
				</div>
			)}

			<div className="clinical-soap-card">
				<div className="clinical-soap-title">
					<Stethoscope className="w-3 h-3 text-teal-500" />
					<span>Объективно (Status Localis)</span>
				</div>
				<div className="clinical-soap-body">
					{visit.statusLocalis || "Слизистая оболочка интактна, десна без признаков воспаления."}
				</div>
			</div>

			<div className="clinical-soap-card">
				<div className="clinical-soap-title">
					<Sparkles className="w-3 h-3 text-indigo-500" />
					<span>Протокол лечения и манипуляции (Assessment & Plan)</span>
				</div>
				<div className="clinical-soap-body font-normal">
					{visit.treatmentProtocol || "Проведено плановое терапевтическое лечение."}
				</div>
			</div>

			{visit.recommendations && (
				<div className="clinical-soap-card">
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
