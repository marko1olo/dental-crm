import {
	SanPiNRegulatoryEngine,
	type CreateTemperatureHumidityEquipmentDto,
	type CreateTemperatureHumidityLogDto,
	type TemperatureEquipmentType,
	type TemperatureMeasurementPeriod,
} from "@dental/shared";
import {
	Plus,
	Printer,
	Sparkles,
	Thermometer,
	ThermometerSun,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { TemperatureAddEquipmentModal } from "./TemperatureAddEquipmentModal";
import { TemperatureAddLogModal } from "./TemperatureAddLogModal";
import { TemperatureMeasurementTable } from "./TemperatureMeasurementTable";

export const CANONICAL_TEMPERATURE_EQUIPMENT_PRESETS: CreateTemperatureHumidityEquipmentDto[] = [
	{
		equipmentType: "refrigerator_cold",
		name: "Фармацевтический холодильник Pozis ХФ-250 (№1)",
		location: "Процедурный кабинет / Стерилизационная",
		meterDeviceName: "Электронный термометр-гигрометр ТМЦ-1",
		meterSerialNumber: "SN-TM-2024-918",
		targetTempMinCelsius: 2.0,
		targetTempMaxCelsius: 8.0,
		targetHumidityMinPercent: undefined,
		targetHumidityMaxPercent: undefined,
	},
	{
		equipmentType: "storage_room",
		name: "Кабинет терапевтической стоматологии №1 (ВИТ-2)",
		location: "Основной лечебный блок (Кабинет №1)",
		meterDeviceName: "Психрометрический гигрометр ВИТ-2",
		meterSerialNumber: "VIT2-4412",
		targetTempMinCelsius: 15.0,
		targetTempMaxCelsius: 25.0,
		targetHumidityMinPercent: 30,
		targetHumidityMaxPercent: 65,
	},
];

export async function provisionCanonicalTemperatureEquipments(options?: {
	customFetch?: typeof fetch;
	headers?: Record<string, string>;
}): Promise<any[]> {
	const fetchFn = options?.customFetch || (typeof fetch !== "undefined" ? fetch : undefined);
	if (!fetchFn) return [];
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
		...(staffToken ? { "X-Staff-Token": staffToken } : {}),
		...(options?.headers || {}),
	};

	const createdList: any[] = [];
	for (const preset of CANONICAL_TEMPERATURE_EQUIPMENT_PRESETS) {
		const res = await fetchFn("/api/registers/temperature-humidity/equipments", {
			method: "POST",
			headers,
			body: JSON.stringify(preset),
		});
		if (res.ok) {
			const item = await res.json();
			createdList.push(item);
		}
	}
	return createdList;
}

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

	const handleProvisionCanonicalEquipment = async (showSuccessToast = true): Promise<any[]> => {
		try {
			setSubmitting(true);
			const createdList = await provisionCanonicalTemperatureEquipments();
			if (createdList.length > 0) {
				if (showSuccessToast) {
					showToast("Типовое оснащение (Холодильник Pozis + Кабинет ВИТ-2) успешно подключено!", "success");
				}
				await fetchAll();
				setLogEquipId(createdList[0].id);
				return createdList;
			} else {
				showToast("Ошибка при подключении типового оснащения", "error");
				return [];
			}
		} catch (err) {
			console.error("Provisioning error", err);
			showToast("Сетевая ошибка при подключении типового оснащения", "error");
			return [];
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenLogModal = async () => {
		if (equipments.length === 0) {
			const provisioned = await handleProvisionCanonicalEquipment(false);
			if (provisioned && provisioned.length > 0) {
				setLogEquipId(provisioned[0].id);
			}
		}
		setIsLogModalOpen(true);
	};

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

			let currentEquips = equipments;
			if (currentEquips.length === 0) {
				currentEquips = await handleProvisionCanonicalEquipment(false);
			}

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
					`Норма температуры и влажности (${period === "morning" ? "утро" : "вечер"}) зафиксирована для всех ${data.count ?? (currentEquips.length || 2)} объектов!`,
					"success",
				);
				await fetchAll();
			} else {
				let logged = 0;
				for (const eq of currentEquips) {
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
							notes: `Норма смены (${period}): Санитарный регламент`,
						}),
					});
					if (fRes.ok) logged++;
				}
				showToast(`Норма зафиксирована для ${logged} объектов`, "success");
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
						aria-busy={isLoggingShift}
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
						title="Фиксация нормативных показателей температуры и влажности смены для всех объектов (холодильники +4.2°C, кабинеты +21.5°C / 48%)"
						data-testid="temp-shift-autopilot-btn"
					>
						<Sparkles size={16} />
						<span>{isLoggingShift ? "Фиксация..." : "Зафиксировать норму смены"}</span>
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
						onClick={handleOpenLogModal}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px" }}
						data-testid="temp-manual-log-btn"
					>
						<ThermometerSun size={15} /> Внести замер вручную
					</button>
				</div>
			</div>

			{/* Zero-Setup Autonomy Banner (Mandate 8e, 8n) */}
			{equipments.length === 0 && (
				<div
					className="sanpin-zero-setup-banner"
					style={{
						background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(37, 99, 235, 0.06) 100%)",
						border: "2px dashed var(--teal, #0d9488)",
						borderRadius: "0.85rem",
						padding: "1.1rem 1.25rem",
						marginTop: "0.75rem",
						marginBottom: "0.75rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "1.25rem",
						flexWrap: "wrap",
					}}
					data-testid="temp-zero-setup-banner"
				>
					<div style={{ flex: "1 1 320px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
							<span
								style={{
									padding: "0.2rem 0.5rem",
									borderRadius: "0.4rem",
									background: "var(--teal, #0d9488)",
									color: "#ffffff",
									fontSize: "0.75rem",
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Санитарный регламент • Автозаполнение
							</span>
							<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
								Быстрый старт для соло-врача и малых клиник
							</span>
						</div>
						<div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)", marginBottom: "0.2rem" }}>
							Объекты температурного учета не зарегистрированы
						</div>
						<p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
							Подключите типовое оснащение (холодильник Pozis ХФ-250 для анестетиков + гигрометр ВИТ-2 в кабинете) по регламентному профилю для автоматического ведения журнала.
						</p>
					</div>
					<button
						type="button"
						onClick={() => handleProvisionCanonicalEquipment(true)}
						aria-busy={submitting || isLoggingShift}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "44px",
							padding: "0.55rem 1.15rem",
							fontSize: "0.875rem",
							fontWeight: 800,
							cursor: "pointer",
							whiteSpace: "nowrap",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.45rem",
							borderRadius: "8px",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
						}}
						data-testid="temp-zero-setup-provision-btn"
						title="Подключить типовое оснащение: фармацевтический холодильник Pozis ХФ-250 (+2..+8°C) и Кабинет терапевтической стоматологии №1 с гигрометром ВИТ-2 (+15..+25°C, влажность 30..65%)"
					>
						<Sparkles size={17} />
						<span>Подключить типовое оснащение (Холодильник Pozis + Кабинет ВИТ-2)</span>
					</button>
				</div>
			)}

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
			<TemperatureMeasurementTable
				loading={loading}
				filteredLogs={filteredLogs}
			/>

			{/* Modal: Add Equipment */}
			<TemperatureAddEquipmentModal
				isOpen={isEquipModalOpen}
				onClose={() => setIsEquipModalOpen(false)}
				equipType={equipType}
				setEquipType={setEquipType}
				equipName={equipName}
				setEquipName={setEquipName}
				equipLocation={equipLocation}
				setEquipLocation={setEquipLocation}
				meterName={meterName}
				setMeterName={setMeterName}
				meterSerial={meterSerial}
				setMeterSerial={setMeterSerial}
				targetMinTemp={targetMinTemp}
				setTargetMinTemp={setTargetMinTemp}
				targetMaxTemp={targetMaxTemp}
				setTargetMaxTemp={setTargetMaxTemp}
				setTargetMinHumidity={setTargetMinHumidity}
				setTargetMaxHumidity={setTargetMaxHumidity}
				onSubmit={handleAddEquipment}
				submitting={submitting}
			/>

			{/* Modal: Add Log Measurement */}
			<TemperatureAddLogModal
				isOpen={isLogModalOpen}
				onClose={() => setIsLogModalOpen(false)}
				equipments={equipments}
				logEquipId={logEquipId}
				setLogEquipId={setLogEquipId}
				logDate={logDate}
				setLogDate={setLogDate}
				logPeriod={logPeriod}
				setLogPeriod={setLogPeriod}
				logTemp={logTemp}
				setLogTemp={setLogTemp}
				logHumidity={logHumidity}
				setLogHumidity={setLogHumidity}
				liveEval={liveEval}
				logCorrectiveAction={logCorrectiveAction}
				setLogCorrectiveAction={setLogCorrectiveAction}
				onSubmit={handleAddLog}
				submitting={submitting}
			/>
		</div>
	);
}

export * from "./TemperatureAddEquipmentModal";
export * from "./TemperatureAddLogModal";
export * from "./TemperatureMeasurementTable";
