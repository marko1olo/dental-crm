import type React from "react";
import { useState } from "react";
import { Calendar, CheckCircle2, MessageCircle, Phone, Sparkles, X } from "lucide-react";
import type { PatientRecallRecord } from "./patientRecallEngine";
import { CLINICAL_CALLING_SCRIPTS } from "./recallTemplates";

export interface RecallCallScriptDrawerProps {
	readonly candidate: PatientRecallRecord | null;
	readonly onClose: () => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
}

export const RecallCallScriptDrawer: React.FC<RecallCallScriptDrawerProps> = ({
	candidate,
	onClose,
	onBook,
	onWhatsApp,
}) => {
	if (!candidate) return null;

	const script =
		CLINICAL_CALLING_SCRIPTS[candidate.cycleType] || CLINICAL_CALLING_SCRIPTS.standard_prophylaxis;
	const [activeObjectionId, setActiveObjectionId] = useState<string>(
		script.objections[0]?.id || "",
	);
	const activeObjection = script.objections.find((o) => o.id === activeObjectionId);

	return (
		<aside
			className="recall-script-drawer"
			aria-label={`Сценарий звонка: ${candidate.fullName}`}
			data-testid="recall-call-script-drawer"
		>
			<div className="recall-script-drawer__header">
				<div className="recall-script-drawer__patient-info">
					<span className="recall-script-drawer__badge">Скрипт звонка куратора</span>
					<h3 className="recall-script-drawer__name">{candidate.fullName}</h3>
					<p className="recall-script-drawer__sub">
						{script.title} • Врач: {candidate.attendingDoctorName || "Лечащий врач"}
					</p>
				</div>
				<button
					type="button"
					className="recall-close-btn"
					onClick={onClose}
					aria-label="Закрыть скрипт"
					style={{ minHeight: "36px", minWidth: "36px" }}
				>
					<X size={18} />
				</button>
			</div>

			<div className="recall-script-drawer__body">
				<div className="recall-script-box">
					<div className="recall-script-box__title">
						<Phone size={14} />
						<span>Что сказать пациенту (Приветствие и повод)</span>
					</div>
					<p className="recall-script-box__text">{script.greeting}</p>
					<p className="recall-script-box__goal">{script.clinicalContext}</p>
				</div>

				{script.objections.length > 0 && (
					<div className="recall-objections-section">
						<span className="recall-objections-label">Отработка возражений:</span>
						<div className="recall-objections-chips" role="tablist">
							{script.objections.map((obj) => (
								<button
									key={obj.id}
									type="button"
									className={`recall-objection-chip ${activeObjectionId === obj.id ? "active" : ""}`}
									onClick={() => setActiveObjectionId(obj.id)}
									style={{ minHeight: "36px" }}
								>
									<span>{obj.title}</span>
								</button>
							))}
						</div>

						{activeObjection && (
							<div className="recall-objection-response">
								<p className="recall-objection-counter">
									<Sparkles size={14} />
									<span>{activeObjection.suggestedResponse}</span>
								</p>
							</div>
						)}
					</div>
				)}
			</div>

			<div className="recall-script-drawer__footer">
				<button
					type="button"
					className="recall-action-btn recall-action-btn--whatsapp"
					onClick={() => onWhatsApp(candidate)}
					style={{ minHeight: "44px" }}
				>
					<MessageCircle size={16} />
					<span>Отправить в WhatsApp</span>
				</button>

				<button
					type="button"
					className="recall-action-btn recall-action-btn--book"
					onClick={() => onBook(candidate)}
					style={{ minHeight: "44px" }}
				>
					<Calendar size={16} />
					<span>Записать в расписание</span>
				</button>
			</div>
		</aside>
	);
};
