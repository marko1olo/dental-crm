import type React from "react";
import {
	Activity,
	Check,
	ChevronDown,
	ChevronUp,
	Clock,
	FileBadge,
	ShieldCheck,
	Smartphone,
	Zap,
} from "lucide-react";
import {
	DOCTOR_APPOINTMENT_STATUS_META,
	EMR_043_STATUS_META,
	formatKopecksRu,
} from "@dental/shared";
import type { DoctorShiftTimelineProps } from "./types";

export const DoctorShiftTimeline: React.FC<DoctorShiftTimelineProps> = ({
	doctorAppointments,
	filteredAppointments,
	activeTab,
	setActiveTab,
	expandedAptId,
	setExpandedAptId,
	earnings,
	unsignedAppointmentIds,
	onStatusChange,
	onSessionPepSigning,
	onInitiateSingleSmsSigning,
	onEmergencyVisit,
}) => {
	return (
		<>
			{/* Filter Tabs */}
			<div className="doctor-pwa-filter-tabs">
				<button
					type="button"
					onClick={() => setActiveTab("all")}
					className={`doctor-pwa-tab-btn ${activeTab === "all" ? "active" : ""}`}
					data-testid="tab-all"
				>
					Все ({doctorAppointments.length})
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("in_chair")}
					className={`doctor-pwa-tab-btn ${activeTab === "in_chair" ? "active" : ""}`}
					data-testid="tab-in-chair"
				>
					В кресле ({earnings.inChairAppointmentsCount})
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("waiting")}
					className={`doctor-pwa-tab-btn ${activeTab === "waiting" ? "active" : ""}`}
					data-testid="tab-waiting"
				>
					Ожидают ({earnings.waitingAppointmentsCount})
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("completed")}
					className={`doctor-pwa-tab-btn ${activeTab === "completed" ? "active" : ""}`}
					data-testid="tab-completed"
				>
					Завершены ({earnings.completedAppointmentsCount})
				</button>
				{unsignedAppointmentIds.length > 0 && (
					<button
						type="button"
						onClick={() => setActiveTab("needs_sign")}
						className={`doctor-pwa-tab-btn ${activeTab === "needs_sign" ? "active" : ""}`}
						data-testid="tab-needs-sign"
					>
						Нужна подпись ({unsignedAppointmentIds.length})
					</button>
				)}
			</div>

			{/* Chronological Appointments Feed */}
			<div className="doctor-pwa-feed" data-testid="doctor-appointments-feed">
				{doctorAppointments.length === 0 ? (
					<div className="p-8 text-center" data-testid="empty-shift-state">
						<Clock className="w-12 h-12 mx-auto mb-3 opacity-40 text-[var(--teal)]" />
						<div className="text-sm font-bold text-[var(--ink)] mb-1">
							На сегодня приемов не запланировано
						</div>
						<div className="text-xs text-[var(--muted)] max-w-[280px] mx-auto mb-4 leading-relaxed">
							Смена открыта. Вы можете принять экстренного пациента с острой болью прямо в кресло без предварительной записи.
						</div>
						<button
							type="button"
							onClick={onEmergencyVisit}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--teal-fill,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-95 transition-all cursor-pointer min-h-[44px]"
							data-testid="emergency-patient-btn"
						>
							<Zap size={15} />
							<span>Принять экстренного пациента (острая боль)</span>
						</button>
					</div>
				) : filteredAppointments.length === 0 ? (
					<div className="p-8 text-center text-xs text-[var(--muted)]">
						<Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--teal)]" />
						<span>В этой категории нет приемов на текущую смену.</span>
					</div>
				) : (
					filteredAppointments.map((apt) => {
						const isExpanded = expandedAptId === apt.id;
						const statusInfo = DOCTOR_APPOINTMENT_STATUS_META[apt.status];
						const emrInfo = EMR_043_STATUS_META[apt.emrCard043uStatus];
						const startTimeStr = apt.startsAtIso.split("T")[1]?.slice(0, 5) || "09:00";
						const endTimeStr = apt.endsAtIso.split("T")[1]?.slice(0, 5) || "10:00";

						// Appointment financials
						const aptEarned = apt.services.reduce(
							(acc, s) => acc + (s.earnedDoctorPayoutKop || 0),
							0,
						);

						return (
							<div
								key={apt.id}
								className={`doctor-pwa-card ${apt.status === "in_chair" ? "active-chair" : ""}`}
								data-testid={`appointment-card-${apt.id}`}
							>
								{/* Top Row: Time, Patient & Status Pill */}
								<div className="doctor-pwa-card-header">
									<div>
										<div className="flex items-center gap-2">
											<span className="font-extrabold text-xs text-[var(--teal)]">
												{startTimeStr} – {endTimeStr}
											</span>
											<span className="text-[10px] font-bold text-[var(--muted)]">
												{apt.chairName || "Кресло 1"}
											</span>
										</div>
										<div className="doctor-pwa-patient-name mt-1">
											{apt.patientFullName}
										</div>
										<div className="doctor-pwa-patient-meta mt-0.5">
											<span>{apt.cardNumber}</span>
											{apt.patientBirthDate && (
												<span>• {apt.patientBirthDate.slice(0, 4)} г.р.</span>
											)}
											{apt.patientPhone && <span>• {apt.patientPhone}</span>}
										</div>
									</div>

									<span className={`doctor-pwa-badge ${apt.status}`}>
										{statusInfo.labelRu}
									</span>
								</div>

								{/* Diagnosis & Clinical Info */}
								{(apt.diagnosisIcd10 || apt.diagnosisTooth) && (
									<div className="doctor-pwa-card-diagnosis">
										<div className="flex items-center justify-between">
											<span className="font-bold text-[11px] text-[var(--ink)]">
												{apt.diagnosisTooth ? `Зуб ${apt.diagnosisTooth}` : "Осмотр"} • {apt.diagnosisIcd10 || "МКБ-10"}
											</span>
											<span className="text-[10px] text-[var(--muted)]">
												{apt.services.length} услуг
											</span>
										</div>
										{apt.treatmentDescription && (
											<div className="text-[11px] text-[var(--muted)] leading-tight">
												{apt.treatmentDescription}
											</div>
										)}
									</div>
								)}

								{/* Financial & EMR Status Pill */}
								<div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--line,#334155)]">
									<div className="flex items-center gap-1.5">
										{apt.emrCard043uStatus === "signed" ? (
											<span className="inline-flex items-center gap-1 text-[var(--emerald)] font-bold text-[10px]">
												<ShieldCheck size={13} />
												<span>Карта подписана ПЭП</span>
											</span>
										) : (
											<span className="inline-flex items-center gap-1 text-[var(--gold)] font-bold text-[10px]">
												<FileBadge size={13} />
												<span>{emrInfo.labelRu}</span>
											</span>
										)}
									</div>
									<div className="font-extrabold text-[var(--ink)]">
										Врачу: <span className="text-[var(--teal)]">{formatKopecksRu(aptEarned)}</span>
									</div>
								</div>

								{/* Expandable Services Breakdown */}
								{isExpanded && (
									<div className="mt-2 pt-2 border-t border-[var(--line,#334155)] space-y-1.5">
										<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
											Оказанные медицинские услуги:
										</div>
										{apt.services.map((srv) => (
											<div key={srv.id} className="doctor-pwa-service-item">
												<div className="flex-1 min-w-0 pr-2">
													<div className="font-semibold truncate text-[var(--ink)]">
														{srv.nameRu}
													</div>
													<div className="text-[10px] text-[var(--muted)]">
														Код: {srv.code804n} • {srv.commissionPercent ?? 25}% сделка
														{(srv.directLabZtlCostKop ?? 0) > 0 && ` • Вычет ЗТЛ: −${formatKopecksRu(srv.directLabZtlCostKop ?? 0)}`}
														{(srv.directMaterialCostKop ?? 0) > 0 && ` • Материалы: −${formatKopecksRu(srv.directMaterialCostKop ?? 0)}`}
													</div>
												</div>
												<div className="text-right whitespace-nowrap">
													<div className="font-bold text-[var(--ink)]">
														{formatKopecksRu(srv.finalRevenueKop ?? srv.totalCostKop ?? 0)}
													</div>
													<div className="text-[10px] font-bold text-[var(--teal)]">
														+{formatKopecksRu(srv.earnedDoctorPayoutKop ?? 0)}
													</div>
												</div>
											</div>
										))}
									</div>
								)}

								{/* 1-Click Operational Action Buttons */}
								<div className="doctor-pwa-actions-row">
									{apt.status === "waiting" && (
										<button
											type="button"
											onClick={() => onStatusChange(apt.id, "in_chair")}
											className="doctor-pwa-action-btn primary"
											data-testid={`btn-in-chair-${apt.id}`}
										>
											<Activity size={14} />
											<span>В кресло</span>
										</button>
									)}

									{apt.status === "in_chair" && (
										<button
											type="button"
											onClick={() => onStatusChange(apt.id, "completed")}
											className="doctor-pwa-action-btn success"
											data-testid={`btn-complete-${apt.id}`}
										>
											<Check size={14} />
											<span>Завершить прием</span>
										</button>
									)}

									{apt.status === "completed" && apt.emrCard043uStatus !== "signed" && (
										<div className="flex items-center gap-1.5 flex-wrap">
											<button
												type="button"
												onClick={() => onSessionPepSigning([apt.id])}
												className="doctor-pwa-action-btn primary !bg-[var(--teal-fill,#0d9488)] !text-[var(--on-teal,#ffffff)]"
												data-testid={`btn-sign-043-pep-${apt.id}`}
												title="Подписать сессионной ПЭП (63-ФЗ ст. 9)"
											>
												<Zap size={14} />
												<span>Подписать ПЭП</span>
											</button>
											<button
												type="button"
												onClick={() => onInitiateSingleSmsSigning(apt.id)}
												className="doctor-pwa-action-btn secondary text-xs px-2.5"
												data-testid={`btn-sign-043-${apt.id}`}
												title="Подписать через СМС-код подтверждения"
											>
												<Smartphone size={13} />
												<span>Через СМС</span>
											</button>
										</div>
									)}

									<button
										type="button"
										onClick={() => setExpandedAptId(isExpanded ? null : apt.id)}
										className="doctor-pwa-action-btn secondary !flex-initial px-3"
										aria-label={isExpanded ? "Свернуть услуги" : "Подробнее об услугах"}
									>
										{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
									</button>
								</div>
							</div>
						);
					})
				)}
			</div>
		</>
	);
};
