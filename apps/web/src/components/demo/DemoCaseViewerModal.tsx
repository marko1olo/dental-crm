import React, { useState } from "react";
import {
	Activity,
	Award,
	CheckCircle,
	ChevronRight,
	Crown,
	FileText,
	Printer,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import {
	getDemoRoleClinicalDetails,
	generateDemoDiplomaForBravery,
	simulateDemoAppointmentStatusChange,
	simulateDemoToothClick,
	simulateDemoAddServiceToEstimate,
	type DemoRoleProfile,
} from "../../utils/demo/demoInteractiveSimulation.js";
import { showToast } from "../GlobalToast.js";

export interface DemoCaseViewerModalProps {
	readonly isOpen: boolean;
	readonly activeRoleKey: string;
	readonly onClose: () => void;
	readonly onSelectRole?: (roleKey: string) => void;
}

export const DemoCaseViewerModal: React.FC<DemoCaseViewerModalProps> = ({
	isOpen,
	activeRoleKey,
	onClose,
	onSelectRole,
}) => {
	const [activeTab, setActiveTab] = useState<string>("case");
	const [braveryAwarded, setBraveryAwarded] = useState(false);
	const [statusUpdated, setStatusUpdated] = useState(false);

	if (!isOpen) return null;

	const details = getDemoRoleClinicalDetails(activeRoleKey);
	const { profile } = details;

	const handleAwardDiploma = () => {
		const diploma = generateDemoDiplomaForBravery(
			profile.targetPatientId === "01a00000-0000-0000-0000-000000000001"
				? "Смирнова Анна Сергеевна"
				: profile.doctorName,
		);
		setBraveryAwarded(true);
		showToast(
			`Выдан ${diploma.diplomaNumber} пациенту ${diploma.patientName}!`,
			"success",
		);
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleSimulateStatusComplete = () => {
		simulateDemoAppointmentStatusChange(
			"01a00000-0000-0000-0001-000000000002",
			"completed",
		);
		setStatusUpdated(true);
		showToast("Статус приёма переключен: «Завершен». Смета готова к оплате!", "success");
	};

	return (
		<div
			className="demo-case-modal-overlay"
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(15, 23, 42, 0.75)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 10000,
				padding: "16px",
			}}
			onClick={onClose}
		>
			<div
				className="demo-case-modal-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="demo-case-title"
				style={{
					background: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "12px",
					width: "100%",
					maxWidth: "840px",
					maxHeight: "90vh",
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
					color: "var(--ink, #0f172a)",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Шапка модалки */}
				<div
					style={{
						padding: "16px 20px",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "var(--paper, #f8fafc)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								background: "var(--brand-accent-bg, rgba(99, 102, 241, 0.1))",
								color: "var(--brand-accent, #6366f1)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{activeRoleKey === "therapist" && <Stethoscope size={20} />}
							{activeRoleKey === "orthopedist" && <Crown size={20} />}
							{activeRoleKey === "orthodontist" && <Sparkles size={20} />}
							{activeRoleKey === "surgeon" && <Activity size={20} />}
							{activeRoleKey === "owner" && <Award size={20} />}
							{activeRoleKey === "admin" && <FileText size={20} />}
						</div>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span
									style={{
										fontSize: "11px",
										fontWeight: 600,
										textTransform: "uppercase",
										letterSpacing: "0.5px",
										color: "var(--brand-accent, #6366f1)",
										background: "var(--brand-accent-bg, rgba(99, 102, 241, 0.1))",
										padding: "2px 8px",
										borderRadius: "4px",
									}}
								>
									{profile.badge}
								</span>
								<h3
									id="demo-case-title"
									style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}
								>
									{profile.title} — {profile.doctorName}
								</h3>
							</div>
							<p
								style={{
									margin: "2px 0 0",
									fontSize: "12px",
									color: "var(--muted, #64748b)",
								}}
							>
								{profile.description}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						style={{
							background: "transparent",
							border: "none",
							cursor: "pointer",
							color: "var(--muted, #64748b)",
							padding: "4px",
							borderRadius: "6px",
						}}
						aria-label="Закрыть модальное окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* Табы внутри модалки */}
				<div
					style={{
						display: "flex",
						gap: "8px",
						padding: "10px 20px",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper, #f8fafc)",
					}}
				>
					<button
						type="button"
						onClick={() => setActiveTab("case")}
						style={{
							padding: "6px 14px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								activeTab === "case"
									? "var(--brand-accent, #6366f1)"
									: "transparent",
							color: activeTab === "case" ? "#ffffff" : "var(--ink, #0f172a)",
						}}
					>
						Клинический кейс и протокол
					</button>

					{activeRoleKey === "therapist" && (
						<button
							type="button"
							onClick={() => setActiveTab("estimate")}
							style={{
								padding: "6px 14px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 600,
								border: "none",
								cursor: "pointer",
								background:
									activeTab === "estimate"
										? "var(--brand-accent, #6366f1)"
										: "transparent",
								color: activeTab === "estimate" ? "#ffffff" : "var(--ink, #0f172a)",
							}}
						>
							Смета приёма (8 600 ₽)
						</button>
					)}

					<button
						type="button"
						onClick={() => setActiveTab("diploma")}
						style={{
							padding: "6px 14px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								activeTab === "diploma"
									? "var(--brand-accent, #6366f1)"
									: "transparent",
							color: activeTab === "diploma" ? "#ffffff" : "var(--ink, #0f172a)",
						}}
					>
						Диплом за храбрость
					</button>
				</div>

				{/* Тело модалки */}
				<div style={{ padding: "20px", overflowY: "auto", flex: 1, fontSize: "13px" }}>
					{activeTab === "case" && (
						<div>
							{/* ТЕРАПЕВТ */}
							{activeRoleKey === "therapist" && details.soapDiary && (
								<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
									<div
										style={{
											padding: "12px",
											background: "var(--paper, #f8fafc)",
											border: "1px solid var(--line, #e2e8f0)",
											borderRadius: "8px",
										}}
									>
										<div
											style={{
												fontWeight: 700,
												marginBottom: "4px",
												color: "var(--brand-accent, #6366f1)",
											}}
										>
											🦷 Зубная формула (FDI):
										</div>
										<ul style={{ margin: 0, paddingLeft: "18px" }}>
											{details.odontogram?.map((t) => (
												<li key={t.toothNumber} style={{ marginBottom: "2px" }}>
													<strong>Зуб {t.toothNumber}</strong>: {t.titleRu} (
													{t.clinicalNote})
												</li>
											))}
										</ul>
									</div>

									<div
										style={{
											padding: "12px",
											background: "var(--paper, #f8fafc)",
											border: "1px solid var(--line, #e2e8f0)",
											borderRadius: "8px",
										}}
									>
										<div
											style={{
												fontWeight: 700,
												marginBottom: "4px",
												color: "var(--teal, #0d9488)",
											}}
										>
											📋 Дневник приёма (Форма 043/у):
										</div>
										<div style={{ marginBottom: "6px" }}>
											<strong>Жалобы:</strong> {details.soapDiary.complaints}
										</div>
										<div style={{ marginBottom: "6px" }}>
											<strong>Анамнез:</strong> {details.soapDiary.anamnesis}
										</div>
										<div style={{ marginBottom: "6px" }}>
											<strong>Status Localis:</strong>{" "}
											{details.soapDiary.statusLocalis}
										</div>
										<div style={{ marginBottom: "6px" }}>
											<strong>Диагноз (МКБ-10):</strong>{" "}
											<span style={{ color: "var(--danger, #ef4444)", fontWeight: 700 }}>
												{details.soapDiary.diagnosisIcd10}
											</span>
										</div>
										<div style={{ marginBottom: "6px" }}>
											<strong>Протокол лечения:</strong>{" "}
											{details.soapDiary.treatmentProtocol}
										</div>
										<div>
											<strong>Рекомендации:</strong>{" "}
											{details.soapDiary.recommendations}
										</div>
									</div>
								</div>
							)}

							{/* ОРТОПЕД */}
							{activeRoleKey === "orthopedist" && details.labOrder && (
								<div
									style={{
										padding: "14px",
										background: "var(--paper, #f8fafc)",
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: "8px",
										display: "flex",
										flexDirection: "column",
										gap: "10px",
									}}
								>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
										}}
									>
										<span
											style={{
												fontSize: "14px",
												fontWeight: 700,
												color: "var(--amber, #f59e0b)",
											}}
										>
											Заказ-наряд {details.labOrder.orderNumber}
										</span>
										<span
											style={{
												fontSize: "11px",
												fontWeight: 600,
												padding: "2px 8px",
												borderRadius: "4px",
												background: "rgba(245, 158, 11, 0.15)",
												color: "var(--amber, #d97706)",
											}}
										>
											Этап: {details.labOrder.currentStageRu} (
											{details.labOrder.currentStageIndex} из{" "}
											{details.labOrder.totalStagesCount})
										</span>
									</div>

									<div>
										<strong>Пациент:</strong> {details.labOrder.patientName} (Зуб{" "}
										{details.labOrder.toothFdi})
									</div>
									<div>
										<strong>Конструкция:</strong>{" "}
										{details.labOrder.constructionTypeRu} —{" "}
										{details.labOrder.materialRu}
									</div>
									<div>
										<strong>Расцветка (VITA):</strong>{" "}
										<span style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>
											{details.labOrder.vitaShade}
										</span>{" "}
										(культя: {details.labOrder.stumpShade})
									</div>
									<div>
										<strong>Лаборатория:</strong> {details.labOrder.labName} (
										{details.labOrder.technicianName})
									</div>
									<div>
										<strong>Сроки:</strong> Отправлен {details.labOrder.sentDateIso}{" "}
										→ Примерка {details.labOrder.tryInDateIso} → Фиксация{" "}
										{details.labOrder.finalDeliveryDateIso}
									</div>
									<div>
										<strong>Финансы:</strong> Для пациента:{" "}
										{details.labOrder.patientPriceRub.toLocaleString("ru-RU")} ₽ |
										ЗТЛ: {details.labOrder.labCostRub.toLocaleString("ru-RU")} ₽ |
										Врачу (20%):{" "}
										{details.labOrder.doctorCommissionRub.toLocaleString("ru-RU")} ₽
									</div>
									<div
										style={{
											fontSize: "12px",
											color: "var(--muted, #64748b)",
											fontStyle: "italic",
										}}
									>
										{details.labOrder.clinicalNotes}
									</div>
								</div>
							)}

							{/* ОРТОДОНТ */}
							{activeRoleKey === "orthodontist" && details.orthoCase && (
								<div
									style={{
										padding: "14px",
										background: "var(--paper, #f8fafc)",
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: "8px",
										display: "flex",
										flexDirection: "column",
										gap: "10px",
									}}
								>
									<div style={{ fontWeight: 700, fontSize: "14px", color: "#6366f1" }}>
										Ортодонтическая карта: {details.orthoCase.systemType}
									</div>
									<div>
										<strong>Диагноз прикуса:</strong>{" "}
										{details.orthoCase.biteDiagnosisRu} ({details.orthoCase.angleClass})
									</div>
									<div>
										<strong>Прогресс элайнеров:</strong>{" "}
										<span style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>
											Капа {details.orthoCase.currentAlignerTray} из{" "}
											{details.orthoCase.totalAlignerTrays}
										</span>{" "}
										({details.orthoCase.progressPercent}% выполнено)
									</div>
									<div>
										<strong>Фиксация аттачментов:</strong> Зубы{" "}
										{details.orthoCase.attachmentTeeth.join(", ")}
									</div>
									<div>
										<strong>Сепарация (IPR):</strong> {details.orthoCase.iprProtocolRu}
									</div>
									<div>
										<strong>Эластики:</strong> {details.orthoCase.elasticsProtocolRu}
									</div>
									<div
										style={{
											fontSize: "12px",
											color: "var(--muted, #64748b)",
											fontStyle: "italic",
										}}
									>
										{details.orthoCase.clinicalNotes}
									</div>
								</div>
							)}

							{/* ХИРУРГ */}
							{activeRoleKey === "surgeon" && details.surgeonCase && (
								<div
									style={{
										padding: "14px",
										background: "var(--paper, #f8fafc)",
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: "8px",
										display: "flex",
										flexDirection: "column",
										gap: "10px",
									}}
								>
									<div style={{ fontWeight: 700, fontSize: "14px", color: "#ef4444" }}>
										Хирургический протокол имплантации: Зуб{" "}
										{details.surgeonCase.toothNumber}
									</div>
									<div>
										<strong>Имплантат:</strong>{" "}
										{details.surgeonCase.implantSystemRu} (
										{details.surgeonCase.implantSizeRu})
									</div>
									<div>
										<strong>Стабильность:</strong> Торк затяжки:{" "}
										<span style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>
											{details.surgeonCase.insertionTorqueNcm} Н·см
										</span>
										, ISQ: {details.surgeonCase.stabilityIsq} (кость:{" "}
										{details.surgeonCase.boneDensityMisch})
									</div>
									<div>
										<strong>Анестезия:</strong>{" "}
										{details.surgeonCase.anesthesiaProtocolRu}
									</div>
									<div>
										<strong>Ход операции:</strong>{" "}
										{details.surgeonCase.surgicalProtocolRu}
									</div>
									<div>
										<strong>Формирователь десны:</strong>{" "}
										{details.surgeonCase.healingAbutmentSizeRu} | Шов:{" "}
										{details.surgeonCase.sutureMaterialRu}
									</div>
									<div>
										<strong>ИДС:</strong>{" "}
										<span style={{ color: "var(--ok-fg, #10b981)", fontWeight: 700 }}>
											✓ Подписано (ИДС-ХИР-1051н)
										</span>
									</div>
								</div>
							)}

							{/* ГЛАВВРАЧ */}
							{activeRoleKey === "owner" && details.executiveKpis && (
								<div
									style={{
										padding: "14px",
										background: "var(--paper, #f8fafc)",
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: "8px",
										display: "flex",
										flexDirection: "column",
										gap: "12px",
									}}
								>
									<div style={{ fontWeight: 700, fontSize: "14px", color: "#f59e0b" }}>
										Сквозная аналитика: {details.executiveKpis.periodName}
									</div>

									<div
										style={{
											display: "grid",
											gridTemplateColumns: "repeat(3, 1fr)",
											gap: "10px",
										}}
									>
										<div
											style={{
												padding: "10px",
												background: "var(--paper-strong, #ffffff)",
												borderRadius: "6px",
												border: "1px solid var(--line, #e2e8f0)",
											}}
										>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												Выручка (факт / план)
											</div>
											<div style={{ fontSize: "15px", fontWeight: 700 }}>
												{details.executiveKpis.monthRevenueFactRub.toLocaleString(
													"ru-RU",
												)}{" "}
												₽
											</div>
											<div style={{ fontSize: "11px", color: "var(--ok-fg, #10b981)" }}>
												{details.executiveKpis.revenueExecutionPercent}% от плана
											</div>
										</div>

										<div
											style={{
												padding: "10px",
												background: "var(--paper-strong, #ffffff)",
												borderRadius: "6px",
												border: "1px solid var(--line, #e2e8f0)",
											}}
										>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												Загрузка 3 кресел
											</div>
											<div style={{ fontSize: "15px", fontWeight: 700 }}>
												{details.executiveKpis.chairOccupancyRatePercent}%
											</div>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												К1: {details.executiveKpis.chair1OccupancyPercent}% | К2:{" "}
												{details.executiveKpis.chair2OccupancyPercent}% | К3:{" "}
												{details.executiveKpis.chair3OccupancyPercent}%
											</div>
										</div>

										<div
											style={{
												padding: "10px",
												background: "var(--paper-strong, #ffffff)",
												borderRadius: "6px",
												border: "1px solid var(--line, #e2e8f0)",
											}}
										>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												Средний чек и конверсия
											</div>
											<div style={{ fontSize: "15px", fontWeight: 700 }}>
												{details.executiveKpis.averageCheckRub.toLocaleString(
													"ru-RU",
												)}{" "}
												₽
											</div>
											<div style={{ fontSize: "11px", color: "var(--ok-fg, #10b981)" }}>
												Конверсия в план:{" "}
												{
													details.executiveKpis
														.consultationToPlanConversionPercent
												}
												%
											</div>
										</div>
									</div>

									<div style={{ marginTop: "4px" }}>
										<div style={{ fontWeight: 700, marginBottom: "6px" }}>
											Сдельная зарплата врачей:
										</div>
										<table
											style={{
												width: "100%",
												borderCollapse: "collapse",
												fontSize: "12px",
											}}
										>
											<thead>
												<tr
													style={{
														borderBottom: "1px solid var(--line, #e2e8f0)",
														textAlign: "left",
													}}
												>
													<th style={{ padding: "4px" }}>Врач</th>
													<th style={{ padding: "4px" }}>Специальность</th>
													<th style={{ padding: "4px" }}>Выручка</th>
													<th style={{ padding: "4px" }}>Ставка</th>
													<th style={{ padding: "4px" }}>К выплате</th>
												</tr>
											</thead>
											<tbody>
												{details.executiveKpis.doctorPayroll.map((d) => (
													<tr
														key={d.doctorId}
														style={{
															borderBottom: "1px solid var(--line, #e2e8f0)",
														}}
													>
														<td style={{ padding: "4px", fontWeight: 600 }}>
															{d.doctorName}
														</td>
														<td style={{ padding: "4px" }}>{d.specialtyRu}</td>
														<td style={{ padding: "4px" }}>
															{d.revenueRub.toLocaleString("ru-RU")} ₽
														</td>
														<td style={{ padding: "4px" }}>
															{d.commissionPercent}%
														</td>
														<td
															style={{
																padding: "4px",
																fontWeight: 700,
																color: "var(--teal, #0d9488)",
															}}
														>
															{d.pieceworkSalaryRub.toLocaleString("ru-RU")} ₽
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</div>
					)}

					{/* ВКЛАДКА СМЕТЫ */}
					{activeTab === "estimate" && details.estimate && (
						<div
							style={{
								padding: "14px",
								background: "var(--paper, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
							}}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "10px",
								}}
							>
								<span style={{ fontWeight: 700, fontSize: "14px" }}>
									{details.estimate.estimateNumber} от {details.estimate.dateIso.slice(0, 10)}
								</span>
								<span
									style={{
										fontSize: "12px",
										color: "var(--ok-fg, #10b981)",
										fontWeight: 600,
									}}
								>
									✓ Согласовано пациентом
								</span>
							</div>

							<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
								<thead>
									<tr
										style={{
											borderBottom: "1px solid var(--line, #e2e8f0)",
											textAlign: "left",
										}}
									>
										<th style={{ padding: "6px" }}>Код</th>
										<th style={{ padding: "6px" }}>Наименование услуги</th>
										<th style={{ padding: "6px" }}>Зуб</th>
										<th style={{ padding: "6px" }}>Кол-во</th>
										<th style={{ padding: "6px" }}>Цена</th>
										<th style={{ padding: "6px" }}>Сумма</th>
									</tr>
								</thead>
								<tbody>
									{details.estimate.items.map((item) => (
										<tr
											key={item.code}
											style={{ borderBottom: "1px solid var(--line, #e2e8f0)" }}
										>
											<td style={{ padding: "6px", fontFamily: "monospace" }}>
												{item.code}
											</td>
											<td style={{ padding: "6px" }}>{item.name}</td>
											<td style={{ padding: "6px" }}>{item.toothNumber || "—"}</td>
											<td style={{ padding: "6px" }}>{item.quantity}</td>
											<td style={{ padding: "6px" }}>
												{item.unitPriceRub.toLocaleString("ru-RU")} ₽
											</td>
											<td style={{ padding: "6px", fontWeight: 600 }}>
												{item.totalRub.toLocaleString("ru-RU")} ₽
											</td>
										</tr>
									))}
								</tbody>
							</table>

							<div
								style={{
									display: "flex",
									justifyContent: "flex-end",
									marginTop: "12px",
									fontSize: "14px",
									fontWeight: 700,
								}}
							>
								Итого к оплате:{" "}
								<span style={{ color: "var(--teal, #0d9488)", marginLeft: "8px" }}>
									{details.estimate.totalNetRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
						</div>
					)}

					{/* ВКЛАДКА ДИПЛОМА ЗА ХРАБРОСТЬ */}
					{activeTab === "diploma" && (
						<div
							style={{
								padding: "24px",
								background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
								border: "2px solid #f59e0b",
								borderRadius: "12px",
								textAlign: "center",
								color: "#78350f",
							}}
						>
							<Award size={48} style={{ color: "#d97706", margin: "0 auto 8px" }} />
							<h2
								style={{
									margin: "0 0 6px",
									fontSize: "20px",
									fontWeight: 800,
									textTransform: "uppercase",
								}}
							>
								Диплом за храбрость
							</h2>
							<p style={{ margin: "0 0 14px", fontSize: "14px" }}>
								Награждается пациент:{" "}
								<strong>
									{profile.targetPatientId === "01a00000-0000-0000-0000-000000000001"
										? "Смирнова Анна Сергеевна"
										: profile.doctorName}
								</strong>
							</p>
							<div
								style={{
									fontSize: "13px",
									fontStyle: "italic",
									maxWidth: "460px",
									margin: "0 auto 16px",
								}}
							>
								«За выдающееся мужество, безупречное спокойствие в кресле стоматолога и
								образцовую сияющую улыбку!»
							</div>

							<div
								style={{
									display: "flex",
									justifyContent: "space-around",
									fontSize: "12px",
									borderTop: "1px dashed #d97706",
									paddingTop: "12px",
								}}
							>
								<div>Лечащий врач: {profile.doctorName}</div>
								<div>Клиника DENTE</div>
								<div>Дата: {new Date().toLocaleDateString("ru-RU")}</div>
							</div>

							<button
								type="button"
								onClick={handleAwardDiploma}
								style={{
									marginTop: "16px",
									background: "#d97706",
									color: "#ffffff",
									border: "none",
									borderRadius: "6px",
									padding: "8px 18px",
									fontWeight: 700,
									fontSize: "13px",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
								}}
							>
								<Printer size={16} /> Распечатать диплом
							</button>
						</div>
					)}
				</div>

				{/* Подвал с интерактивными действиями (Zero Dead-Ends) */}
				<div
					style={{
						padding: "12px 20px",
						borderTop: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper, #f8fafc)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							onClick={handleSimulateStatusComplete}
							disabled={statusUpdated}
							style={{
								background: statusUpdated
									? "var(--ok-fg, #10b981)"
									: "var(--brand-accent, #6366f1)",
								color: "#ffffff",
								border: "none",
								borderRadius: "6px",
								padding: "6px 14px",
								fontSize: "12px",
								fontWeight: 600,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<CheckCircle size={14} />
							{statusUpdated ? "Приём завершён ✓" : "Симулировать: Завершить приём"}
						</button>
					</div>

					<button
						type="button"
						onClick={onClose}
						style={{
							background: "var(--paper-strong, #ffffff)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "6px",
							padding: "6px 14px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							color: "var(--ink, #0f172a)",
						}}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
