import {
	SanPiNRegulatoryEngine,
	type CreateTemperatureHumidityEquipmentDto,
	type CreateTemperatureHumidityLogDto,
	type TemperatureEquipmentType,
	type TemperatureHumidityEquipment,
	type TemperatureHumidityLog,
	type TemperatureMeasurementPeriod,
} from "@dental/shared";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Droplets,
	Plus,
	Printer,
	Search,
	ShieldCheck,
	Sparkles,
	Sun,
	Thermometer,
	ThermometerSnowflake,
	ThermometerSun,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export function TemperatureHumidityRegisterTab() {
	const [equipments, setEquipments] = useState<any[]>([]);
	const [logs, setLogs] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedEquipId, setSelectedEquipId] = useState<string>("all");

	// Modals
	const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
	const [isLogModalOpen, setIsLogModalOpen] = useState(false);

	// New Equipment Form
	const [equipType, setEquipType] = useState<TemperatureEquipmentType>("refrigerator_cold");
	const [equipName, setEquipName] = useState("Фармацевтический холодильник Pozis ХФ-250 (№1)");
	const [equipLocation, setEquipLocation] = useState("Процедурный кабинет / Стерилизационная");
	const [meterName, setMeterName] = useState("Электронный термометр-гигрометр ТМЦ-1");
	const [meterSerial, setMeterSerial] = useState("SN-TM-2024-918");
	const [targetMinTemp, setTargetMinTemp] = useState<number>(2.0);
	const [targetMaxTemp, setTargetMaxTemp] = useState<number>(8.0);
	const [targetMinHumidity, setTargetMinHumidity] = useState<number | undefined>(undefined);
	const [targetMaxHumidity, setTargetMaxHumidity] = useState<number | undefined>(undefined);

	// New Measurement Log Form
	const [logEquipId, setLogEquipId] = useState<string>("");
	const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
	const [logPeriod, setLogPeriod] = useState<TemperatureMeasurementPeriod>("morning");
	const [logTemp, setLogTemp] = useState<number>(4.2);
	const [logHumidity, setLogHumidity] = useState<number | undefined>(undefined);
	const [logDeviationReason, setLogDeviationReason] = useState("");
	const [logCorrectiveAction, setLogCorrectiveAction] = useState("");
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

			const [eqRes, lRes] = await Promise.all([
				fetch("/api/registers/temperature-humidity/equipments", { headers }),
				fetch("/api/registers/temperature-humidity/logs", { headers }),
			]);

			if (eqRes.ok) {
				const eqData = await eqRes.json();
				setEquipments(eqData);
				if (eqData.length > 0 && !logEquipId) {
					setLogEquipId(eqData[0].id);
				}
			}
			if (lRes.ok) {
				const lData = await lRes.json();
				setLogs(lData);
			}
		} catch (err) {
			console.error("Failed to load temperature data", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAll();
	}, []);

	// Active selected equipment object for live validation in modal
	const activeEquipObj = useMemo(() => {
		return equipments.find((e) => e.id === logEquipId);
	}, [equipments, logEquipId]);

	const liveEval = useMemo(() => {
		if (!activeEquipObj) return { isWithinNorm: true, deviationMessage: null };
		return SanPiNRegulatoryEngine.evaluateTemperatureHumidity({
			equipmentType: activeEquipObj.equipmentType,
			targetTempMin: activeEquipObj.targetTempMinCelsius,
			targetTempMax: activeEquipObj.targetTempMaxCelsius,
			actualTemp: Number(logTemp),
			targetHumidityMin: activeEquipObj.targetHumidityMinPercent,
			targetHumidityMax: activeEquipObj.targetHumidityMaxPercent,
			actualHumidity: logHumidity ? Number(logHumidity) : null,
		});
	}, [activeEquipObj, logTemp, logHumidity]);

	const [isLoggingShift, setIsLoggingShift] = useState(false);

	const handleShiftAutopilot = async (period: "morning" | "evening" = "morning") => {
		try {
			setIsLoggingShift(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers = {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};

			const res = await fetch("/api/registers/temperature-humidity/shift-autopilot", {
				method: "POST",
				headers,
				body: JSON.stringify({
					date: new Date().toISOString().slice(0, 10),
					period,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					`⚡ Норма температуры и влажности (${period === "morning" ? "утро" : "вечер"}) зафиксирована для всех ${data.count ?? equipments.length} объектов!`,
					"success",
				);
				await fetchAll();
			} else {
				// Fallback: log for each equipment sequentially
				let logged = 0;
				for (const eq of equipments) {
					const isFridge = eq.equipmentType?.includes("refrigerator");
					const fRes = await fetch("/api/registers/temperature-humidity/logs", {
						method: "POST",
						headers,
						body: JSON.stringify({
							equipmentId: eq.id,
							measurementDate: new Date().toISOString().slice(0, 10),
							measurementPeriod: period,
							temperatureCelsius: isFridge ? 4.2 : 21.5,
							relativeHumidityPercent: isFridge ? undefined : 48,
							notes: `⚡ 1-Клик норма смены (${period}): СанПиН 3.3686-21`,
						}),
					});
					if (fRes.ok) logged++;
				}
				showToast(`⚡ Норма зафиксирована для ${logged} объектов`, "success");
				await fetchAll();
			}
		} catch (e) {
			console.error("Temperature shift autopilot error", e);
			showToast("Ошибка сети при фиксации замеров смены", "error");
		} finally {
			setIsLoggingShift(false);
		}
	};

	const handleAddEquipment = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateTemperatureHumidityEquipmentDto = {
				equipmentType: equipType,
				name: equipName,
				location: equipLocation,
				meterDeviceName: meterName,
				meterSerialNumber: meterSerial || undefined,
				targetTempMinCelsius: Number(targetMinTemp),
				targetTempMaxCelsius: Number(targetMaxTemp),
				targetHumidityMinPercent: targetMinHumidity ? Number(targetMinHumidity) : undefined,
				targetHumidityMaxPercent: targetMaxHumidity ? Number(targetMaxHumidity) : undefined,
			};

			const res = await fetch("/api/registers/temperature-humidity/equipments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Объект контроля успешно добавлен в журнал", "success");
				setIsEquipModalOpen(false);
				fetchAll();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при создании объекта", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleAddLog = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateTemperatureHumidityLogDto = {
				equipmentId: logEquipId,
				measurementDate: logDate,
				measurementPeriod: logPeriod,
				temperatureCelsius: Number(logTemp),
				relativeHumidityPercent: logHumidity ? Number(logHumidity) : undefined,
				deviationReason: logDeviationReason || undefined,
				correctiveAction: logCorrectiveAction || undefined,
				notes: logNotes || undefined,
			};

			const res = await fetch("/api/registers/temperature-humidity/logs", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Замер температуры зафиксирован в журнале (Приказ 706н)", "success");
				setIsLogModalOpen(false);
				fetchAll();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении замера", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const filteredLogs = useMemo(() => {
		if (selectedEquipId === "all") return logs;
		return logs.filter((l) => l.equipmentId === selectedEquipId);
	}, [logs, selectedEquipId]);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ И ПОМЕЩЕНИЯХ ХРАНЕНИЯ ЛЕКАРСТВЕННЫХ СРЕДСТВ</h2>
				<p>Приказ Минздравсоцразвития РФ № 706н / Приказ Минздрава РФ № 646н</p>
			</div>

			{/* Equipment Cards for Refrigerators & Storage Rooms */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
				<h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Thermometer size={18} color="var(--brand-primary)" />
					Холодильное оборудование и зоны хранения медикаментов ({equipments.length} объектов)
				</h3>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => handleShiftAutopilot("morning")}
						disabled={isLoggingShift}
						className="sanpin-btn sanpin-btn-primary touch-manipulation"
						style={{
							minHeight: "44px",
							padding: "0.45rem 1rem",
							fontWeight: 700,
							background: "var(--teal, #0d9488)",
							borderColor: "var(--teal, #0d9488)",
							color: "#ffffff",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.4rem",
							boxShadow: "0 2px 6px rgba(13, 148, 136, 0.25)",
						}}
						title="1-Клик фиксация нормативных показателей температуры и влажности смены для всех объектов (холодильники +4.2°C, кабинеты +21.5°C / 48%)"
						data-testid="temp-shift-autopilot-btn"
					>
						<Sparkles size={16} />
						<span>{isLoggingShift ? "Фиксация..." : "⚡ 1-Клик норма смены"}</span>
					</button>
					<button
						type="button"
						onClick={() => setIsEquipModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px" }}
					>
						<Plus size={15} /> Добавить холодильник / комнату
					</button>
					<button
						type="button"
						onClick={() => setIsLogModalOpen(true)}
						disabled={equipments.length === 0}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px" }}
					>
						<ThermometerSun size={15} /> Внести замер вручную
					</button>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
				{equipments.map((eq) => (
					<div
						key={eq.id}
						style={{
							padding: "1rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--glass-border)",
							background: "var(--paper-subtle)",
							display: "flex",
							flexDirection: "column",
							gap: "0.4rem",
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
							<div>
								<div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{eq.name}</div>
								<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{eq.location}</div>
							</div>
							<span className="sanpin-tag sanpin-tag-success">
								{eq.equipmentType === "refrigerator_cold"
									? "+2..+8 °C"
									: eq.equipmentType === "refrigerator_cool"
										? "+8..+15 °C"
										: "+15..+25 °C"}
							</span>
						</div>

						<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
							Прибор учета: <strong style={{ color: "var(--ink)" }}>{eq.meterDeviceName}</strong>
							{eq.meterSerialNumber && ` (№${eq.meterSerialNumber})`}
						</div>

						<div
							style={{
								padding: "0.5rem",
								borderRadius: "0.375rem",
								background: "rgba(37, 99, 235, 0.08)",
								border: "1px solid rgba(37, 99, 235, 0.2)",
								display: "flex",
								justifyContent: "space-between",
								fontSize: "0.775rem",
								marginTop: "0.25rem",
							}}
						>
							<span>
								Норма T°: <strong>{eq.targetTempMinCelsius}°C .. {eq.targetTempMaxCelsius}°C</strong>
							</span>
							{eq.targetHumidityMaxPercent && (
								<span>
									Влажность: <strong>{eq.targetHumidityMinPercent || 30}% .. {eq.targetHumidityMaxPercent}%</strong>
								</span>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Filter Bar */}
			<div className="sanpin-control-bar" style={{ marginTop: "1rem" }}>
				<div className="sanpin-filter-group">
					<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Фильтр замеров:</span>
					<select
						value={selectedEquipId}
						onChange={(e) => setSelectedEquipId(e.target.value)}
						className="sanpin-select"
					>
						<option value="all">Все холодильники и комнаты</option>
						{equipments.map((e) => (
							<option key={e.id} value={e.id}>
								{e.name}
							</option>
						))}
					</select>
				</div>
				<button type="button" onClick={() => window.print()} className="sanpin-btn sanpin-btn-secondary">
					<Printer size={15} /> Печать журнала T° и влажности
				</button>
			</div>

			{/* Table of Measurements */}
			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th>Дата замера</th>
							<th>Время суток</th>
							<th>Объект контроля</th>
							<th>Фактическая T° (°C)</th>
							<th>Влажность (%)</th>
							<th>Норматив</th>
							<th>Статус соответствия</th>
							<th>Ответственный</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
									Загрузка журнала температурного режима...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Замеры температуры и влажности не найдены.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => (
								<tr key={log.id}>
									<td style={{ fontWeight: 600 }}>{log.measurementDate}</td>
									<td>
										<span className="sanpin-tag sanpin-tag-neutral">
											{log.measurementPeriod === "morning" ? "Утро (09:00)" : "Вечер (18:00)"}
										</span>
									</td>
									<td>
										<div style={{ fontWeight: 500 }}>{log.equipmentName}</div>
										<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>{log.location}</div>
									</td>
									<td>
										<span
											style={{
												fontWeight: 700,
												fontSize: "0.95rem",
												color: log.isWithinNorm ? "var(--ink)" : "#dc2626",
											}}
										>
											{log.temperatureCelsius}°C
										</span>
									</td>
									<td>
										{log.relativeHumidityPercent ? `${log.relativeHumidityPercent}%` : "—"}
									</td>
									<td style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
										[{log.targetTempMin}°C .. {log.targetTempMax}°C]
									</td>
									<td>
										{log.isWithinNorm ? (
											<span className="sanpin-tag sanpin-tag-success">
												<CheckCircle2 size={12} /> В норме
											</span>
										) : (
											<span
												className="sanpin-tag sanpin-tag-danger"
												title={log.deviationReason || "Отклонение от нормы"}
											>
												<AlertTriangle size={12} /> ОТКЛОНЕНИЕ
											</span>
										)}
									</td>
									<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Ответственная медсестра"}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Modal: Add Equipment */}
			{isEquipModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Регистрация холодильника / зоны хранения ЛС</h3>
							<button type="button" onClick={() => setIsEquipModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }} aria-label="Закрыть"><X size={18} /></button>
						</div>
						<form onSubmit={handleAddEquipment}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Тип объекта</label>
									<select
										value={equipType}
										onChange={(e) => {
											const t = e.target.value as TemperatureEquipmentType;
											setEquipType(t);
											if (t === "refrigerator_cold") {
												setTargetMinTemp(2.0);
												setTargetMaxTemp(8.0);
												setEquipName("Фармацевтический холодильник Pozis ХФ-250");
											} else if (t === "storage_room") {
												setTargetMinTemp(15.0);
												setTargetMaxTemp(25.0);
												setTargetMinHumidity(30);
												setTargetMaxHumidity(65);
												setEquipName("Комната хранения лекарственных препаратов");
											} else if (t === "refrigerator_cool") {
												setTargetMinTemp(8.0);
												setTargetMaxTemp(15.0);
												setEquipName("Прохладный шкаф для анестетиков");
											}
										}}
										className="sanpin-select"
									>
										<option value="refrigerator_cold">Холодильник фармацевтический (+2..+8 °C)</option>
										<option value="storage_room">Помещение хранения ЛС (+15..+25 °C, влажность 30..65%)</option>
										<option value="refrigerator_cool">Шкаф/холодильник прохладного хранения (+8..+15 °C)</option>
										<option value="freezer">Морозильник (&lt; -18 °C)</option>
									</select>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Наименование объекта</label>
									<input
										type="text"
										required
										value={equipName}
										onChange={(e) => setEquipName(e.target.value)}
										className="sanpin-input"
									/>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Место установки (кабинет)</label>
									<input
										type="text"
										required
										value={equipLocation}
										onChange={(e) => setEquipLocation(e.target.value)}
										className="sanpin-input"
									/>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Марка прибора учета (термометра)</label>
										<input
											type="text"
											required
											value={meterName}
											onChange={(e) => setMeterName(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Заводской номер прибора</label>
										<input
											type="text"
											value={meterSerial}
											onChange={(e) => setMeterSerial(e.target.value)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Минимальная T° (°C)</label>
										<input
											type="number"
											step="0.1"
											required
											value={targetMinTemp}
											onChange={(e) => setTargetMinTemp(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Максимальная T° (°C)</label>
										<input
											type="number"
											step="0.1"
											required
											value={targetMaxTemp}
											onChange={(e) => setTargetMaxTemp(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>
								</div>
							</div>
							<div className="sanpin-modal-footer">
								<button type="button" onClick={() => setIsEquipModalOpen(false)} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
								<button type="submit" disabled={submitting} className="sanpin-btn sanpin-btn-primary">Зарегистрировать</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modal: Add Log Measurement */}
			{isLogModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Фиксация замера температуры и влажности (Приказ 706н)</h3>
							<button type="button" onClick={() => setIsLogModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }} aria-label="Закрыть"><X size={18} /></button>
						</div>
						<form onSubmit={handleAddLog}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Объект контроля</label>
									<select
										required
										value={logEquipId}
										onChange={(e) => setLogEquipId(e.target.value)}
										className="sanpin-select"
									>
										{equipments.map((eq) => (
											<option key={eq.id} value={eq.id}>
												{eq.name} ({eq.targetTempMinCelsius}°C .. {eq.targetTempMaxCelsius}°C)
											</option>
										))}
									</select>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Дата замера</label>
										<input
											type="date"
											required
											value={logDate}
											onChange={(e) => setLogDate(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Период замера</label>
										<select
											value={logPeriod}
											onChange={(e) => setLogPeriod(e.target.value as TemperatureMeasurementPeriod)}
											className="sanpin-select"
										>
											<option value="morning">Утренний замер (09:00)</option>
											<option value="evening">Вечерний замер (18:00)</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Температура по термометру (°C)</label>
										<input
											type="number"
											step="0.1"
											required
											value={logTemp}
											onChange={(e) => setLogTemp(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Относительная влажность (%)</label>
										<input
											type="number"
											step="0.1"
											placeholder="Например: 45"
											value={logHumidity || ""}
											onChange={(e) => setLogHumidity(e.target.value ? parseFloat(e.target.value) : undefined)}
											className="sanpin-input"
										/>
									</div>
								</div>

								{/* Live status check */}
								<div
									style={{
										padding: "0.75rem",
										borderRadius: "0.375rem",
										background: liveEval.isWithinNorm ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
										border: `1px solid ${liveEval.isWithinNorm ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
										display: "flex",
										alignItems: "flex-start",
										gap: "0.5rem",
									}}
								>
									{liveEval.isWithinNorm ? (
										<CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
									) : (
										<AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
									)}
									<div style={{ fontSize: "0.8rem" }}>
										<div style={{ fontWeight: 600, color: liveEval.isWithinNorm ? "#059669" : "#dc2626" }}>
											{liveEval.isWithinNorm
												? "Показатели соответствуют требованиям Приказа 706н"
												: "ОТКЛОНЕНИЕ ОТ НОРМЫ ХРАНЕНИЯ ЛС!"}
										</div>
										{liveEval.deviationMessage && (
											<div style={{ marginTop: "0.25rem", color: "#dc2626" }}>
												{liveEval.deviationMessage}
											</div>
										)}
									</div>
								</div>

								{!liveEval.isWithinNorm && (
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Причина отклонения и принятые меры</label>
										<input
											type="text"
											required
											value={logCorrectiveAction}
											onChange={(e) => setLogCorrectiveAction(e.target.value)}
											className="sanpin-input"
											placeholder="Например: Препараты временно перемещены в резервный холодильник Pozis №2"
										/>
									</div>
								)}
							</div>
							<div className="sanpin-modal-footer">
								<button type="button" onClick={() => setIsLogModalOpen(false)} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
								<button type="submit" disabled={submitting} className="sanpin-btn sanpin-btn-primary">Зафиксировать замер</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
