import {
	SanPiNRegulatoryEngine,
	type BiohazardInjuryType,
	type CreateEmergencyBiohazardLogDto,
	type EmergencyBiohazardLog,
} from "@dental/shared";
import {
	AlertOctagon,
	AlertTriangle,
	CheckCircle2,
	Clock,
	FileText,
	HeartPulse,
	Plus,
	Printer,
	Search,
	ShieldAlert,
	Sparkles,
	Syringe,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export function EmergencyBiohazardRegisterTab() {
	const [logs, setLogs] = useState<EmergencyBiohazardLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);

	// New accident state
	const [formDateTime, setFormDateTime] = useState(new Date().toISOString().slice(0, 16));
	const [formVictimName, setFormVictimName] = useState("Иванова Мария Сергеевна");
	const [formVictimRole, setFormVictimRole] = useState("Ассистент врача-стоматолога");
	const [formPatientName, setFormPatientName] = useState("Петров Алексей Николаевич");
	const [formPatientCard, setFormPatientCard] = useState("DNT-2026-0842");
	const [formPatientStatus, setFormPatientStatus] = useState("ВИЧ/HCV отрицательный со слов");
	const [formInjuryType, setFormInjuryType] = useState<BiohazardInjuryType>("needle_stick");
	const [formCircumstances, setFormCircumstances] = useState(
		"Укол карпульной иглой при надевании защитного колпачка после проведения инфильтрационной анестезии.",
	);
	const [formFirstAid, setFormFirstAid] = useState(
		"Перчатки сняты рабочей поверхностью внутрь, выдавлена кровь из ранки, руки вымыты с мылом под проточной водой, рана обработана 70% этиловым спиртом, смазана 5% спиртовым раствором йода, наложен бактерицидный лейкопластырь из аптечки «Анти-ВИЧ».",
	);
	const [formAntiHivUsed, setFormAntiHivUsed] = useState(true);
	const [formBloodSampled, setFormBloodSampled] = useState(true);
	const [formArvRec, setFormArvRec] = useState(false);
	const [formArvStarted72h, setFormArvStarted72h] = useState(false);
	const [formArvDrugs, setFormArvDrugs] = useState("");
	const [formChiefNotified, setFormChiefNotified] = useState(true);
	const [formNotes, setFormNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/emergency-biohazard", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			});
			if (res.ok) {
				const data = await res.json();
				setLogs(data);
			}
		} catch (err) {
			console.error("Failed to load biohazard logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	// Live regulatory audit of the protocol
	const liveEval = useMemo(() => {
		return SanPiNRegulatoryEngine.evaluateBiohazardEmergencyProtocol({
			antiHivKitUsed: formAntiHivUsed,
			bloodSampled: formBloodSampled,
			arvRecommended: formArvRec,
			arvStartedWithin72h: formArvStarted72h,
			chiefPhysicianNotified: formChiefNotified,
		});
	}, [formAntiHivUsed, formBloodSampled, formArvRec, formArvStarted72h, formChiefNotified]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateEmergencyBiohazardLogDto = {
				incidentDateTime: new Date(formDateTime).toISOString(),
				victimFullName: formVictimName,
				victimRole: formVictimRole,
				patientFullName: formPatientName || undefined,
				patientCardNumber: formPatientCard || undefined,
				patientInfectiousStatus: formPatientStatus || undefined,
				injuryType: formInjuryType,
				circumstances: formCircumstances,
				firstAidMeasures: formFirstAid,
				antiHivKitUsed: formAntiHivUsed,
				bloodSampledForTesting: formBloodSampled,
				arvProphylaxisRecommended: formArvRec,
				arvProphylaxisStartedWithin72h: formArvStarted72h,
				arvDrugsPrescribed: formArvDrugs || undefined,
				chiefPhysicianNotified: formChiefNotified,
				notes: formNotes || undefined,
			};

			const res = await fetch("/api/registers/emergency-biohazard", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Аварийная ситуация зарегистрирована, сформирован Акт СанПиН", "success");
				setIsModalOpen(false);
				fetchLogs();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при сохранении", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			return (
				!searchQuery ||
				log.victimFullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.patientFullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.actSanPiNNumber?.toLowerCase().includes(searchQuery.toLowerCase())
			);
		});
	}, [logs, searchQuery]);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ РЕГИСТРАЦИИ АВАРИЙНЫХ СИТУАЦИЙ ПРИ ОКАЗАНИИ МЕДИЦИНСКОЙ ПОМОЩИ (АПТЕЧКА «АНТИ-ВИЧ»)</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»</p>
			</div>

			<div
				style={{
					padding: "1rem",
					borderRadius: "0.5rem",
					background: "rgba(239, 68, 68, 0.08)",
					border: "1px solid rgba(239, 68, 68, 0.25)",
					display: "flex",
					alignItems: "flex-start",
					gap: "0.75rem",
				}}
			>
				<AlertOctagon size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
				<div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
					<strong style={{ color: "#dc2626" }}>ЭКСТРЕННЫЙ АЛГОРИТМ ПРИ УКОЛАХ И ПОРЕЗАХ (СанПиН 3.3686-21):</strong>
					<ol style={{ margin: "0.35rem 0 0 1.25rem", padding: 0 }}>
						<li>Снять перчатки, выдавить каплю крови из ранки.</li>
						<li>Вымыть руки проточной водой с мылом, обработать 70% спиртом, края раны смазать 5% спиртовым йодом, заклеить пластырем.</li>
						<li>При попадании на слизистые глаз/рта — промыть обильным количеством воды / 0.05% перманганатом калия.</li>
						<li>Немедленно взять кровь у сотрудника и пациента на ВИЧ, HBsAg, Anti-HCV (экспресс-тест + ИФА).</li>
						<li>При высоком риске заражения — начать АРВТ-профилактику <strong>в первые 2 часа (максимум 72 часа)</strong>.</li>
					</ol>
				</div>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={16} style={{ position: "absolute", left: "0.6rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по сотруднику, пациенту, номеру акта..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2rem", minWidth: "280px" }}
						/>
					</div>
				</div>

				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button type="button" onClick={() => window.print()} className="sanpin-btn sanpin-btn-secondary">
						<Printer size={15} /> Печать журнала аварий
					</button>
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-danger"
					>
						<Plus size={15} /> Зарегистрировать аварию
					</button>
				</div>
			</div>

			{/* Table of Emergency Biohazard Incidents */}
			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th>Дата и время</th>
							<th>Акт СанПиН</th>
							<th>Пострадавший сотрудник</th>
							<th>Пациент (источник)</th>
							<th>Характер травмы</th>
							<th>Аптечка «Анти-ВИЧ»</th>
							<th>Забор крови</th>
							<th>АРВТ (72ч)</th>
							<th>Статус контроля</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
									Загрузка журнала аварийных ситуаций...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Аварийные ситуации с кровью и биоматериалами не зафиксированы.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => (
								<tr key={log.id}>
									<td style={{ whiteSpace: "nowrap" }}>
										{new Date(log.incidentDateTime).toLocaleString("ru-RU", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</td>
									<td style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
										{log.actSanPiNNumber || "АКТ-ВБИ"}
									</td>
									<td>
										<div style={{ fontWeight: 600 }}>{log.victimFullName}</div>
										<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>{log.victimRole}</div>
									</td>
									<td>
										<div>{log.patientFullName || "Пациент не указан"}</div>
										{log.patientCardNumber && (
											<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
												Карта №{log.patientCardNumber}
											</div>
										)}
									</td>
									<td>
										<span className="sanpin-tag sanpin-tag-danger">
											{log.injuryType === "needle_stick"
												? "Укол карпульной иглой"
												: log.injuryType === "bur_cut"
													? "Порез бором"
													: log.injuryType === "scalpel_cut"
														? "Порез скальпелем"
														: log.injuryType === "splash_mucosa_eye"
															? "Попадание в глаз"
															: "Попадание на слизистую"}
										</span>
									</td>
									<td>
										{log.antiHivKitUsed ? (
											<span className="sanpin-tag sanpin-tag-success">
												<CheckCircle2 size={12} /> Обработано
											</span>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">
												<XCircle size={12} /> Нарушение!
											</span>
										)}
									</td>
									<td>
										{log.bloodSampledForTesting ? (
											<span className="sanpin-tag sanpin-tag-success">Кровь взята (ИФА)</span>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">Не взята</span>
										)}
									</td>
									<td>
										{log.arvProphylaxisRecommended ? (
											log.arvProphylaxisStartedWithin72h ? (
												<span className="sanpin-tag sanpin-tag-success">АРВТ начата &lt;72ч</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger">ПРОПУЩЕНО 72ч!</span>
											)
										) : (
											<span className="sanpin-tag sanpin-tag-neutral">Не показана</span>
										)}
									</td>
									<td>
										<span className="sanpin-tag sanpin-tag-neutral">
											{log.chiefPhysicianNotified ? "Главврач уведомлен" : "Требует подписи"}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Modal for new emergency biohazard accident */}
			{isModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal" style={{ maxWidth: "680px" }}>
						<div className="sanpin-modal-header">
							<h3>Регистрация аварийной ситуации (Аптечка «Анти-ВИЧ»)</h3>
							<button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }} aria-label="Закрыть"><X size={18} /></button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Дата и точное время аварии</label>
										<input
											type="datetime-local"
											required
											value={formDateTime}
											onChange={(e) => setFormDateTime(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Характер травмы / аварии</label>
										<select
											value={formInjuryType}
											onChange={(e) => setFormInjuryType(e.target.value as BiohazardInjuryType)}
											className="sanpin-select"
										>
											<option value="needle_stick">Укол карпульной иглой / зондом</option>
											<option value="bur_cut">Порез вращающимся бором / диском</option>
											<option value="scalpel_cut">Порез скальпелем / кюретой</option>
											<option value="splash_mucosa_eye">Попадание брызг крови/слюны в глаза</option>
											<option value="splash_mucosa_mouth">Попадание в ротовую полость</option>
											<option value="splash_skin_damaged">Попадание на поврежденную кожу</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">ФИО пострадавшего сотрудника</label>
										<input
											type="text"
											required
											value={formVictimName}
											onChange={(e) => setFormVictimName(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Должность сотрудника</label>
										<input
											type="text"
											required
											value={formVictimRole}
											onChange={(e) => setFormVictimRole(e.target.value)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">ФИО пациента (источника биоматериала)</label>
										<input
											type="text"
											value={formPatientName}
											onChange={(e) => setFormPatientName(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Номер медицинской карты пациента</label>
										<input
											type="text"
											value={formPatientCard}
											onChange={(e) => setFormPatientCard(e.target.value)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Обстоятельства аварии (манипуляция, этап)</label>
									<textarea
										rows={2}
										required
										value={formCircumstances}
										onChange={(e) => setFormCircumstances(e.target.value)}
										className="sanpin-input"
									/>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Принятые меры первой помощи (Аптечка «Анти-ВИЧ»)</label>
									<textarea
										rows={2}
										required
										value={formFirstAid}
										onChange={(e) => setFormFirstAid(e.target.value)}
										className="sanpin-input"
									/>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Аптечка «Анти-ВИЧ» применена в полном объеме?</label>
										<select
											value={formAntiHivUsed ? "yes" : "no"}
											onChange={(e) => setFormAntiHivUsed(e.target.value === "yes")}
											className="sanpin-select"
										>
											<option value="yes">Да (70% спирт, 5% йод, мытье, пластырь)</option>
											<option value="no">Нет</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Забор крови на ВИЧ, HBsAg, HCV проведен?</label>
										<select
											value={formBloodSampled ? "yes" : "no"}
											onChange={(e) => setFormBloodSampled(e.target.value === "yes")}
											className="sanpin-select"
										>
											<option value="yes">Да (у сотрудника и пациента)</option>
											<option value="no">Нет</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Показана ли АРВ-профилактика (АРВТ)?</label>
										<select
											value={formArvRec ? "yes" : "no"}
											onChange={(e) => setFormArvRec(e.target.value === "yes")}
											className="sanpin-select"
										>
											<option value="no">Нет (риск минимален / источник серонегативен)</option>
											<option value="yes">Да (высокий риск / положительный ВИЧ-статус)</option>
										</select>
									</div>

									{formArvRec && (
										<div className="sanpin-form-group">
											<label className="sanpin-form-label">Начата ли АРВТ в первые 72 часа?</label>
											<select
												value={formArvStarted72h ? "yes" : "no"}
												onChange={(e) => setFormArvStarted72h(e.target.value === "yes")}
												className="sanpin-select"
											>
												<option value="yes">Да (препараты приняты &lt; 72ч)</option>
												<option value="no">Нет (окно упущено)</option>
											</select>
										</div>
									)}
								</div>

								{/* Live protocol compliance check */}
								<div
									style={{
										padding: "0.75rem",
										borderRadius: "0.375rem",
										background: liveEval.isProtocolCompliant ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
										border: `1px solid ${liveEval.isProtocolCompliant ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
										display: "flex",
										alignItems: "flex-start",
										gap: "0.5rem",
									}}
								>
									{liveEval.isProtocolCompliant ? (
										<CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
									) : (
										<AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
									)}
									<div style={{ fontSize: "0.8rem" }}>
										<div style={{ fontWeight: 600, color: liveEval.isProtocolCompliant ? "#059669" : "#dc2626" }}>
											{liveEval.isProtocolCompliant
												? "Протокол первой помощи по СанПиН 3.3686-21 полностью соблюден"
												: "ОБНАРУЖЕНЫ НАРУШЕНИЯ РЕГЛАМЕНТА САНПИН:"}
										</div>
										{!liveEval.isProtocolCompliant && (
											<ul style={{ margin: "0.25rem 0 0 1rem", padding: 0, color: "#dc2626" }}>
												{liveEval.missingSteps.map((s, idx) => (
													<li key={idx}>{s}</li>
												))}
											</ul>
										)}
									</div>
								</div>
							</div>
							<div className="sanpin-modal-footer">
								<button type="button" onClick={() => setIsModalOpen(false)} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
								<button type="submit" disabled={submitting} className="sanpin-btn sanpin-btn-danger">
									{submitting ? "Сохранение..." : "Составить Акт и внести в журнал"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
