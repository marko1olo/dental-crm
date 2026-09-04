import {
	type BactericidalDeviceType,
	type BactericidalEquipment,
	type BactericidalLogEntry,
	type BactericidalOperatingMode,
	type CreateBactericidalEquipmentDto,
	type CreateBactericidalLogEntryDto,
	generateBactericidalJournalPrintHtml,
} from "@dental/shared";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Layers,
	Moon,
	Plus,
	Printer,
	Radio,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	Sun,
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

	const calculateDurationFromTimes = (start: string, end: string): number => {
		const [rawSH = "", rawSM = ""] = start.split(":");
		const [rawEH = "", rawEM = ""] = end.split(":");
		const sH = Number(rawSH);
		const sM = Number(rawSM);
		const eH = Number(rawEH);
		const eM = Number(rawEM);
		if (Number.isNaN(sH) || Number.isNaN(sM) || Number.isNaN(eH) || Number.isNaN(eM)) return 0;
		let diff = eH * 60 + eM - (sH * 60 + sM);
		if (diff < 0) diff += 24 * 60;
		return diff;
	};

	const handleStartTimeChange = (val: string) => {
		setLogStartTime(val);
		const dur = calculateDurationFromTimes(val, logEndTime);
		if (dur > 0) setLogDurationMin(dur);
	};

	const handleEndTimeChange = (val: string) => {
		setLogEndTime(val);
		const dur = calculateDurationFromTimes(logStartTime, val);
		if (dur > 0) setLogDurationMin(dur);
	};

	const setPresetDuration = (minutes: number) => {
		setLogDurationMin(minutes);
		const [rawSH = "", rawSM = ""] = logStartTime.split(":");
		const sH = Number(rawSH);
		const sM = Number(rawSM);
		if (!Number.isNaN(sH) && !Number.isNaN(sM)) {
			const totalEndMin = (sH * 60 + sM + minutes) % (24 * 60);
			const eH = Math.floor(totalEndMin / 60);
			const eM = totalEndMin % 60;
			setLogEndTime(`${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`);
		}
	};

	const handleShiftAutopilot = async (durationHours = 6) => {
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const durationMinutes = durationHours * 60;

			const res = await fetch("/api/registers/bactericidal/shift-autopilot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					durationMinutes,
					date: new Date().toISOString().slice(0, 10),
					operatingMode: "continuous_presence",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					`⚡ Автоматический учет смены (${durationHours} ч) выполнен для всех ${data.results?.length ?? equipments.length} аппаратов!`,
					"success",
				);
				fetchAll();
			} else {
				// Fallback: iterate over equipments sequentially
				let updatedCount = 0;
				for (const eq of equipments) {
					const fRes = await fetch("/api/registers/bactericidal/logs", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
							...(staffToken ? { "X-Staff-Token": staffToken } : {}),
						},
						body: JSON.stringify({
							equipmentId: eq.id,
							date: new Date().toISOString().slice(0, 10),
							sessionStartTime: "08:00",
							sessionEndTime: `${String(8 + durationHours).padStart(2, "0")}:00`,
							durationMinutes,
							operatingMode: "continuous_presence",
							notes: `⚡ Авто-учет смены (${durationHours} ч) по Р 3.5.1904-04`,
						}),
					});
					if (fRes.ok) updatedCount++;
				}
				showToast(`⚡ Наработка ламп обновлена (+${durationHours} ч) для ${updatedCount} аппаратов`, "success");
				fetchAll();
			}
		} catch (err) {
			showToast("Сетевая ошибка при авто-учете смены", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handlePreShift30Min = async (equipmentId?: string) => {
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const durationMinutes = 30;

			const res = await fetch("/api/registers/bactericidal/shift-autopilot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					equipmentId,
					durationMinutes,
					date: new Date().toISOString().slice(0, 10),
					operatingMode: "pre_op_preparation",
					notes: "⚡ Включение баклампы перед сменой (30 мин) — предоперационная подготовка по СанПиН 3.3686-21",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					equipmentId
						? "⚡ Включение баклампы на 30 мин перед сменой зафиксировано!"
						: `⚡ Включение всех бакламп на 30 мин перед сменой зафиксировано (${data.results?.length ?? equipments.length} аппаратов)!`,
					"success",
				);
				fetchAll();
			} else {
				// Fallback: iterate over equipments sequentially
				const targetEqs = equipmentId ? equipments.filter((e) => e.id === equipmentId) : equipments;
				let updatedCount = 0;
				for (const eq of targetEqs) {
					const fRes = await fetch("/api/registers/bactericidal/logs", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
							...(staffToken ? { "X-Staff-Token": staffToken } : {}),
						},
						body: JSON.stringify({
							equipmentId: eq.id,
							date: new Date().toISOString().slice(0, 10),
							sessionStartTime: "07:30",
							sessionEndTime: "08:00",
							durationMinutes: 30,
							operatingMode: "pre_op_preparation",
							notes: "⚡ Включение баклампы перед сменой (30 мин) по СанПиН 3.3686-21",
						}),
					});
					if (fRes.ok) updatedCount++;
				}
				showToast(`⚡ Сеанс 30 мин перед сменой зафиксирован для ${updatedCount} аппаратов`, "success");
				fetchAll();
			}
		} catch (err) {
			showToast("Сетевая ошибка при фиксации 30-минутного сеанса", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenMorningShift = async (equipmentId?: string) => {
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const res = await fetch("/api/registers/bactericidal/open-morning-shift", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					equipmentId,
					date: new Date().toISOString().slice(0, 10),
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					data.message ||
						"⚡ Утренняя смена открыта: бактерицидная обработка 30 мин + норма зафиксированы!",
					"success",
				);
				fetchAll();
			} else {
				// Fallback to preShift30Min
				await handlePreShift30Min(equipmentId);
			}
		} catch (err) {
			showToast("Сетевая ошибка при открытии утренней смены", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleCloseEveningShift = async (equipmentId?: string) => {
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const res = await fetch("/api/registers/bactericidal/close-evening-shift", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					equipmentId,
					date: new Date().toISOString().slice(0, 10),
					shiftHours: 6,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					data.message ||
						"⚡ Вечерняя смена закрыта: финальная дезинфекция и наработка ламп зафиксированы!",
					"success",
				);
				fetchAll();
			} else {
				// Fallback: standard shift autopilot
				await handleShiftAutopilot(6);
			}
		} catch (err) {
			showToast("Сетевая ошибка при закрытии вечерней смены", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handlePrintBactericidalJournal = () => {
		if (equipments.length === 0) {
			showToast("Нет активных облучателей для формирования журнала", "warning");
			return;
		}

		const targetEquips = selectedEquipId === "all" ? equipments : equipments.filter((e) => e.id === selectedEquipId);
		const targetEquip = targetEquips[0] || equipments[0];
		const equipSessions = logs
			.filter((l) => selectedEquipId === "all" || l.equipmentId === targetEquip.id)
			.map((l) => {
				const sStart = l.sessionStartTime ? new Date(l.sessionStartTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "08:00";
				const sEnd = l.sessionEndTime ? new Date(l.sessionEndTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "08:30";
				const dur = Number(l.durationMinutes) || 30;
				return {
					id: l.id,
					equipmentId: targetEquip.id,
					roomName: targetEquip.roomName,
					deviceBrand: targetEquip.deviceBrand,
					date: l.date || new Date().toISOString().slice(0, 10),
					sessionStartTime: sStart,
					sessionEndTime: sEnd,
					durationMinutes: dur,
					durationHours: Number((dur / 60).toFixed(2)),
					operatingMode: (l.operatingMode as "continuous_presence" | "pre_op_preparation" | "post_cleaning" | "intermittent") || "continuous_presence",
					cumulativeHoursAfterSession: Number(l.cumulativeHoursAfterSession) || 0,
					operatorStaffFullName: l.operatorName || "Иванова О.С. (медсестра ЦСО)",
					notes: l.notes || "",
				};
			});

		const html = generateBactericidalJournalPrintHtml({
			equipment: {
				id: targetEquip.id,
				roomName: targetEquip.roomName,
				roomVolumeM3: Number(targetEquip.roomVolumeM3) || 45,
				deviceBrand: targetEquip.deviceBrand,
				serialNumber: targetEquip.serialNumber,
				deviceType: (targetEquip.deviceType as "recirculator_closed" | "irradiator_open" | "combined") || "recirculator_closed",
				lampType: targetEquip.lampType || "TUV 30W",
				lampCount: Number(targetEquip.lampCount) || 2,
				totalOperatingHours: Number(targetEquip.totalOperatingHours) || 0,
				maxLampHours: Number(targetEquip.maxLampHours) || 8000,
				remainingLampHours: Number(targetEquip.remainingLampHours) || (Number(targetEquip.maxLampHours || 8000) - Number(targetEquip.totalOperatingHours || 0)),
				remainingLampPercent: Number(targetEquip.remainingLampPercent) || 100,
				lampStatus: (targetEquip.lampStatus as "normal" | "warning_replace_soon" | "expired_replace_now") || "normal",
				isLampCritical: Boolean(targetEquip.isLampCritical),
			},
			sessions: equipSessions,
		});

		const printWin = window.open("", "_blank");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати журнала", "error");
			return;
		}
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 500);
		showToast("Журнал бактерицидной установки сформирован с нормативными штампами!", "success");
	};

	const filteredLogs = useMemo(() => {
		if (selectedEquipId === "all") return logs;
		return logs.filter((l) => l.equipmentId === selectedEquipId);
	}, [logs, selectedEquipId]);

	const activeSelectedEquip = useMemo(() => {
		return equipments.find((e) => e.id === logEquipId) || equipments[0];
	}, [equipments, logEquipId]);

	const hoursPreview = useMemo(() => {
		if (!activeSelectedEquip) return null;
		const cur = Number(activeSelectedEquip.totalOperatingHours || 0);
		const addH = Number((logDurationMin / 60).toFixed(2));
		const nextH = Number((cur + addH).toFixed(2));
		const maxH = Number(activeSelectedEquip.maxLampHours || 8000);
		const remH = Math.max(0, Number((maxH - nextH).toFixed(2)));
		const pct = Math.min(100, Math.round((nextH / maxH) * 100));
		return { cur, addH, nextH, maxH, remH, pct };
	}, [activeSelectedEquip, logDurationMin]);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ УЧЕТА РАБОТЫ БАКТЕРИЦИДНЫХ ОБЛУЧАТЕЛЕЙ И РЕЦИРКУЛЯТОРОВ ВОЗДУХА</h2>
				<p>Руководство Р 3.5.1904-04 / СанПиН 3.3686-21</p>
			</div>

			{/* Dominant 1-Click Pre-Shift 30min Hero Banner (SanPiN 3.3686-21) */}
			<div
				style={{
					background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(13, 148, 136, 0.06) 100%)",
					border: "2px solid var(--teal, #0d9488)",
					borderRadius: "0.85rem",
					padding: "1rem 1.25rem",
					marginTop: "0.5rem",
					marginBottom: "0.75rem",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "1.25rem",
					flexWrap: "wrap",
				}}
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
							СанПиН 3.3686-21
						</span>
						<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
							Подготовка воздуха перед началом рабочей смены
						</span>
					</div>
					<h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)" }}>
						Дезинфекция воздуха кабинетов и учет наработки ламп (СанПиН 3.3686-21)
					</h3>
					<p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
						1-клик фиксация утреннего кварцевания и закрытия смены без ручных расчетов на калькуляторе.
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={() => handleOpenMorningShift()}
						disabled={submitting || equipments.length === 0}
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
						data-testid="bactericidal-open-morning-shift-btn"
						title="Открыть утреннюю смену (бактерицидная обработка 30 мин + норма): зафиксировать предсменное обеззараживание воздуха по СанПиН 3.3686-21 для всех аппаратов"
					>
						<Sun size={17} />
						<span>⚡ Открыть утреннюю смену (кварцевание 30 мин + норма)</span>
					</button>

					<button
						type="button"
						onClick={() => handleCloseEveningShift()}
						disabled={submitting || equipments.length === 0}
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
							background: "var(--brand-primary, #0284c7)",
							color: "#ffffff",
							border: "none",
							boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
						}}
						data-testid="bactericidal-close-evening-shift-btn"
						title="Закрыть вечернюю смену (финальная дезинфекция): фиксирует дневную смену 6 ч + заключительное обеззараживание 30 мин без ручного счета"
					>
						<Moon size={17} />
						<span>⚡ Закрыть вечернюю смену (финальная дезинфекция)</span>
					</button>
				</div>
			</div>

			{/* Equipment Fleet Cards */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
				<h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Wind size={18} color="var(--brand-primary)" />
					Парк бактерицидных облучателей и рециркуляторов клиники ({equipments.length} шт.)
				</h3>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={() => handleOpenMorningShift()}
						disabled={submitting || equipments.length === 0}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "44px",
							height: "44px",
							padding: "0.4rem 0.95rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							cursor: "pointer",
							whiteSpace: "nowrap",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.4rem",
							borderRadius: "8px",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
						}}
						title="Включить все баклампы на 30 мин перед сменой (предоперационная подготовка)"
						data-testid="bactericidal-quick-30min-btn"
					>
						<Sun size={15} />
						<span>Утренняя смена (30 мин)</span>
					</button>
					<button
						type="button"
						onClick={() => handleCloseEveningShift()}
						disabled={submitting || equipments.length === 0}
						className="sanpin-btn touch-manipulation"
						style={{
							minHeight: "44px",
							height: "44px",
							padding: "0.4rem 0.95rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							cursor: "pointer",
							whiteSpace: "nowrap",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.4rem",
							borderRadius: "8px",
							background: "var(--brand-primary, #0284c7)",
							color: "#ffffff",
							border: "none",
						}}
						title="Закрыть смену: автоматический расчет наработки и финальная дезинфекция"
						data-testid="bactericidal-shift-autopilot-btn"
					>
						<Moon size={15} />
						<span>Закрыть смену (финал)</span>
					</button>
					<button
						type="button"
						onClick={() => setIsEquipModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "44px" }}
					>
						<Plus size={15} /> Добавить аппарат в реестр
					</button>
					<button
						type="button"
						onClick={() => setIsLogModalOpen(true)}
						disabled={equipments.length === 0}
						className="sanpin-btn sanpin-btn-primary touch-manipulation"
						style={{ minHeight: "44px" }}
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

							<div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", justifyContent: "flex-end", gap: "0.4rem", flexWrap: "wrap" }}>
								<button
									type="button"
									onClick={() => handlePreShift30Min(eq.id)}
									disabled={submitting}
									style={{
										minHeight: "44px",
										fontSize: "0.85rem",
										padding: "0.45rem 0.85rem",
										display: "inline-flex",
										alignItems: "center",
										gap: "0.35rem",
										color: "var(--teal, #0d9488)",
										borderColor: "var(--teal, #0d9488)",
										fontWeight: 600,
									}}
									className="sanpin-btn sanpin-btn-secondary touch-manipulation"
									title="Включить этот аппарат на 30 мин перед сменой (предоперационная подготовка по СанПиН)"
									data-testid={`bactericidal-card-quick-30min-${eq.id}`}
								>
									<Sparkles size={15} /> ⚡ 30 мин перед сменой
								</button>
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
						onClick={handlePrintBactericidalJournal}
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
						title="1-клик выгрузка официального Журнала регистрации и контроля работы бактерицидной установки со штампами по Р 3.5.1904-04 и СанПиН 3.3686-21"
						data-testid="bactericidal-print-official-btn"
					>
						<Printer size={15} /> <span>Печать журнала (Р 3.5.1904-04)</span>
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
								<div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
									<button
										type="button"
										onClick={() => {
											setPresetDuration(30);
											setLogStartTime("07:30");
											setLogEndTime("08:00");
											setLogMode("pre_op_preparation");
											setLogNotes("⚡ Включение баклампы перед сменой (30 мин) — норма СанПиН 3.3686-21");
										}}
										className="sanpin-btn sanpin-btn-secondary"
										style={{
											minHeight: "44px",
											fontSize: "0.82rem",
											padding: "0.4rem 0.85rem",
											fontWeight: 700,
											color: "var(--teal, #0d9488)",
											borderColor: "var(--teal, #0d9488)",
											display: "inline-flex",
											alignItems: "center",
											gap: "0.35rem",
										}}
										data-testid="log-modal-prefill-30min-btn"
									>
										<Sparkles size={14} /> ⚡ 30 мин перед сменой (норма СанПиН)
									</button>
								</div>

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
											onChange={(e) => handleStartTimeChange(e.target.value)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Время выключения</label>
										<input
											type="time"
											required
											value={logEndTime}
											onChange={(e) => handleEndTimeChange(e.target.value)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-group">
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
										<label className="sanpin-form-label" style={{ margin: 0 }}>
											Длительность работы (минут)
										</label>
										<div style={{ display: "flex", gap: "0.25rem" }}>
											<button
												type="button"
												onClick={() => setPresetDuration(30)}
												className="sanpin-btn sanpin-btn-secondary"
												style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
											>
												30м
											</button>
											<button
												type="button"
												onClick={() => setPresetDuration(60)}
												className="sanpin-btn sanpin-btn-secondary"
												style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
											>
												1ч
											</button>
											<button
												type="button"
												onClick={() => setPresetDuration(120)}
												className="sanpin-btn sanpin-btn-secondary"
												style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
											>
												2ч
											</button>
											<button
												type="button"
												onClick={() => setPresetDuration(360)}
												className="sanpin-btn sanpin-btn-secondary"
												style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", fontWeight: 700 }}
											>
												Смена 6ч
											</button>
										</div>
									</div>
									<input
										type="number"
										min={1}
										required
										value={logDurationMin}
										onChange={(e) => {
											const val = parseInt(e.target.value, 10) || 0;
											setLogDurationMin(val);
											const [rawSH = "", rawSM = ""] = logStartTime.split(":");
											const sH = Number(rawSH);
											const sM = Number(rawSM);
											if (!Number.isNaN(sH) && !Number.isNaN(sM)) {
												const totalEndMin = (sH * 60 + sM + val) % (24 * 60);
												const eH = Math.floor(totalEndMin / 60);
												const eM = totalEndMin % 60;
												setLogEndTime(`${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`);
											}
										}}
										className="sanpin-input"
									/>
									<span className="sanpin-form-hint">
										Эквивалентно {(logDurationMin / 60).toFixed(2)} часам наработки ламп
									</span>
								</div>

								{/* Компактный статус ресурса лампы */}
								{hoursPreview && (
									<div
										style={{
											padding: "0.5rem 0.75rem",
											borderRadius: "6px",
											background: "var(--paper-subtle, rgba(2,132,199,0.06))",
											border: "1px solid var(--glass-border)",
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											fontSize: "0.825rem",
										}}
									>
										<span style={{ color: "var(--ink)" }}>
											Наработка: <strong>{hoursPreview.nextH} ч</strong> из {hoursPreview.maxH} ч (остаток {hoursPreview.remH} ч)
										</span>
										<span style={{ fontWeight: 600, color: hoursPreview.pct >= 90 ? "#dc2626" : "#10b981" }}>
											{hoursPreview.pct >= 100 ? "⚠️ Замена ламп" : hoursPreview.pct >= 90 ? "⚠️ Скоро замена" : "✓ Ресурс в норме"}
										</span>
									</div>
								)}
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
