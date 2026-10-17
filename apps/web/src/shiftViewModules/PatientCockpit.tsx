import type { Dashboard } from "@dental/shared";
import {
	Calendar,
	CreditCard,
	FileText,
	Info,
	Phone,
} from "lucide-react";
import React from "react";
import { patientInsightRiskLabels } from "../AppConstants";
import {
	formatBirthDate,
	formatPhoneDisplay,
	formatShortDate,
	money,
} from "../AppHelpers";
import { PatientAvatar } from "../components/PatientAvatar";
import { PatientCockpitFeatureGrid } from "../components/shift";
import { countLabel } from "../lib/russianPlural";
import type { PatientCockpitProps } from "./shiftViewTypes";

export const PatientCockpit: React.FC<PatientCockpitProps> = ({
	activePatient,
	activePatientInsight,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
}) => {
	if (!activePatient) {
		return (
			<section className="patient-cockpit dnt-cockpit" aria-label="Карточка пациента">
				<div className="patient-summary-card">
					<p className="eyebrow" style={{ margin: "0 0 8px" }}>Карточка пациента</p>
					<h2>Пациент не выбран</h2>
					<div className="patient-facts" style={{ marginTop: "8px", fontSize: "13px", color: "var(--muted)" }}>
						<span>Выберите пациента в списке или расписании, чтобы увидеть его данные.</span>
					</div>
					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
						<a className="secondary-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#patients">
							Выбрать пациента
						</a>
						<a className="secondary-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#schedule">
							Открыть записи
						</a>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			className="patient-cockpit dnt-cockpit"
			aria-label="Карточка пациента"
		>
			<div className="patient-summary-card col-gap-16">
				<p
					className="eyebrow"
					style={{
						margin: 0,
						fontSize: "11px",
						fontWeight: 700,
						letterSpacing: "0.09em",
						textTransform: "uppercase",
						color: "var(--muted)",
					}}
				>
					Карточка пациента
				</p>
				<div className="patient-hero min-w-0">
					<PatientAvatar fullName={activePatient.fullName} size={44} />
					<div className="hero-info min-w-0">
						<h2 style={{ fontSize: "16px", wordBreak: "break-word", lineHeight: 1.25 }}>{activePatient.fullName}</h2>
						<p
							style={{
								margin: "1px 0 0",
								fontSize: "12px",
								color: "var(--muted)",
								wordBreak: "break-word",
							}}
						>
							{activePatient.id
								? `карта № ${activePatient.id.slice(0, 6)}`
								: "номер карты не присвоен"}
						</p>
					</div>
				</div>

				<div
					className="patient-info-list"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "9px",
						fontSize: "13px",
						color: "var(--ink-2)",
						minWidth: 0,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
						<Calendar
							size={14}
							style={{ color: "var(--muted)", flexShrink: 0 }}
						/>
						<span className="min-w-0 break-words">
							Дата рождения:{" "}
							<strong style={{ color: "var(--ink)", fontWeight: 600 }}>
								{formatBirthDate(activePatient.birthDate as string) || "не указана"}
							</strong>
						</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
						<Phone size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
						<span className="min-w-0 break-words">
							Телефон:{" "}
							<strong
								style={{
									color: "var(--ink)",
									fontWeight: 600,
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{activePatient.phone ? formatPhoneDisplay(activePatient.phone) : "не указан"}
							</strong>
						</span>
					</div>
					{activePatient.notes && (
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "8px",
								minWidth: 0,
							}}
						>
							<Info
								size={14}
								style={{
									color: "var(--muted)",
									flexShrink: 0,
									marginTop: "2px",
								}}
							/>
							<span className="min-w-0 break-words leading-tight">
								Заметки:{" "}
								<strong style={{ color: "var(--ink)", fontWeight: 600 }}>
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
							padding: "12px 14px",
							borderRadius: "11px",
							background:
								activePatientInsight.riskLevel === "high"
									? "var(--bad-bg)"
									: activePatientInsight.riskLevel === "watch"
										? "var(--warn-bg)"
										: "var(--paper-soft)",
							border:
								"1px solid " +
								(activePatientInsight.riskLevel === "high"
									? "var(--bad-fg)"
									: activePatientInsight.riskLevel === "watch"
										? "var(--warn-fg)"
										: "var(--line)"),
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "7px",
							}}
						>
							<span
								style={{
									fontSize: "10.5px",
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									color:
										activePatientInsight.riskLevel === "high"
											? "var(--bad-fg)"
											: activePatientInsight.riskLevel === "watch"
												? "var(--warn-fg)"
												: "var(--muted)",
									flexShrink: 0,
								}}
							>
								{patientInsightRiskLabels[activePatientInsight.riskLevel]}
							</span>
							<strong style={{ fontSize: "12.5px", color: "var(--ink)", wordBreak: "break-word", lineHeight: 1.3 }}>
								{activePatientInsight.nextBestAction}
							</strong>
						</div>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								fontSize: "11.5px",
								fontWeight: 600,
							}}
						>
							{activePatientInsight.balanceDueRub ? (
								<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
									<CreditCard size={13} className="inline mr-1 text-amber-500" /> Долг {money(activePatientInsight.balanceDueRub)}
								</span>
							) : null}
							{activePatientInsight.openTasks > 0 ? (
								<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
									<Phone size={13} className="inline mr-1 text-[var(--teal)]" />{" "}
									{countLabel(
										activePatientInsight.openTasks,
										"задача",
										"задачи",
										"задач",
									)}{" "}
									на связь
								</span>
							) : null}
							{(activePatientInsight.missingDocumentKinds?.length ?? 0) > 0 ? (
								<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
									<FileText size={13} className="inline mr-1 text-rose-500" /> не хватает{" "}
									{countLabel(
										activePatientInsight.missingDocumentKinds?.length ?? 0,
										"документа",
										"документов",
										"документов",
									)}
								</span>
							) : null}
							{activePatientInsight.recallDueAt ? (
								<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
									повторный визит {formatShortDate(activePatientInsight.recallDueAt)}
								</span>
							) : null}
						</div>
					</div>
				) : null}
			</div>

			<PatientCockpitFeatureGrid
				activeUsableDocuments={activeUsableDocuments}
				dashboard={dashboard}
				activeCommunicationTasks={activeCommunicationTasks}
				activeImagingStudies={activeImagingStudies}
			/>
		</section>
	);
};
