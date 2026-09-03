import {
	type BactericidalDeviceType,
	type BactericidalEquipment,
	type BactericidalLogEntry,
	type BactericidalOperatingMode,
	type CreateBactericidalEquipmentDto,
	type CreateBactericidalLogEntryDto,
} from "@dental/shared";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Layers,
	Plus,
	Printer,
	Radio,
	RefreshCw,
	Sparkles,
	Trash2,
	Wind,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export function BactericidalRegisterTab() {
	const [equipments, setEquipments] = useState<any[]>([]);
	const [logs, setLogs] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedEquipId, setSelectedEquipId] = useState<string>("all");

	// Modals
	const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
	const [isLogModalOpen, setIsLogModalOpen] = useState(false);

	// New equipment form
	const [newRoomName, setNewRoomName] = useState("Кабинет терапевтической стоматологии №1");
	const [newRoomVolume, setNewRoomVolume] = useState<number>(45.0);
	const [newDeviceBrand, setNewDeviceBrand] = useState("Дезар-4 (ОРУБн-3-3-«КРОНТ»)");
	const [newSerialNumber, setNewSerialNumber] = useState("DZ-004812");
	const [newDeviceType, setNewDeviceType] = useState<BactericidalDeviceType>("recirculator_closed");
	const [newMaxHours, setNewMaxHours] = useState<number>(8000);

	// New log session form
	const [logEquipId, setLogEquipId] = useState<string>("");
	const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
	const [logStartTime, setLogStartTime] = useState("08:00");
	const [logEndTime, setLogEndTime] = useState("14:00");
	const [logDurationMin, setLogDurationMin] = useState<number>(360);
	const [logMode, setLogMode] = useState<BactericidalOperatingMode>("continuous_presence");
	const [logNotes, setLogNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const fetchAll = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers = {
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};

			const [equipRes, logRes] = await Promise.all([
				fetch("/api/registers/bactericidal/equipments", { headers }),
				fetch("/api/registers/bactericidal/logs", { headers }),
			]);

			if (equipRes.ok) {
				const eqData = await equipRes.json();
				setEquipments(eqData);
				if (eqData.length > 0 && !logEquipId) {
					setLogEquipId(eqData[0].id);
				}
			}
			if (logRes.ok) {
				const lData = await logRes.json();
				setLogs(lData);
			}
		} catch (err) {
			console.error("Failed to load bactericidal data", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAll();
	}, []);

	const handleAddEquipment = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateBactericidalEquipmentDto = {
				roomName: newRoomName,
				roomVolumeM3: Number(newRoomVolume),
				deviceBrand: newDeviceBrand,
				serialNumber: newSerialNumber,
				deviceType: newDeviceType,
				maxLampHours: Number(newMaxHours),
			};

			const res = await fetch("/api/registers/bactericidal/equipments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Облучатель/рециркулятор успешно поставлен на учет", "success");
				setIsEquipModalOpen(false);
				fetchAll();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при регистрации прибора", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleAddSession = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateBactericidalLogEntryDto = {
				equipmentId: logEquipId,
				date: logDate,
				sessionStartTime: logStartTime,
				sessionEndTime: logEndTime,
				durationMinutes: Number(logDurationMin),
				operatingMode: logMode,
				notes: logNotes || undefined,
			};

			const res = await fetch("/api/registers/bactericidal/logs", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Сеанс работы зафиксирован, часы наработки обновлены", "success");
				setIsLogModalOpen(false);
				fetchAll();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении сеанса", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleReplaceLamps = async (equipmentId: string, deviceBrand: string) => {
		if (
			!window.confirm(
				`Подтверждаете установку новых бактерицидных ламп в аппарат «${deviceBrand}»? Наработка часов будет сброшена на 0, а статус переведен в «Норма».`,
			)
		) {
			return;
		}

		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/bactericidal/equipments/${equipmentId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({ action: "replace_lamps" }),
			});

			if (res.ok) {
				showToast("Замена ламп зафиксирована. Счетчик обнулен.", "success");
				fetchAll();
			}
		} catch (err) {
			showToast("Ошибка при сбросе счетчика ламп", "error");
		}
	};

	const filteredLogs = useMemo(() => {
		if (selectedEquipId === "all") return logs;
		return logs.filter((l) => l.equipmentId === selectedEquipId);
	}, [logs, selectedEquipId]);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ УЧЕТА РАБОТЫ БАКТЕРИЦИДНЫХ ОБЛУЧАТЕЛЕЙ И РЕЦИРКУЛЯТОРОВ ВОЗДУХА</h2>
				<p>Руководство Р 3.5.1904-04 / СанПиН 3.3686-21</p>
			</div>

			{/* Equipment Fleet Cards */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
				<h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Wind size={18} color="var(--brand-primary)" />
					Парк бактерицидных облучателей и рециркуляторов клиники ({equipments.length} шт.)
				</h3>
				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button
						type="button"
						onClick={() => setIsEquipModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
					>
						<Plus size={15} /> Добавить аппарат в реестр
					</button>
					<button
						type="button"
						onClick={() => setIsLogModalOpen(true)}
						disabled={equipments.length === 0}
						className="sanpin-btn sanpin-btn-primary"
					>
						<Clock size={15} /> Внести сеанс облучения
					</button>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
				{equipments.map((eq) => {
					const fillClass =
						eq.lampStatus === "expired_replace_now"
							? "expired"
							: eq.lampStatus === "warning_replace_soon"
								? "warning"
								: "normal";

					return (
						<div
							key={eq.id}
							style={{
								padding: "1rem",
								borderRadius: "0.5rem",
								border: `1px solid ${eq.lampStatus === "expired_replace_now" ? "rgba(239,68,68,0.5)" : "var(--glass-border)"}`,
								background: "var(--paper-subtle)",
								display: "flex",
								flexDirection: "column",
								gap: "0.5rem",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
								<div>
									<div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{eq.deviceBrand}</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
										{eq.roomName} (V = {eq.roomVolumeM3} м³)
									</div>
								</div>
								<span className={`sanpin-tag sanpin-tag-${fillClass === "expired" ? "danger" : fillClass === "warning" ? "warning" : "success"}`}>
									{fillClass === "expired" ? "РЕСУРС ИСЧЕРПАН" : fillClass === "warning" ? "СКОРО ЗАМЕНА" : "НОРМА"}
								</span>
							</div>

							<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
								Зав. №: <strong style={{ color: "var(--ink)" }}>{eq.serialNumber}</strong> | Лампы: {eq.lampType} ({eq.lampCount} шт.)
							</div>

							{/* Progress Bar of Operating Hours */}
							<div>
								<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
									<span>Наработка: <strong>{eq.totalOperatingHours} ч</strong></span>
									<span>Лимит: <strong>{eq.maxLampHours} ч</strong></span>
								</div>
								<div className="sanpin-progress-track">
									<div
										className={`sanpin-progress-fill ${fillClass}`}
										style={{ width: `${Math.min(100, (eq.totalOperatingHours / eq.maxLampHours) * 100)}%` }}
									/>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.725rem", marginTop: "0.25rem", color: "var(--muted)" }}>
									<span>Остаток ресурса: <strong>{eq.remainingLampHours} ч</strong> ({eq.remainingLampPercent}%)</span>
									{eq.lastLampReplacementDate && <span>Замена: {eq.lastLampReplacementDate}</span>}
								</div>
							</div>

							{eq.lampWarningMessage && (
								<div style={{ fontSize: "0.75rem", color: eq.isLampCritical ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
									{eq.lampWarningMessage}
								</div>
							)}

							<div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
								<button
									type="button"
									onClick={() => handleReplaceLamps(eq.id, eq.deviceBrand)}
									style={{ minHeight: "44px", fontSize: "0.85rem", padding: "0.45rem 0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
									className="sanpin-btn sanpin-btn-secondary touch-manipulation"
								>
									<RefreshCw size={15} /> Замена ламп (сброс)
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Session Logs Table with Integrated Compact Filter Header */}
			<div className="sanpin-table-wrapper" style={{ marginTop: "0.5rem" }}>
				<div
					className="sanpin-table-toolbar"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "0.5rem",
						padding: "0.35rem 0.65rem",
						background: "var(--paper-soft, #f8fafc)",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						flexWrap: "wrap",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
						<span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>Фильтр:</span>
						<select
							value={selectedEquipId}
							onChange={(e) => setSelectedEquipId(e.target.value)}
							className="sanpin-select"
							style={{ minHeight: "44px", height: "44px", fontSize: "0.85rem", padding: "0.4rem 0.75rem", borderRadius: "8px" }}
						>
							<option value="all">Все облучатели клиники</option>
							{equipments.map((e) => (
								<option key={e.id} value={e.id}>
									{e.roomName} ({e.deviceBrand})
								</option>
							))}
						</select>
					</div>
					<button
						type="button"
						onClick={() => window.print()}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{
							minHeight: "44px",
							height: "44px",
							padding: "0.4rem 0.85rem",
							fontSize: "0.85rem",
							fontWeight: 600,
							cursor: "pointer",
							whiteSpace: "nowrap",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "8px",
						}}
					>
						<Printer size={15} /> <span>Печать журнала наработки</span>
					</button>
				</div>
				<table className="sanpin-table">
					<thead>
						<tr>
							<th>Дата сеанса</th>
							<th>Кабинет / Аппарат</th>
							<th>Время включения / выключения</th>
							<th>Длительность (мин / ч)</th>
							<th>Режим обеззараживания</th>
							<th>Наработка после сеанса (ч)</th>
							<th>Ответственный</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
									Загрузка журнала сеансов...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Сеансы бактерицидной обработки не зафиксированы.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => (
								<tr key={log.id}>
									<td style={{ fontWeight: 600 }}>{log.date}</td>
									<td>
										<div>{log.roomName}</div>
										<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
											{log.deviceBrand} (№{log.serialNumber})
										</div>
									</td>
									<td>
										{new Date(log.sessionStartTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
										{" — "}
										{new Date(log.sessionEndTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									</td>
									<td>
										<span style={{ fontWeight: 600 }}>{log.durationMinutes} мин</span>
										<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}> ({log.durationHours} ч)</span>
									</td>
									<td>
										<span className="sanpin-tag sanpin-tag-neutral">
											{log.operatingMode === "continuous_presence"
												? "В присутствии людей"
												: log.operatingMode === "pre_op_preparation"
													? "Предоперационная подготовка"
													: log.operatingMode === "post_cleaning"
														? "Заключительная после уборки"
														: "Периодический"}
										</span>
									</td>
									<td style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
										{log.cumulativeHoursAfterSession} ч
									</td>
									<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Медсестра кабинета"}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Modal: Add equipment */}
			{isEquipModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Регистрация бактерицидного облучателя / рециркулятора</h3>
							<button type="button" onClick={() => setIsEquipModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }} aria-label="Закрыть"><X size={18} /></button>
						</div>
						<form onSubmit={handleAddEquipment}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Помещение / Кабинет</label>
									<input
										type="text"
										required
										value={newRoomName}
										onChange={(e) => setNewRoomName(e.target.value)}
										className="sanpin-input"
										placeholder="Кабинет хирургии / Стерилизационная"
									/>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Объем помещения (V, м³)</label>
										<input
											type="number"
											step="0.1"
											required
											value={newRoomVolume}
											onChange={(e) => setNewRoomVolume(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Тип облучателя</label>
										<select
											value={newDeviceType}
											onChange={(e) => setNewDeviceType(e.target.value as BactericidalDeviceType)}
											className="sanpin-select"
										>
											<option value="recirculator_closed">Рециркулятор закрытого типа (в присутствии людей)</option>
											<option value="irradiator_open">Облучатель открытого типа (только без людей)</option>
											<option value="combined">Комбинированный</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Марка / модель аппарата</label>
										<input
											type="text"
											required
											value={newDeviceBrand}
											onChange={(e) => setNewDeviceBrand(e.target.value)}
											className="sanpin-input"
											placeholder="Дезар-4 / Кронт / Сибэст"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Заводской номер</label>
										<input
											type="text"
											required
											value={newSerialNumber}
											onChange={(e) => setNewSerialNumber(e.target.value)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Паспортный ресурс ламп (ч)</label>
									<input
										type="number"
										required
										value={newMaxHours}
										onChange={(e) => setNewMaxHours(parseInt(e.target.value) || 8000)}
										className="sanpin-input"
									/>
									<span className="sanpin-form-hint">Стандарт для безозоновых ламп Philips TUV / Osram: 8000-9000 часов</span>
								</div>
							</div>
							<div className="sanpin-modal-footer">
								<button type="button" onClick={() => setIsEquipModalOpen(false)} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
								<button type="submit" disabled={submitting} className="sanpin-btn sanpin-btn-primary">Поставить на учет</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modal: Add Session Log */}
			{isLogModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Фиксация сеанса работы бактерицидного облучателя</h3>
							<button type="button" onClick={() => setIsLogModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }} aria-label="Закрыть"><X size={18} /></button>
						</div>
						<form onSubmit={handleAddSession}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Выберите облучатель / помещение</label>
									<select
										required
										value={logEquipId}
										onChange={(e) => setLogEquipId(e.target.value)}
										className="sanpin-select"
									>
										{equipments.map((e) => (
											<option key={e.id} value={e.id}>
												{e.roomName} — {e.deviceBrand} (Зав. №{e.serialNumber})
											</option>
										))}
									</select>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Дата сеанса</label>
										<input
											type="date"
											required
											value={logDate}
											onChange={(e) => setLogDate(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Режим обеззараживания</label>
										<select
											value={logMode}
											onChange={(e) => setLogMode(e.target.value as BactericidalOperatingMode)}
											className="sanpin-select"
										>
											<option value="continuous_presence">В присутствии людей (рабочая смена)</option>
											<option value="pre_op_preparation">Предоперационная подготовка (30-60 мин)</option>
											<option value="post_cleaning">После генеральной уборки</option>
											<option value="intermittent">Периодический режим</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Время включения</label>
										<input
											type="time"
											required
											value={logStartTime}
											onChange={(e) => setLogStartTime(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Время выключения</label>
										<input
											type="time"
											required
											value={logEndTime}
											onChange={(e) => setLogEndTime(e.target.value)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Длительность работы (минут)</label>
									<input
										type="number"
										min={1}
										required
										value={logDurationMin}
										onChange={(e) => setLogDurationMin(parseInt(e.target.value) || 0)}
										className="sanpin-input"
									/>
									<span className="sanpin-form-hint">
										Эквивалентно {(logDurationMin / 60).toFixed(2)} часам наработки ламп
									</span>
								</div>
							</div>
							<div className="sanpin-modal-footer">
								<button type="button" onClick={() => setIsLogModalOpen(false)} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
								<button type="submit" disabled={submitting} className="sanpin-btn sanpin-btn-primary">Зафиксировать сеанс</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
