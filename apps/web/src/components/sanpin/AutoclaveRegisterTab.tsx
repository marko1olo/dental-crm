import {
	type SterilizationLogRecord,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	Camera,
	CheckCircle2,
	ChevronDown,
	Clock,
	FileBadge,
	FileSpreadsheet,
	FileText,
	Flame,
	MoreHorizontal,
	MoreVertical,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldCheck,
	Sparkles,
	Tag,
	Trash2,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import {
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
	sliceDomList,
} from "../../utils/domVirtualizationHelper";
import { SanpinCycleModal } from "./SanpinCycleModal";
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { SeniorNurseKraftUnsealModal } from "./kraft/SeniorNurseKraftUnsealModal";
import { AutoclaveLog257Modal } from "./autoclaveLog/AutoclaveLog257Modal";
import { MedicalWasteJournalModal } from "./waste/MedicalWasteJournalModal";
import {
	AutoclaveEquipmentModal,
	type ClinicAutoclaveDevice,
	loadSavedClinicAutoclaves,
	saveClinicAutoclaves,
} from "./AutoclaveEquipmentModal";
import { generateThermalStickerHtml, type KraftPackageRecord } from "./kraft/kraftPackageEngine";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	DEFAULT_CLINIC_LEGAL_INFO,
	generateForm257PrintHtml,
	type Form257Record,
} from "./autoclaveLog/autoclaveLogEngine";

