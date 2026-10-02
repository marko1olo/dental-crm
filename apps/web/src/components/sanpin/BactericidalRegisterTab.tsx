import {
	type BactericidalDeviceType,
	type BactericidalOperatingMode,
	type CreateBactericidalEquipmentDto,
	type CreateBactericidalLogEntryDto,
} from "@dental/shared";
import {
	Clock,
	Moon,
	Plus,
	Sparkles,
	Sun,
	Wind,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { BactericidalAddEquipmentModal } from "./BactericidalAddEquipmentModal";
import { BactericidalAddSessionModal } from "./BactericidalAddSessionModal";
import { BactericidalFleetGrid } from "./BactericidalFleetGrid";
import { BactericidalLogTable } from "./BactericidalLogTable";
import {
	executePreShift30Min,
	executeShiftAutopilot,
	handlePrintBactericidalJournal,
} from "./bactericidalShiftHelpers";

export const CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET: CreateBactericidalEquipmentDto = {
	roomName: "Кабинет терапевтической стоматологии №1",
	roomVolumeM3: 45.0,
	deviceBrand: "Дезар-4 (ОРУБн-3-3-«КРОНТ»)",
	serialNumber: "DZ-004812",
	deviceType: "recirculator_closed",
	lampType: "TUV 15W / 30W",
	lampCount: 3,
	maxLampHours: 8000,
	totalOperatingHours: 0,
};

export async function provisionCanonicalBactericidalEquipment(options?: {
	customFetch?: typeof fetch;
	headers?: Record<string, string>;
}): Promise<any | null> {
	const fetchFn = options?.customFetch || (typeof fetch !== "undefined" ? fetch : undefined);
	if (!fetchFn) return null;
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
		...(staffToken ? { "X-Staff-Token": staffToken } : {}),
		...(options?.headers || {}),
	};

	const res = await fetchFn("/api/registers/bactericidal/equipments", {
		method: "POST",
		headers,
		body: JSON.stringify(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET),
	});

	if (res.ok) {
		return await res.json();
	}
	return null;
}

