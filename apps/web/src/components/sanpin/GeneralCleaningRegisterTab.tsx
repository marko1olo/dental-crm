import {
	type CleaningApplicationMethod,
	type CleaningStatus,
	type CleaningType,
	type CreateGeneralCleaningLogDto,
	type GeneralCleaningLog,
} from "@dental/shared";
import {
	Calendar,
	CheckCircle2,
	Clock,
	FileCheck,
	Filter,
	Plus,
	Printer,
	Search,
	ShieldCheck,
	Sparkles,
	UserCheck,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { GeneralCleaningSchedule } from "./GeneralCleaningSchedule";

export function GeneralCleaningRegisterTab() {
	const [logs, setLogs] = useState<GeneralCleaningLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [viewMode, setViewMode] = useState<"table" | "schedule">("table");
	const [isAutopilotLoading, setIsAutopilotLoading] = useState(false);

	// ⚡ 1-Клик автопилот графика генеральных уборок на месяц (по СанПиН каждые 7 дней)
	const handleAutopilotMonth = async () => {
		try {
			setIsAutopilotLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/cleaning/autopilot-month", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({}),
			});
			if (res.ok) {
				const data = await res.json().catch(() => ({}));
				showToast(
					`⚡ График генеральных уборок на месяц успешно заполнен (${data.count || 20} уборок по СанПиН 3.3686-21, интервал 7 дней)`,
					"success",
				);
				await fetchLogs();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при генерации графика", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при генерации графика", "error");
		} finally {
			setIsAutopilotLoading(false);
		}
	};

	// New cleaning form state
	const [formCleaningType, setFormCleaningType] = useState<CleaningType>("general");
	const [formScheduledDate, setFormScheduledDate] = useState(new Date().toISOString().slice(0, 10));
	const [formActualDateTime, setFormActualDateTime] = useState(new Date().toISOString().slice(0, 16));
	const [formRoomName, setFormRoomName] = useState("Операционная / Хирургический кабинет");
	const [formAreaM2, setFormAreaM2] = useState<number>(32.5);
	const [formDisinfectant, setFormDisinfectant] = useState("Аламинол 1.5%");
	const [formActiveIngredient, setFormActiveIngredient] = useState("ЧАС (алкилдиметилбензиламмоний хлорид) + Глутаровый альдегид");
	const [formConcentration, setFormConcentration] = useState<number>(1.5);
	const [formAppMethod, setFormAppMethod] = useState<CleaningApplicationMethod>("wiping");
	const [formExposureMin, setFormExposureMin] = useState<number>(60);
	const [formUvMin, setFormUvMin] = useState<number>(60);
	const [formVentilationMin, setFormVentilationMin] = useState<number>(15);
	const [formNotes, setFormNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/cleaning", {
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
			console.error("Failed to load cleaning logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateGeneralCleaningLogDto = {
				cleaningType: formCleaningType,
				scheduledDate: formScheduledDate,
				actualDateTime: new Date(formActualDateTime).toISOString(),
				roomName: formRoomName,
				treatedAreaM2: Number(formAreaM2),
				disinfectantName: formDisinfectant,
				activeIngredient: formActiveIngredient || undefined,
				solutionConcentrationPercent: Number(formConcentration),
				applicationMethod: formAppMethod,
				exposureTimeMinutes: Number(formExposureMin),
				uvIrradiationMinutes: Number(formUvMin),
				ventilationMinutes: Number(formVentilationMin),
				status: "completed",
				notes: formNotes || undefined,
			};

			const res = await fetch("/api/registers/cleaning", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Генеральная уборка успешно внесена в журнал", "success");
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

	const handleVerify = async (id: string) => {
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/cleaning/${id}/verify`, {
				method: "PUT",
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			});
			if (res.ok) {
				showToast("Качество уборки заверено ответственным лицом", "success");
				fetchLogs();
			}
		} catch (err) {
			showToast("Ошибка при подтверждении", "error");
		}
	};

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const matchSearch =
				!searchQuery ||
				log.roomName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.disinfectantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.operatorName?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchType =
				typeFilter === "all" || log.cleaningType === typeFilter;

			return matchSearch && matchType;
		});
	}, [logs, searchQuery, typeFilter]);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ЗАКЛЮЧИТЕЛЬНОЙ ДЕЗИНФЕКЦИИ</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»</p>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={16} style={{ position: "absolute", left: "0.6rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по кабинету, дезсредству..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2rem", minWidth: "260px" }}
						/>
					</div>
					<select
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
						className="sanpin-select"
					>
						<option value="all">Все виды уборок</option>
						<option value="general">Генеральные уборки</option>
						<option value="current_routine">Текущая дезинфекция</option>
					</select>
				</div>

				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={handleAutopilotMonth}
						disabled={isAutopilotLoading}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.15rem",
							fontSize: "0.875rem",
							fontWeight: 800,
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							cursor: "pointer",
							borderRadius: "8px",
							boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.45rem",
							whiteSpace: "nowrap",
						}}
						title="Автоматически заполнить график генеральных уборок на месяц с интервалом 7 дней для каждого кабинета клиники по СанПиН 3.3686-21"
						data-testid="nurse-cleaning-monthly-autopilot-btn"
					>
						<Sparkles size={16} />
						<span>
							{isAutopilotLoading
								? "Формирование графика..."
								: "⚡ Заполнить график уборок на месяц (7 дн.)"}
						</span>
					</button>

					<div style={{ display: "inline-flex", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", overflow: "hidden" }}>
						<button
							type="button"
							onClick={() => setViewMode("table")}
							style={{
								padding: "0.4rem 0.75rem",
								minHeight: "44px",
								fontSize: "0.825rem",
								fontWeight: 700,
								border: "none",
								cursor: "pointer",
								background: viewMode === "table" ? "var(--teal-soft, #f0fdfa)" : "var(--paper, #ffffff)",
								color: viewMode === "table" ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)",
							}}
						>
							Журнал (Таблица)
						</button>
						<button
							type="button"
							onClick={() => setViewMode("schedule")}
							style={{
								padding: "0.4rem 0.75rem",
								minHeight: "44px",
								fontSize: "0.825rem",
								fontWeight: 700,
								border: "none",
								borderLeft: "1px solid var(--line, #cbd5e1)",
								cursor: "pointer",
								background: viewMode === "schedule" ? "var(--teal-soft, #f0fdfa)" : "var(--paper, #ffffff)",
								color: viewMode === "schedule" ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)",
							}}
						>
							График на месяц (7 дн.)
						</button>
					</div>

					<button type="button" onClick={() => window.print()} className="sanpin-btn sanpin-btn-secondary">
						<Printer size={15} /> Печать журнала
					</button>
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
					>
						<Plus size={15} /> Зафиксировать уборку
					</button>
				</div>
			</div>

			{viewMode === "schedule" ? (
				<GeneralCleaningSchedule logs={logs} onScheduleUpdated={fetchLogs} />
			) : (
				<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th>План / Факт дата</th>
							<th>Помещение</th>
							<th>Площадь (м²)</th>
							<th>Дезсредство / Концентрация</th>
							<th>Экспозиция (мин)</th>
							<th>УФ-обеззараживание</th>
							<th>Проветривание</th>
							<th>Исполнитель</th>
							<th>Контроль / Подпись</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
									Загрузка журнала генеральных уборок...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Записи генеральных уборок не найдены.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => (
								<tr key={log.id}>
									<td>
										<div style={{ fontWeight: 600 }}>{log.scheduledDate}</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
											Факт: {new Date(log.actualDateTime).toLocaleDateString("ru-RU")}
										</div>
									</td>
									<td>
										<div style={{ fontWeight: 600 }}>{log.roomName}</div>
										<span className="sanpin-tag sanpin-tag-neutral">
											{log.cleaningType === "general" ? "Генеральная" : "Текущая"}
										</span>
									</td>
									<td>{log.treatedAreaM2} м²</td>
									<td>
										<div style={{ fontWeight: 500 }}>{log.disinfectantName}</div>
										<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
											Концентрация: {log.solutionConcentrationPercent}%
										</div>
									</td>
									<td>{log.exposureTimeMinutes} мин</td>
									<td>
										<span style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
											{log.uvIrradiationMinutes} мин
										</span>
									</td>
									<td>{log.ventilationMinutes} мин</td>
									<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Санитарка / Медсестра"}</td>
									<td>
										{log.status === "verified_by_inspector" ? (
											<span className="sanpin-tag sanpin-tag-success">
												<CheckCircle2 size={12} /> Проверено
											</span>
										) : (
											<button
												type="button"
												onClick={() => handleVerify(log.id)}
												style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
												className="sanpin-btn sanpin-btn-secondary"
											>
												<UserCheck size={12} /> Заверить
											</button>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			)}

			{/* Modal for new Cleaning Entry */}
			{isModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Проведение генеральной уборки (СанПиН 3.3686-21)</h3>
							<button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }} aria-label="Закрыть"><X size={18} /></button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Вид уборки</label>
										<select
											value={formCleaningType}
											onChange={(e) => setFormCleaningType(e.target.value as CleaningType)}
											className="sanpin-select"
										>
											<option value="general">Генеральная уборка (по графику, 1 раз в 7 дней)</option>
											<option value="current_routine">Текущая заключительная дезинфекция</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Помещение / Кабинет</label>
										<input
											type="text"
											required
											value={formRoomName}
											onChange={(e) => setFormRoomName(e.target.value)}
											className="sanpin-input"
											placeholder="Операционная / Кабинет терапии / ЦСО"
										/>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Плановая дата</label>
										<input
											type="date"
											required
											value={formScheduledDate}
											onChange={(e) => setFormScheduledDate(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Фактическая дата и время</label>
										<input
											type="datetime-local"
											required
											value={formActualDateTime}
											onChange={(e) => setFormActualDateTime(e.target.value)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Обработанная площадь (м²)</label>
										<input
											type="number"
											step="0.1"
											required
											value={formAreaM2}
											onChange={(e) => setFormAreaM2(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Способ применения</label>
										<select
											value={formAppMethod}
											onChange={(e) => setFormAppMethod(e.target.value as CleaningApplicationMethod)}
											className="sanpin-select"
										>
											<option value="wiping">Двукратное протирание ветошью</option>
											<option value="spraying">Орошение (распыление)</option>
											<option value="combined">Комбинированный</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Торговое наименование дезсредства</label>
										<input
											type="text"
											required
											value={formDisinfectant}
											onChange={(e) => setFormDisinfectant(e.target.value)}
											className="sanpin-input"
											placeholder="Аламинол / Септолит / Бриллиант"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Концентрация раствора (%)</label>
										<input
											type="number"
											step="0.1"
											required
											value={formConcentration}
											onChange={(e) => setFormConcentration(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Экспозиция (мин)</label>
										<input
											type="number"
											required
											value={formExposureMin}
											onChange={(e) => setFormExposureMin(parseInt(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">УФ-облучение (мин)</label>
										<input
											type="number"
											required
											value={formUvMin}
											onChange={(e) => setFormUvMin(parseInt(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Проветривание (мин)</label>
										<input
											type="number"
											required
											value={formVentilationMin}
											onChange={(e) => setFormVentilationMin(parseInt(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>
								</div>
							</div>
							<div className="sanpin-modal-footer">
								<button type="button" onClick={() => setIsModalOpen(false)} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
								<button type="submit" disabled={submitting} className="sanpin-btn sanpin-btn-primary">Зафиксировать уборку</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