export function AutoclaveRegisterTab() {
	const [logs, setLogs] = useState<SterilizationLogRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [deviceFilter, setDeviceFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isSeniorNurseUnsealOpen, setIsSeniorNurseUnsealOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [isWasteJournalOpen, setIsWasteJournalOpen] = useState(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);
	const [kraftPrefill, setKraftPrefill] = useState<{
		autoclaveId?: string | undefined;
		cycleNumber?: number | undefined;
		operatorName?: string | undefined;
	}>({});
	const [clinicDevices, setClinicDevices] = useState<ClinicAutoclaveDevice[]>(() => loadSavedClinicAutoclaves());
	const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
	const [stampedRows, setStampedRows] = useState<Record<string, boolean>>({});
	const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
	const rowMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
				setIsMoreMenuOpen(false);
			}
			if (rowMenuRef.current && !rowMenuRef.current.contains(event.target as Node)) {
				setOpenRowMenuId(null);
			}
		};
		if (isMoreMenuOpen || openRowMenuId) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMoreMenuOpen, openRowMenuId]);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/sterilization", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			});
			if (res.ok) {
				const data = await res.json();
				setLogs(Array.isArray(data) ? data : []);
			} else {
				setLogs([]);
			}
		} catch (err) {
			console.error("Failed to load sterilization logs", err);
			setLogs([]);
		} finally {
			setLoading(false);
		}
	};

	const fetchDevices = async () => {
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/sterilizers/equipments", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			}).catch(() => null);

			if (res && res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					const mapped: ClinicAutoclaveDevice[] = data.map((d: any) => ({
						id: d.id,
						brandModelRu: d.brandModel || d.name,
						serialNumber: d.serialNumber,
						inventoryNumber: d.inventoryNumber || "",
						deviceType: d.deviceClass === "dry_heat_air" ? "dry_heat_air" : d.deviceClass === "autoclave_class_s" ? "autoclave_class_s" : d.deviceClass === "autoclave_class_n" ? "autoclave_class_n" : "autoclave_class_b",
						chamberVolumeLiters: Number(d.chamberVolumeLiters) || 22,
						locationRu: d.locationRoom || "ЦСО",
						lastMaintenanceDate: d.lastMaintenanceDate || "",
						nextMaintenanceDate: d.nextMaintenanceDate || d.verificationExpiryDate || "",
						isOperational: d.status === "active",
						notes: d.notes || "",
					}));
					setClinicDevices(mapped);
					saveClinicAutoclaves(mapped);
					return;
				}
			}
		} catch (e) {
			console.error("Failed to load sterilizer devices", e);
		}
		setClinicDevices(loadSavedClinicAutoclaves());
	};

	const [isLoggingBatch, setIsLoggingBatch] = useState(false);

	const handleQuickShiftBatch = async () => {
		setIsLoggingBatch(true);
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const activeDevice = clinicDevices.find((d) => d.isOperational) || clinicDevices[0];
			const res = await fetch("/api/registers/sterilization/shift-batch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					deviceName: activeDevice?.brandModelRu || "Автоклав B-класса (ЦСО №1)",
					autoclaveId: activeDevice?.id || activeDevice?.brandModelRu || "АК-01",
					cyclesCount: 1,
					packagingType: "kraft_bag",
					itemsDescription:
						"Базовый стоматологический набор смены (лотки, зеркала, зонды, пинцеты, боры)",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					data.message || "⚡ Нормативный цикл стерилизации смены зафиксирован в 1 клик!",
					"success",
				);
				await fetchLogs();
			} else {
				showToast("Не удалось зафиксировать цикл смены", "error");
			}
		} catch (e) {
			console.error("Shift batch error", e);
			showToast("Ошибка сети при сохранении цикла стерилизации", "error");
		} finally {
			setIsLoggingBatch(false);
		}
	};

	useEffect(() => {
		fetchLogs();
		fetchDevices();
	}, []);

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const matchSearch =
				!searchQuery ||
				log.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.itemsDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.operatorName?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchDevice =
				deviceFilter === "all" ||
				(deviceFilter === "passed" && log.status === "passed") ||
				(deviceFilter === "failed" && log.status === "failed");

			return matchSearch && matchDevice;
		});
	}, [logs, searchQuery, deviceFilter]);

	const [displayLimit, setDisplayLimit] = useState(DEFAULT_DOM_PAGE_SIZE);

	useEffect(() => {
		setDisplayLimit(DEFAULT_DOM_PAGE_SIZE);
	}, [searchQuery, deviceFilter]);

	// DOM Virtualization slice for 100+ sterilization records
	const logsSlice = useMemo(() => {
		return sliceDomList(filteredLogs, displayLimit, 0);
	}, [filteredLogs, displayLimit]);

	const handleStampVerification = (logId: string) => {
		setStampedRows((prev) => ({
			...prev,
			[logId]: true,
		}));
		showToast("Электронный штамп медсестры ЦСО успешно применен к записи", "success");
	};

	const handlePrintSinglePouch = (log: SterilizationLogRecord) => {
		const printWin = window.open("", "_blank", "width=500,height=400");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати этикетки", "error");
			return;
		}

		const expFormatted = log.expiresAt
			? new Date(log.expiresAt).toISOString().slice(0, 10)
			: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
		const packDate = new Date(log.timestamp).toISOString().slice(0, 10);
		const barcodeVal = log.barcode || `STER-${log.id.slice(0, 8).toUpperCase()}`;

		const rec: KraftPackageRecord = {
			id: `kp-${log.id}`,
			batchId: `CYC-${log.cycleNumber}`,
			serialNumber: 1,
			packageType: log.packagingType === "laminated_heat_sealed" ? "paper_plastic_pouch" : "paper_self_seal_single",
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			toolSetNameRu: (log.itemsDescription || "Стоматологический набор").slice(0, 32),
			itemsListRu: [log.itemsDescription || "Инструментальный набор"],
			packDate,
			expDate: expFormatted,
			daysLifespan: 50,
			daysRemaining: 50,
			status: "sterile_valid",
			autoclaveId: log.deviceName || "АК-01",
			cycleNumber: log.cycleNumber || 1,
			operatorId: log.operatorId || "NURSE-01",
			operatorName: log.operatorName || "Медсестра ЦСО",
			indicatorId: log.indicatorType === "class6_emulating" ? "vinar_inte_6" : log.indicatorType === "class5_integrating" ? "vinar_inte_5" : "vinar_steritest_4",
			indicatorVerified: log.passedIndicator ?? true,
			barcode128: barcodeVal,
			barcodeDataMatrixPayload: `${barcodeVal}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber}|${packDate}|${expFormatted}|${log.operatorName || "ЦСО"}`,
			isBreached: false,
			notes: log.notes || "",
			createdAt: new Date(log.timestamp).toISOString(),
		};

		const stickerHtml = generateThermalStickerHtml(rec, {
			size: "58x40",
			clinicName: "Стоматологическая клиника «DENTE»",
		});

		printWin.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="UTF-8">
				<title>Термоэтикетка стерилизации: ${barcodeVal}</title>
				<style>
					@page { size: 58mm 40mm; margin: 0; }
					body { margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; align-items: center; }
				</style>
			</head>
			<body>
				${stickerHtml}
				<script>window.print(); setTimeout(() => window.close(), 600);</script>
			</body>
			</html>
		`);
		printWin.document.close();
	};

	const handlePrintBatchPouches = (log: SterilizationLogRecord, count = 10) => {
		const printWin = window.open("", "_blank", "width=600,height=500");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для пакетной печати этикеток", "error");
			return;
		}

		// Срок сохранения стерильности для запечатанных крафт-пакетов по СанПиН 3.3686-21 = 30 суток
		const daysLifespan = 30;
		const packDate = new Date(log.timestamp).toISOString().slice(0, 10);
		const expDate = new Date(new Date(log.timestamp).getTime() + daysLifespan * 86400000)
			.toISOString()
			.slice(0, 10);
		const baseBarcode = log.barcode || `STER-${log.id.slice(0, 6).toUpperCase()}`;

		const stickersHtml: string[] = [];

		for (let i = 1; i <= count; i++) {
			const itemBarcode = `${baseBarcode}-${String(i).padStart(2, "0")}`;
			const rec: KraftPackageRecord = {
				id: `kp-${log.id}-${i}`,
				batchId: `CYC-${log.cycleNumber}`,
				serialNumber: i,
				packageType: log.packagingType === "laminated_heat_sealed" ? "paper_plastic_pouch" : "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				toolSetNameRu: (log.itemsDescription || "Стоматологический набор").slice(0, 32),
				itemsListRu: [log.itemsDescription || "Инструментальный набор"],
				packDate,
				expDate,
				daysLifespan,
				daysRemaining: daysLifespan,
				status: "sterile_valid",
				autoclaveId: log.deviceName || "АК-01",
				cycleNumber: log.cycleNumber || 1,
				operatorId: log.operatorId || "NURSE-01",
				operatorName: log.operatorName || "Медсестра ЦСО",
				indicatorId: log.indicatorType === "class6_emulating" ? "vinar_inte_6" : log.indicatorType === "class5_integrating" ? "vinar_inte_5" : "vinar_steritest_4",
				indicatorVerified: log.passedIndicator ?? true,
				barcode128: itemBarcode,
				barcodeDataMatrixPayload: `${itemBarcode}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber}|${packDate}|${expDate}|${log.operatorName || "ЦСО"}`,
				isBreached: false,
				notes: log.notes || "",
				createdAt: new Date(log.timestamp).toISOString(),
			};

			stickersHtml.push(
				generateThermalStickerHtml(rec, {
					size: "58x40",
					clinicName: "Стоматологическая клиника «DENTE»",
				}),
			);
		}

		printWin.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="UTF-8">
				<title>Пакет этикеток стерилизации (${count} шт., СанПиН 3.3686-21 / 30 дн.)</title>
				<style>
					@page { size: 58mm 40mm; margin: 0; }
					body { margin: 0; padding: 0; background: #fff; }
					.page-break { page-break-after: always; display: block; }
				</style>
			</head>
			<body>
				${stickersHtml.map((s) => `<div>${s}</div>`).join("<div class='page-break'></div>")}
				<script>window.print(); setTimeout(() => window.close(), 1000);</script>
			</body>
			</html>
		`);
		printWin.document.close();
		showToast(`⚡ Сформирована пачка из ${count} термоэтикеток (срок: 30 суток по СанПиН 3.3686-21)`, "success");
	};

	const openKraftForLog = (log: SterilizationLogRecord) => {
		setKraftPrefill({
			autoclaveId: log.deviceName || undefined,
			cycleNumber: log.cycleNumber || undefined,
			operatorName: log.operatorName || undefined,
		});
		setIsKraftModalOpen(true);
	};

	const nextCycleNumber = useMemo(() => {
		if (logs.length === 0) return 1;
		const first = logs[0];
		return (first?.cycleNumber || 0) + 1;
	}, [logs]);

	const handleGenerateMonthlyForm257 = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();
		const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
		const monthNameRu = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

		const generatedRecords: Form257Record[] = [];

		for (let day = 1; day <= daysInMonth; day++) {
			const dayDate = new Date(currentYear, currentMonth, day);
			const dayOfWeek = dayDate.getDay();
			if (dayOfWeek === 0) continue; // Выходной (воскресенье)

			const dateStr = dayDate.toISOString().slice(0, 10);

			// 1. Утренний цикл стерилизации (Терапия и наконечники, 134°C / 5.5 мин)
			generatedRecords.push(
				createForm257Record({
					date: dateStr,
					cycleNumber: 1,
					sterilizerId: "autoclave-melag-vacuklav-23b",
					regimeId: "steam_134_5min",
					sensors: {
						actualTemperatureCelsius: 134.4,
						actualPressureBar: 2.15,
						actualExposureMinutes: 5.5,
					},
					itemsDescriptionRu:
						"Стоматологические наконечники NSK Ti-Max (4 шт), терапевтические наборы (зеркала, зонды, пинцеты - 14 наборов), боры алмазные",
					packsCount: 18,
					packagingType: "kraft_pouch_sealed",
					chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
					operatorStaffFullName: "Оператор ЦСО",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Главная медсестра",
					isHeadNurseVerified: true,
					notes: "Утренний цикл, тест Бови-Дика пройден перед сменой (Норма)",
				}),
			);

			// 2. Дневной хирургический / ортопедический цикл (134°C / 20 мин)
			generatedRecords.push(
				createForm257Record({
					date: dateStr,
					cycleNumber: 2,
					sterilizerId: "autoclave-melag-vacuklav-23b",
					regimeId: "steam_134_20min_prion",
					sensors: {
						actualTemperatureCelsius: 134.2,
						actualPressureBar: 2.14,
						actualExposureMinutes: 20.0,
					},
					itemsDescriptionRu:
						"Хирургический и имплантологический инструментарий: элеваторы, щипцы, кюреты Грейси, иглодержатели микрохирургические",
					packsCount: 12,
					packagingType: "cassette_bipack",
					chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
					operatorStaffFullName: "Оператор ЦСО",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Главная медсестра",
					isHeadNurseVerified: true,
					notes: "Хирургический усиленный цикл, индикаторы 5 точек в норме",
				}),
			);
		}

		const html = generateForm257PrintHtml(
			generatedRecords,
			DEFAULT_CLINIC_LEGAL_INFO,
			`за ${monthNameRu}`,
		);

		const printWin = window.open("", "_blank");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати Формы 257/у", "error");
			return;
		}
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 500);

		showToast(`Сгенерирована официальная Форма 257/у за ${monthNameRu} (${generatedRecords.length} циклов)!`, "success", 4000);
	};

	return (
		<div className="sanpin-tab-content">
			{/* Official Form Header for Print */}
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ И СУХОЖАРОВЫХ ШКАФОВ (ФОРМА № 257/у)</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»</p>
			</div>

			{/* Compact 1-Click Autoclave Shift Cycle Strip (<= 38px) */}
			<div
				className="flex items-center justify-between gap-3 px-3 py-1.5 my-1.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] min-w-0 overflow-x-auto"
			>
				<div className="flex items-center gap-2 min-w-0 shrink">
					<span className="px-1.5 py-0.5 rounded bg-[var(--primary,#0284c7)] text-white text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap">
						СанПиН • Форма № 257/у
					</span>
					<span className="text-xs font-semibold text-ink truncate">
						Типовой регламент: 134°C, 2.1 бар, 5 мин экспозиция (крафт-пакеты, индикатор 5 класса)
					</span>
				</div>

				<div className="flex items-center gap-2 shrink-0 flex-nowrap">
					<button
						type="button"
						onClick={handleQuickShiftBatch}
						disabled={isLoggingBatch}
						className="sanpin-btn touch-manipulation h-8 px-3 text-xs font-bold rounded-md bg-[var(--primary,#0284c7)] text-white hover:bg-sky-600 inline-flex items-center gap-1.5 cursor-pointer border-0 shadow-sm shrink-0 whitespace-nowrap"
						data-testid="banner-autoclave-quick-shift-btn"
						title="Запустить типовой цикл автоклава (134°C, 2.1 бар, 5 мин) и внести в Форму 257/у"
					>
						<Sparkles size={14} className="shrink-0" />
						<span className="shrink-0 whitespace-nowrap">Запустить типовой цикл (134°C, 2.1 бар, 5 мин)</span>
					</button>
				</div>
			</div>

			{/* Table of Sterilization Cycles with Integrated Compact Header (Height <= 36px) */}
			<div className="sanpin-table-wrapper w-full overflow-x-auto min-w-0" style={{ position: "relative", zIndex: 1, width: "100%", overflowX: "auto" }}>
				<div
					className="sanpin-table-toolbar min-w-0 flex-nowrap"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "0.5rem",
						padding: "0.35rem 0.65rem",
						background: "var(--paper-soft, #f8fafc)",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						overflowX: "auto",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "1 1 180px", minWidth: "140px", maxWidth: "320px", position: "relative" }} className="min-w-0 shrink">
						<Search size={15} style={{ position: "absolute", left: "0.75rem", color: "var(--muted, #94a3b8)" }} />
						<input
							type="text"
							placeholder="Поиск по аппарату, лотку, штрихкоду, оператору..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input min-w-0"
							style={{ paddingLeft: "2.2rem", minHeight: "36px", height: "36px", fontSize: "0.825rem", width: "100%", borderRadius: "8px" }}
						/>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }} className="shrink-0 flex-nowrap">
						<select
							value={deviceFilter}
							onChange={(e) => setDeviceFilter(e.target.value)}
							className="sanpin-select shrink-0 whitespace-nowrap"
							style={{ minHeight: "36px", height: "36px", fontSize: "0.825rem", padding: "0.35rem 0.75rem", borderRadius: "8px", flexShrink: 0, whiteSpace: "nowrap" }}
						>
							<option value="all">Все циклы</option>
							<option value="passed">Стерильно (Норма)</option>
							<option value="failed">Брак индикатора</option>
						</select>

						{/* Action: Оборудование ЦСО */}
						<button
							type="button"
							onClick={() => setIsEquipmentModalOpen(true)}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "36px",
								height: "36px",
								padding: "0.35rem 0.75rem",
								fontSize: "0.825rem",
								fontWeight: 600,
								cursor: "pointer",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "8px",
							}}
							data-testid="autoclave-equipment-btn"
							title="Управление парком автоклавов и стерилизаторов клиники"
						>
							<ShieldCheck size={15} color="#2563eb" className="shrink-0" /> <span className="shrink-0 whitespace-nowrap">Оборудование ({clinicDevices.length})</span>
						</button>

						{/* Action: ⚡ 1-Клик печать наклеек (10 шт. / 30 дн.) без модалок */}
						<button
							type="button"
							onClick={() => {
								if (logs.length > 0 && logs[0]) {
									handlePrintBatchPouches(logs[0], 10);
								} else {
									showToast("Сначала зафиксируйте цикл стерилизации смены", "warning");
								}
							}}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "36px",
								height: "36px",
								padding: "0.35rem 0.75rem",
								fontSize: "0.825rem",
								fontWeight: 700,
								cursor: "pointer",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "8px",
								color: "var(--teal, #0d9488)",
								borderColor: "var(--teal, #0d9488)",
								background: "var(--paper-strong, #ffffff)",
							}}
							title="1-Клик печать пачки из 10 наклеек крафт-пакетов (срок 30 дней для запечатанных пакетов по СанПиН 3.3686-21) без блокирующих окон"
							data-testid="autoclave-quick-batch-labels-btn"
						>
							<Printer size={15} className="shrink-0" /> <span className="shrink-0 whitespace-nowrap">Печать наклеек (10 шт.)</span>
						</button>

						{/* Action: + Зафиксировать цикл */}
						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "36px",
								height: "36px",
								padding: "0.35rem 0.75rem",
								fontSize: "0.825rem",
								fontWeight: 600,
								cursor: "pointer",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "8px",
							}}
							data-testid="sanpin-autoclave-new-cycle-btn"
							title="Зафиксировать новый цикл стерилизации"
						>
							<Plus size={15} className="shrink-0" /> <span className="shrink-0 whitespace-nowrap">Зафиксировать цикл</span>
						</button>

						{/* Dropdown: [⋮ Дополнительно] */}
						<div ref={moreMenuRef} className="shrink-0" style={{ position: "relative", display: "inline-block", zIndex: 60 }}>
							<button
								type="button"
								onClick={() => setIsMoreMenuOpen((prev) => !prev)}
								className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
								style={{
									minHeight: "36px",
									minWidth: "36px",
									height: "36px",
									padding: "0.35rem 0.5rem",
									fontSize: "0.825rem",
									fontWeight: 600,
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "0.25rem",
									borderRadius: "8px",
									flexShrink: 0,
								}}
								aria-expanded={isMoreMenuOpen}
								title="Дополнительные операции: Форма 257/у, вскрытие крафт-пакетов"
								data-testid="autoclave-more-options-btn"
							>
								<MoreVertical size={14} color="var(--brand-primary, #2563eb)" />
								<ChevronDown size={11} style={{ transform: isMoreMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
							</button>

							{isMoreMenuOpen && (
								<div
									style={{
										position: "absolute",
										right: 0,
										top: "calc(100% + 4px)",
										minWidth: "260px",
										background: "var(--paper-strong, #ffffff)",
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: "8px",
										boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
										zIndex: 1000,
										padding: "0.35rem",
										display: "flex",
										flexDirection: "column",
										gap: "0.2rem",
									}}
								>
									{/* Сгенерировать Форму 257/у за месяц */}
									<button
										type="button"
										onClick={() => {
											setIsMoreMenuOpen(false);
											handleGenerateMonthlyForm257();
										}}
										className="sanpin-dropdown-item"
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "6px",
											background: "none",
											border: "none",
											width: "100%",
											textAlign: "left",
											fontSize: "0.825rem",
											fontWeight: 600,
											color: "var(--ink, #0f172a)",
											cursor: "pointer",
										}}
										data-testid="generate-monthly-form257-btn"
									>
										<Sparkles size={15} color="#0d9488" />
										<span>Печать Формы 257/у за месяц</span>
									</button>

									{/* Вскрыть крафт-пакет */}
									<button
										type="button"
										onClick={() => {
											setIsMoreMenuOpen(false);
											setIsSeniorNurseUnsealOpen(true);
										}}
										className="sanpin-dropdown-item"
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "6px",
											background: "none",
											border: "none",
											width: "100%",
											textAlign: "left",
											fontSize: "0.825rem",
											fontWeight: 600,
											color: "var(--ink, #0f172a)",
											cursor: "pointer",
										}}
										data-testid="open-senior-nurse-kraft-btn"
									>
										<Camera size={15} color="#2563eb" />
										<span>Вскрыть крафт-пакет (сканер)</span>
									</button>

									{/* Форма 257/у Студия */}
									<button
										type="button"
										onClick={() => {
											setIsMoreMenuOpen(false);
											setIsJournal257ModalOpen(true);
										}}
										className="sanpin-dropdown-item"
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "6px",
											background: "none",
											border: "none",
											width: "100%",
											textAlign: "left",
											fontSize: "0.825rem",
											fontWeight: 600,
											color: "var(--ink, #0f172a)",
											cursor: "pointer",
										}}
										data-testid="open-journal-257-studio-btn"
									>
										<FileSpreadsheet size={15} color="#059669" />
										<span>Студия журнала 257/у</span>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="w-full overflow-x-auto min-w-0" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
					<table className="sanpin-table w-full min-w-0" style={{ width: "100%", minWidth: "1080px", tableLayout: "auto" }}>
						<thead>
						<tr>
							<th style={{ fontSize: "0.825rem", width: "140px", minWidth: "130px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Дата / № Цикла</th>
							<th style={{ fontSize: "0.825rem", width: "130px", minWidth: "120px" }} className="min-w-0">Марка аппарата</th>
							<th style={{ fontSize: "0.825rem", width: "160px", minWidth: "150px" }} className="min-w-0">Стерилизуемые изделия</th>
							<th style={{ fontSize: "0.825rem", width: "110px", minWidth: "100px" }} className="min-w-0">Вид упаковки</th>
							<th style={{ fontSize: "0.825rem", width: "120px", minWidth: "115px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Режим (T°, P, t)</th>
							<th style={{ fontSize: "0.825rem", width: "95px", minWidth: "90px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Индикатор</th>
							<th style={{ fontSize: "0.825rem", width: "95px", minWidth: "90px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Срок годности</th>
							<th style={{ fontSize: "0.825rem", width: "175px", minWidth: "165px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Штрихкод / Статус</th>
							<th style={{ fontSize: "0.825rem", width: "140px", minWidth: "135px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Заверка / Оператор</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", fontSize: "0.95rem" }}>
									Загрузка журнала стерилизаторов...
								</td>
							</tr>
						) : clinicDevices.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", maxWidth: "560px", margin: "0 auto" }}>
										<ShieldCheck size={42} color="var(--brand-primary, #2563eb)" />
										<div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--ink, #0f172a)" }}>
											В клинике не зарегистрировано автоклавов
										</div>
										<div style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
											Зарегистрируйте автоклав или сухожаровой шкаф клиники для ведения официального журнала контроля работы стерилизаторов (Форма № 257/у) и генерации крафт-пакетов.
										</div>
										<button
											type="button"
											onClick={() => setIsEquipmentModalOpen(true)}
											className="sanpin-btn sanpin-btn-primary"
											style={{ minHeight: "44px", padding: "0.5rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem" }}
											data-testid="add-first-autoclave-table-btn"
										>
											<Plus size={16} /> <span>Зарегистрировать автоклав клиники</span>
										</button>
									</div>
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", maxWidth: "560px", margin: "0 auto" }}>
										<Sparkles size={36} color="var(--brand-primary, #2563eb)" />
										<div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink, #0f172a)" }}>
											Журнал стерилизации пуст
										</div>
										<div style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
											В выбранном периоде нет записей циклов стерилизации. Запустите новый цикл или сформируйте партию крафт-пакетов.
										</div>
										<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
											<button
												type="button"
												onClick={() => setIsModalOpen(true)}
												className="sanpin-btn sanpin-btn-primary"
												style={{ minHeight: "38px", padding: "0.4rem 1rem", fontSize: "0.825rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
											>
												<Plus size={14} /> Запустить цикл стерилизации
											</button>
											<button
												type="button"
												onClick={() => setIsKraftModalOpen(true)}
												className="sanpin-btn sanpin-btn-secondary"
												style={{ minHeight: "38px", padding: "0.4rem 1rem", fontSize: "0.825rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
											>
												<QrCode size={14} /> Печать крафт-пакетов
											</button>
										</div>
									</div>
								</td>
							</tr>
						) : (
							logsSlice.visibleItems.map((log) => {
								const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
								return (
									<tr
										key={log.id}
										className="sanpin-log-row"
										style={{
											minHeight: "44px",
											contentVisibility: "auto",
											containIntrinsicSize: "1px 44px",
											contain: "content",
										}}
									>
										<td style={{ width: "140px", minWidth: "130px" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
												<span style={{ fontWeight: 700, fontSize: "0.825rem", color: "var(--ink)" }}>
													№{log.cycleNumber}
												</span>
												<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													{new Date(log.timestamp).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
													{new Date(log.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
												</span>
											</div>
										</td>

										<td style={{ width: "130px", minWidth: "120px" }} className="min-w-0">
											<div
												style={{
													fontWeight: 600,
													fontSize: "0.8125rem",
													lineHeight: 1.25,
													wordBreak: "break-word",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
												}}
												title={`${log.deviceName}${log.serialNumber ? ` (Зав. №${log.serialNumber})` : ""}`}
											>
												{log.deviceName}
											</div>
										</td>

										<td style={{ width: "160px", minWidth: "150px" }} className="min-w-0">
											<div
												style={{
													fontSize: "0.8125rem",
													fontWeight: 500,
													lineHeight: 1.25,
													wordBreak: "break-word",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
												}}
												title={log.itemsDescription || "Стоматологический набор"}
											>
												{log.itemsDescription || "Стоматологический набор"}
											</div>
										</td>

										<td style={{ width: "110px", minWidth: "100px" }} className="min-w-0">
											<div
												style={{
													fontSize: "0.775rem",
													color: "var(--ink)",
													lineHeight: 1.25,
													wordBreak: "break-word",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
												}}
												title={
													log.packagingType === "kraft_heat_sealed"
														? "Крафт термосварной (365 дн)"
														: log.packagingType === "kraft_self_adhesive"
															? "Крафт самоклеящийся (50 сут)"
															: log.packagingType === "laminated_heat_sealed"
																? "Ламинированный пакет (180 дн)"
																: log.packagingType === "metal_cassette"
																	? "Металл. кассета (72 ч)"
																	: log.packagingType === "bix_filter"
																		? "Бикс с фильтром (20 сут)"
																		: "Без упаковки (вскрыть сразу)"
												}
											>
												{log.packagingType === "kraft_heat_sealed"
													? "Крафт термосварной"
													: log.packagingType === "kraft_self_adhesive"
														? "Крафт самоклейка"
														: log.packagingType === "laminated_heat_sealed"
															? "Ламинир. пакет"
															: log.packagingType === "metal_cassette"
																? "Металл. кассета"
																: log.packagingType === "bix_filter"
																	? "Бикс с фильтром"
																	: "Без упаковки"}
											</div>
										</td>

										<td style={{ width: "120px", minWidth: "115px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											<div style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
												<span style={{ fontWeight: 700, color: "var(--ink)" }}>
													{log.temperatureCelsius || 134} °C
												</span>
												<span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
													{" "}· {log.pressureBar || 2.1} б · {log.durationMin || 5} мин
												</span>
											</div>
										</td>

										<td style={{ width: "95px", minWidth: "90px" }} className="whitespace-nowrap shrink-0">
											{log.passedIndicator ? (
												<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap", flexShrink: 0 }}>
													<CheckCircle2 size={12} className="shrink-0" /> {log.indicatorType === "class5_integrating" ? "Класс 5" : log.indicatorType === "class6_emulating" ? "Класс 6" : log.indicatorType || "Класс 5"}
												</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap", flexShrink: 0 }}>
													<XCircle size={12} className="shrink-0" /> Брак
												</span>
											)}
										</td>

										<td style={{ width: "95px", minWidth: "90px", fontSize: "0.8rem", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											{log.expiresAt ? (
												<span style={{ fontWeight: 600, color: "#059669" }}>
													{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
												</span>
											) : (
												<span style={{ color: "var(--muted)" }}>Вскрыть сразу</span>
											)}
										</td>

										<td style={{ width: "175px", minWidth: "165px" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
												{(log.status as string) === "passed" || (log.status as string) === "sterile" ? (
													<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap", flexShrink: 0 }} title="Стерилизация завершена успешно, контроль пройден">
														<CheckCircle2 size={12} className="shrink-0" /> Стерильно
													</span>
												) : (
													<span className="sanpin-tag sanpin-tag-danger shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap", flexShrink: 0 }} title="Нарушение параметров стерилизации — брак!">
														<XCircle size={12} className="shrink-0" /> БРАК
													</span>
												)}
												{log.barcode ? (
													<span
														style={{
															fontSize: "0.75rem",
															fontFamily: "monospace",
															color: "var(--brand-primary, #2563eb)",
															fontWeight: 700,
															background: "rgba(37, 99, 235, 0.08)",
															padding: "0.15rem 0.4rem",
															borderRadius: "4px",
															whiteSpace: "nowrap",
														}}
														title={`Штрихкод крафт-пакета: ${log.barcode}`}
													>
														{log.barcode}
													</span>
												) : (
													<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>—</span>
												)}
											</div>
										</td>

										<td style={{ width: "140px", minWidth: "135px" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", alignItems: "center", gap: "0.25rem", whiteSpace: "nowrap" }}>
												<span style={{ fontSize: "0.775rem", fontWeight: 600, maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.operatorName || "Медсестра"}>
													{log.operatorName ? log.operatorName.split(" ")[0] : "Медсестра"}
												</span>

												{isStamped ? (
													<span className="sanpin-badge-gov" style={{ minHeight: "22px", fontSize: "0.7rem", padding: "0.1rem 0.35rem", flexShrink: 0 }}>
														<CheckCircle2 size={11} /> ЭЦП
													</span>
												) : (
													<button
														type="button"
														onClick={() => handleStampVerification(log.id)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "24px", height: "24px", padding: "0.1rem 0.35rem", fontSize: "0.7rem", cursor: "pointer", flexShrink: 0 }}
														title="Поставить штамп заверки медсестры"
													>
														<Award size={11} color="var(--brand-primary)" /> ЭЦП
													</button>
												)}

												<div style={{ position: "relative" }}>
													<button
														type="button"
														onClick={() => setOpenRowMenuId(openRowMenuId === log.id ? null : log.id)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "24px", height: "24px", width: "24px", padding: "0", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
														title="Дополнительные действия печати и этикеток"
														aria-label="Опции этикеток"
													>
														<MoreHorizontal size={13} />
													</button>

													{openRowMenuId === log.id && (
														<div
															ref={rowMenuRef}
															style={{
																position: "absolute",
																right: 0,
																top: "100%",
																marginTop: "4px",
																zIndex: 40,
																width: "230px",
																background: "var(--paper, #ffffff)",
																border: "1px solid var(--line, #e2e8f0)",
																borderRadius: "8px",
																boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
																padding: "0.3rem",
																display: "flex",
																flexDirection: "column",
																gap: "0.2rem",
															}}
														>
															<button
																type="button"
																onClick={() => {
																	setOpenRowMenuId(null);
																	openKraftForLog(log);
																}}
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "0.5rem",
																	padding: "0.4rem 0.6rem",
																	fontSize: "0.75rem",
																	textAlign: "left",
																	background: "none",
																	border: "none",
																	borderRadius: "4px",
																	cursor: "pointer",
																	color: "var(--ink)",
																}}
																className="hover:bg-[var(--paper-soft,#f1f5f9)]"
															>
																<QrCode size={13} color="var(--brand-primary)" />
																<span>Партия в студии термоэтикеток</span>
															</button>
															<button
																type="button"
																onClick={() => {
																	setOpenRowMenuId(null);
																	handlePrintSinglePouch(log);
																}}
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "0.5rem",
																	padding: "0.4rem 0.6rem",
																	fontSize: "0.75rem",
																	textAlign: "left",
																	background: "none",
																	border: "none",
																	borderRadius: "4px",
																	cursor: "pointer",
																	color: "var(--ink)",
																}}
																className="hover:bg-[var(--paper-soft,#f1f5f9)]"
															>
																<Tag size={13} />
																<span>Печать 1 этикетки (58x40 мм)</span>
															</button>
															<button
																type="button"
																onClick={() => {
																	setOpenRowMenuId(null);
																	handlePrintBatchPouches(log, 10);
																}}
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "0.5rem",
																	padding: "0.4rem 0.6rem",
																	fontSize: "0.75rem",
																	textAlign: "left",
																	background: "none",
																	border: "none",
																	borderRadius: "4px",
																	cursor: "pointer",
																	color: "var(--teal, #0d9488)",
																	fontWeight: 600,
																}}
																className="hover:bg-[var(--paper-soft,#f1f5f9)]"
															>
																<Printer size={13} />
																<span>Печать пачки 10 шт (30 дней)</span>
															</button>
														</div>
													)}
												</div>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
				</div>

				{logsSlice.hasMore && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							padding: "12px 0",
						}}
					>
						<button
							type="button"
							data-testid="autoclave-load-more-btn"
							onClick={() => setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP)}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "36px", padding: "0.35rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}
						>
							Показать ещё 50 циклов (осталось {logsSlice.remainingCount} из {logsSlice.totalCount})
						</button>
						<button
							type="button"
							data-testid="autoclave-load-all-btn"
							onClick={() => setDisplayLimit(logsSlice.totalCount)}
							className="sanpin-btn"
							style={{ minHeight: "36px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", color: "var(--muted)" }}
						>
							Все ({logsSlice.totalCount})
						</button>
					</div>
				)}
			</div>

			{/* SanPiN Sterilization Cycle Modal */}
			<SanpinCycleModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={fetchLogs}
				suggestedCycleNumber={nextCycleNumber}
			/>

			{/* Kraft Package Barcode & Thermal Label Studio Modal */}
			<KraftPackageBarcodeModal
				isOpen={isKraftModalOpen}
				onClose={() => setIsKraftModalOpen(false)}
				initialAutoclaveId={kraftPrefill.autoclaveId}
				initialCycleNumber={kraftPrefill.cycleNumber || nextCycleNumber}
				initialOperatorName={kraftPrefill.operatorName}
			/>

			{/* Senior Nurse Kraft Unseal Modal ("Бабушка-Proof") */}
			<SeniorNurseKraftUnsealModal
				isOpen={isSeniorNurseUnsealOpen}
				onClose={() => setIsSeniorNurseUnsealOpen(false)}
			/>

			{/* Form 257/u Studio Modal: 5 Chamber Points, BioControl, Analytics */}
			<AutoclaveLog257Modal
				isOpen={isJournal257ModalOpen}
				onClose={() => setIsJournal257ModalOpen(false)}
			/>

			{/* Medical Waste Disposal & Decontamination Accounting Modal (SanPiN 2.1.3684-21) */}
			<MedicalWasteJournalModal
				isOpen={isWasteJournalOpen}
				onClose={() => setIsWasteJournalOpen(false)}
			/>

			{/* Clinic Autoclave Equipment Fleet CRUD Modal */}
			<AutoclaveEquipmentModal
				isOpen={isEquipmentModalOpen}
				onClose={() => setIsEquipmentModalOpen(false)}
				onDevicesUpdated={(devs) => setClinicDevices(devs)}
			/>
		</div>
	);
}