export function BactericidalRegisterTab() {
	const appLogic = useOptionalAppLogicContext();
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
		if (submitting) return;
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
		if (submitting) return;
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

	const handleProvisionCanonicalEquipment = async (showSuccessToast = true): Promise<any[]> => {
		if (submitting) return [];
		try {
			setSubmitting(true);
			const created = await provisionCanonicalBactericidalEquipment();
			if (created) {
				if (showSuccessToast) {
					showToast("Типовой рециркулятор (Дезар-4, Кабинет №1) успешно подключен!", "success");
				}
				await fetchAll();
				setLogEquipId(created.id);
				return [created];
			} else {
				showToast("Ошибка при подключении типового рециркулятора", "error");
				return [];
			}
		} catch (err) {
			console.error("Bactericidal provision error", err);
			showToast("Сетевая ошибка при подключении типового рециркулятора", "error");
			return [];
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenLogModal = async () => {
		if (equipments.length === 0) {
			const created = await handleProvisionCanonicalEquipment(false);
			if (created && created.length > 0) {
				setLogEquipId(created[0].id);
			}
		}
		setIsLogModalOpen(true);
	};

	const handlePreShift30Min = async (equipmentId?: string) => {
		if (submitting) return;
		try {
			setSubmitting(true);
			let currentEquips = equipments;
			if (currentEquips.length === 0) {
				currentEquips = await handleProvisionCanonicalEquipment(false);
				if (currentEquips.length === 0) {
					showToast("Не удалось подключить типовой рециркулятор", "error");
					return;
				}
			}
			const targetId = equipmentId || (currentEquips.length === 1 ? currentEquips[0].id : undefined);
			await executePreShift30Min(targetId, currentEquips, fetchAll);
		} catch (err) {
			showToast("Сетевая ошибка при фиксации 30-минутного сеанса", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenMorningShift = async (equipmentId?: string) => {
		if (submitting) return;
		try {
			setSubmitting(true);
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
				if (currentEquips.length === 0) {
					showToast("Не удалось подключить типовой рециркулятор", "error");
					return;
				}
			}

			const targetId = equipmentId || (currentEquips.length === 1 ? currentEquips[0].id : undefined);

			const res = await fetch("/api/registers/bactericidal/open-morning-shift", {
				method: "POST",
				headers,
				body: JSON.stringify({
					equipmentId: targetId,
					date: new Date().toISOString().slice(0, 10),
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					data.message ||
						"Утренняя смена открыта: бактерицидная обработка 30 мин + норма зафиксированы!",
					"success",
				);
				await fetchAll();
			} else {
				await executePreShift30Min(targetId, currentEquips, fetchAll);
			}
		} catch (err) {
			showToast("Сетевая ошибка при открытии утренней смены", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleCloseEveningShift = async (equipmentId?: string) => {
		if (submitting) return;
		try {
			setSubmitting(true);
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
				if (currentEquips.length === 0) {
					showToast("Не удалось подключить типовой рециркулятор", "error");
					return;
				}
			}

			const targetId = equipmentId || (currentEquips.length === 1 ? currentEquips[0].id : undefined);

			const res = await fetch("/api/registers/bactericidal/close-evening-shift", {
				method: "POST",
				headers,
				body: JSON.stringify({
					equipmentId: targetId,
					date: new Date().toISOString().slice(0, 10),
					shiftHours: 6,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					data.message ||
						"Вечерняя смена закрыта: финальная дезинфекция и наработка ламп зафиксированы!",
					"success",
				);
				await fetchAll();
			} else {
				await executeShiftAutopilot(6, currentEquips, fetchAll);
			}
		} catch (err) {
			showToast("Сетевая ошибка при закрытии вечерней смены", "error");
		} finally {
			setSubmitting(false);
		}
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
				<h2>ОБЕЗЗАРАЖИВАНИЕ ВОЗДУХА (РЕЦИРКУЛЯТОРЫ)</h2>
				<p>Учет наработки ламп и дезинфекция воздуха кабинетов</p>
			</div>

			{/* Dominant 1-Click Pre-Shift 30min Hero Banner */}
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
							Чистый воздух
						</span>
						<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
							Подготовка воздуха перед началом рабочей смены
						</span>
					</div>
					<h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)" }}>
						Дезинфекция воздуха кабинетов и учет наработки ламп
					</h3>
					<p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
						1-клик фиксация утреннего кварцевания и закрытия смены без ручных расчетов на калькуляторе.
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={() => handleOpenMorningShift()}
						aria-busy={submitting}
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
							opacity: submitting ? 0.7 : 1,
						}}
						data-testid="bactericidal-open-morning-shift-btn"
						title="Открыть утреннюю смену: зафиксировать предсменное обеззараживание воздуха для всех аппаратов"
					>
						<Sun size={17} />
						<span>Открыть утреннюю смену (кварцевание 30 мин + норма)</span>
					</button>

					<button
						type="button"
						onClick={() => handleCloseEveningShift()}
						aria-busy={submitting}
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
							opacity: submitting ? 0.7 : 1,
						}}
						data-testid="bactericidal-close-evening-shift-btn"
						title="Закрыть вечернюю смену (финальная дезинфекция): фиксирует дневную смену 6 ч + заключительное обеззараживание 30 мин без ручного счета"
					>
						<Moon size={17} />
						<span>Закрыть вечернюю смену (финальная дезинфекция)</span>
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
						onClick={() => setIsEquipModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "44px" }}
					>
						<Plus size={15} /> Добавить аппарат в реестр
					</button>
					<button
						type="button"
						onClick={handleOpenLogModal}
						aria-busy={submitting}
						className="sanpin-btn sanpin-btn-primary touch-manipulation"
						style={{ minHeight: "44px", opacity: submitting ? 0.7 : 1 }}
						data-testid="bactericidal-manual-session-btn"
					>
						<Clock size={15} /> Внести сеанс облучения
					</button>
				</div>
			</div>

			{/* Zero-Setup Autonomy Banner (Mandate 8e, 8n) */}
			{equipments.length === 0 && (
				<div
					className="sanpin-zero-setup-banner"
					style={{
						background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(2, 132, 199, 0.06) 100%)",
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
					data-testid="bactericidal-zero-setup-banner"
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
								Чистый воздух • Zero-Setup
							</span>
							<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
								Быстрый старт для соло-врача и малых клиник
							</span>
						</div>
						<div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)", marginBottom: "0.2rem" }}>
							Парк бактерицидных установок пуст
						</div>
						<p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
							Подключите стандартный закрытый рециркулятор Дезар-4 (ОРУБн-3-3-«КРОНТ», V=45 м³) для Кабинета №1 в 1 клик без ручного ввода паспортов и счетчиков.
						</p>
					</div>
					<button
						type="button"
						onClick={() => handleProvisionCanonicalEquipment(true)}
						aria-busy={submitting}
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
							opacity: submitting ? 0.7 : 1,
							color: "#ffffff",
							border: "none",
							boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
						}}
						data-testid="bactericidal-zero-setup-provision-btn"
						title="Подключить типовой рециркулятор: Дезар-4 (ОРУБн-3-3-«КРОНТ») для Кабинета терапевтической стоматологии №1 (V=45 м³, 8000 ч ресурс ламп)"
					>
						<Sparkles size={17} />
						<span>Подключить типовой рециркулятор (Дезар-4, Кабинет №1)</span>
					</button>
				</div>
			)}

			<BactericidalFleetGrid
				equipments={equipments}
				onPreShift30Min={handlePreShift30Min}
				onReplaceLamps={handleReplaceLamps}
				submitting={submitting}
			/>

			<BactericidalLogTable
				logs={filteredLogs}
				equipments={equipments}
				selectedEquipId={selectedEquipId}
				setSelectedEquipId={setSelectedEquipId}
				loading={loading}
				onPrintJournal={() =>
					handlePrintBactericidalJournal({
						equipments,
						selectedEquipId,
						logs,
						operatorStaffFullName:
							(appLogic as any)?.activeDoctor?.fullName ||
							(appLogic as any)?.activeDoctor?.name ||
							"Медсестра ЦСО",
					})
				}
			/>

			<BactericidalAddEquipmentModal
				isOpen={isEquipModalOpen}
				onClose={() => setIsEquipModalOpen(false)}
				newRoomName={newRoomName}
				setNewRoomName={setNewRoomName}
				newRoomVolume={newRoomVolume}
				setNewRoomVolume={setNewRoomVolume}
				newDeviceBrand={newDeviceBrand}
				setNewDeviceBrand={setNewDeviceBrand}
				newSerialNumber={newSerialNumber}
				setNewSerialNumber={setNewSerialNumber}
				newDeviceType={newDeviceType}
				setNewDeviceType={setNewDeviceType}
				newMaxHours={newMaxHours}
				setNewMaxHours={setNewMaxHours}
				onSubmit={handleAddEquipment}
				submitting={submitting}
			/>

			<BactericidalAddSessionModal
				isOpen={isLogModalOpen}
				onClose={() => setIsLogModalOpen(false)}
				equipments={equipments}
				logEquipId={logEquipId}
				setLogEquipId={setLogEquipId}
				logDate={logDate}
				setLogDate={setLogDate}
				logStartTime={logStartTime}
				setLogStartTime={setLogStartTime}
				logEndTime={logEndTime}
				setLogEndTime={setLogEndTime}
				logDurationMin={logDurationMin}
				setLogDurationMin={setLogDurationMin}
				logMode={logMode}
				setLogMode={setLogMode}
				logNotes={logNotes}
				setLogNotes={setLogNotes}
				onStartTimeChange={handleStartTimeChange}
				onEndTimeChange={handleEndTimeChange}
				onSetPresetDuration={setPresetDuration}
				hoursPreview={hoursPreview}
				onSubmit={handleAddSession}
				submitting={submitting}
			/>
		</div>
	);
}

export * from "./BactericidalAddEquipmentModal";
export * from "./BactericidalAddSessionModal";
export * from "./BactericidalFleetGrid";
export * from "./BactericidalLogTable";
export * from "./bactericidalShiftHelpers";
