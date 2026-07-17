import {
	Calendar,
	CreditCard,
	FileText,
	History,
	ImageIcon,
	Info,
	MessageSquare,
	Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	formatShortDate,
	money,
	patientInsightRiskLabels,
} from "../../../AppHelpers";

export function PatientCockpit() {
	const {
		activePatient,
		activePatientInsight,
		dashboard,
		activeCommunicationTasks,
		activeImagingStudies,
		activeUsableDocuments,
		patientBillingSummary,
	} = useAppLogicContext();

	if (!activePatient) {
		return (
			<motion.section
				className="patient-cockpit glass-panel"
				aria-label="Карточка пациента"
				initial={{ opacity: 0, scale: 0.98 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="patient-summary-card">
					<p className="eyebrow">Карточка пациента</p>
					<h2>Пациент не выбран</h2>
					<div className="patient-facts">
						<span>
							Выберите пациента в списке или расписании, чтобы увидеть его
							данные.
						</span>
					</div>
				</div>
			</motion.section>
		);
	}

	return (
		<>
			<motion.section
				className="patient-cockpit glass-panel"
				aria-label="Карточка пациента"
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
			>
				<div className="patient-summary-card">
					<p className="eyebrow">Карточка пациента</p>
					<h2>{activePatient.fullName}</h2>
					<div
						className="patient-info-list"
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "12px",
							border: "none",
							background: "transparent",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								color: "var(--text-secondary)",
								fontSize: "14px",
							}}
						>
							<Calendar size={16} />
							<span>
								Дата рождения:{" "}
								<strong style={{ color: "var(--text-primary)" }}>
									{activePatient.birthDate ?? "не указана"}
								</strong>
							</span>
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								color: "var(--text-secondary)",
								fontSize: "14px",
							}}
						>
							<Phone size={16} />
							<span>
								Телефон:{" "}
								<strong style={{ color: "var(--text-primary)" }}>
									{activePatient.phone ?? "не указан"}
								</strong>
							</span>
						</div>
						{activePatient.notes && (
							<div
								style={{
									display: "flex",
									alignItems: "flex-start",
									gap: "8px",
									color: "var(--text-secondary)",
									fontSize: "14px",
								}}
							>
								<Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
								<span>
									Заметки:{" "}
									<strong style={{ color: "var(--text-primary)" }}>
										{activePatient.notes}
									</strong>
								</span>
							</div>
						)}
					</div>
					{activePatientInsight ? (
						<div
							className={`patient-insight-panel risk-${activePatientInsight.riskLevel}`}
							style={{
								padding: "16px",
								borderRadius: "8px",
								background:
									activePatientInsight.riskLevel === "high"
										? "var(--red-soft)"
										: activePatientInsight.riskLevel === "medium"
											? "var(--amber-soft)"
											: "var(--paper-strong)",
								border:
									"1px solid " +
									(activePatientInsight.riskLevel === "high"
										? "var(--red)"
										: activePatientInsight.riskLevel === "medium"
											? "var(--amber)"
											: "var(--line)"),
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									marginBottom: "8px",
								}}
							>
								<span
									style={{
										fontSize: "11px",
										fontWeight: 600,
										textTransform: "uppercase",
										color:
											activePatientInsight.riskLevel === "high"
												? "var(--red)"
												: activePatientInsight.riskLevel === "medium"
													? "var(--amber)"
													: "var(--muted)",
									}}
								>
									{
										patientInsightRiskLabels[
											activePatientInsight.riskLevel as keyof typeof patientInsightRiskLabels
										]
									}
								</span>
								<strong style={{ fontSize: "13px", color: "#1e293b" }}>
									{activePatientInsight.nextBestAction}
								</strong>
							</div>
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "6px",
									fontSize: "12px",
									fontWeight: 500,
								}}
							>
								{activePatientInsight.balanceDueRub ? (
									<span
										style={{
											background: "var(--paper)",
											padding: "4px 8px",
											borderRadius: "4px",
											border: "1px solid var(--line)",
											color: "var(--ink)",
										}}
									>
										💰 Долг {money(activePatientInsight.balanceDueRub)}
									</span>
								) : null}
								{activePatientInsight.openTasks > 0 ? (
									<span
										style={{
											background: "var(--paper)",
											padding: "4px 8px",
											borderRadius: "4px",
											border: "1px solid var(--line)",
											color: "var(--ink)",
										}}
									>
										📞 {activePatientInsight.openTasks} задач
									</span>
								) : null}
								{activePatientInsight.missingDocumentKinds.length > 0 ? (
									<span
										style={{
											background: "var(--paper)",
											padding: "4px 8px",
											borderRadius: "4px",
											border: "1px solid var(--line)",
											color: "var(--ink)",
										}}
									>
										📄 {activePatientInsight.missingDocumentKinds.length} док-тов нет
									</span>
								) : null}
								{activePatientInsight.recallDueAt ? (
									<span
										style={{
											background: "var(--paper)",
											padding: "4px 8px",
											borderRadius: "4px",
											border: "1px solid var(--line)",
											color: "var(--ink)",
										}}
									>
										повторный визит {formatShortDate(activePatientInsight.recallDueAt)}
									</span>
								) : null}
							</div>
						</div>
					) : null}
				</div>
				<div className="patient-feature-grid">
					<motion.article
						className="clickable-card glass-panel"
						whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}
						onClick={() => {
							window.location.hash = "visit";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<History aria-hidden="true" />
						<div>
							<h3>ЭМК / История</h3>
							<p className="tile-meta">Приёмы · диагнозы · зубная карта</p>
						</div>
					</motion.article>
					<motion.article
						className="clickable-card glass-panel"
						whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}
						onClick={() => {
							window.location.hash = "documents";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<FileText aria-hidden="true" />
						<div>
							<h3>Документы</h3>
							<p className="tile-meta">
								{activeUsableDocuments.length > 0
									? `${activeUsableDocuments.length} шт.`
									: "нет"}{" "}
								по визиту
							</p>
						</div>
					</motion.article>
					<motion.article
						className="clickable-card glass-panel"
						whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}
						onClick={() => {
							window.location.hash = "finance";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<CreditCard aria-hidden="true" />
						<div>
							<h3>Оплаты</h3>
							<p className="tile-meta">
								{money(patientBillingSummary?.totalPaidRub || 0)} · долг{" "}
								{money(patientBillingSummary?.totalDueRub || 0)}
							</p>
						</div>
					</motion.article>
					<motion.article
						className="clickable-card glass-panel"
						whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}
						onClick={() => {
							window.location.hash = "communications";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<MessageSquare aria-hidden="true" />
						<div>
							<h3>Связь</h3>
							<p className="tile-meta">
								{activeCommunicationTasks.length > 0
									? `${activeCommunicationTasks.length} задач`
									: "задач нет"}
							</p>
						</div>
					</motion.article>
					<motion.article
						className="clickable-card glass-panel"
						whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}
						onClick={() => {
							window.location.hash = "imaging";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<ImageIcon aria-hidden="true" />
						<div>
							<h3>Снимки</h3>
							<p className="tile-meta">
								{activeImagingStudies.length > 0
									? `${activeImagingStudies.length} снимка`
									: "снимков нет"}
							</p>
						</div>
					</motion.article>
				</div>
			</motion.section>
		</>
	);
}
