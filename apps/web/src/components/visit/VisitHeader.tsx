import { AlertTriangle, Mic } from "lucide-react";
import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function VisitHeader() {
	const {
		activePatient,
		activeAppointment,
		visitWarnings,
		primaryVisitWarning,
		visitCloseChecklist,
		activeImagingStudies,
		activeUsableDocuments,
		scrollToVisitArea,
		openVisitWarningAction,
	} = useAppLogicContext();

	if (!activePatient) return null;

	return (
		<section className="visit-focus-bar" aria-label="Быстрый фокус приема">
			<div className="visit-focus-patient">
				<div className="avatar">{activePatient.fullName.slice(0, 1)}</div>
				<div>
					<p className="eyebrow">Пациент сейчас</p>
					<h3>{activePatient.fullName}</h3>
					<p>
						{activeAppointment?.reason ?? "прием"} ·{" "}
						{activePatient.phone ?? "телефон не указан"}
					</p>
				</div>
			</div>
			<div className="visit-focus-status">
				<span className={visitWarnings.length ? "" : "ready"}>
					{visitWarnings.length
						? `${visitWarnings.length} предупр.`
						: "спокойно"}
				</span>
				<strong>{primaryVisitWarning?.title ?? "Можно вести прием"}</strong>
				<p>
					{visitCloseChecklist
						? `${visitCloseChecklist.score}% готовности`
						: "статус закрытия не рассчитан"}{" "}
					· предупреждения не останавливают прием ·{" "}
					{activeImagingStudies.length} снимка · {activeUsableDocuments.length}{" "}
					документа
				</p>
			</div>
			<div className="visit-focus-actions">
				<button
					className="primary-button"
					type="button"
					onClick={() => scrollToVisitArea(".dictation-box")}
					style={{
						padding: "16px 24px",
						fontSize: "16px",
						fontWeight: "bold",
						textTransform: "uppercase",
						borderRadius: "12px",
					}}
				>
					<Mic aria-hidden="true" style={{ marginRight: "8px" }} /> ДИКТОВКА
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={openVisitWarningAction}
					style={{
						padding: "16px 24px",
						fontSize: "16px",
						fontWeight: "bold",
						textTransform: "uppercase",
						borderRadius: "12px",
					}}
				>
					<AlertTriangle aria-hidden="true" style={{ marginRight: "8px" }} />{" "}
					РИСКИ
				</button>
			</div>
		</section>
	);
}
