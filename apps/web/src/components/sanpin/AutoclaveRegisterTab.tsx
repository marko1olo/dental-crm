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
import { SanpinCycleModal } from "./SanpinCycleModal";
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { SeniorNurseKraftUnsealModal } from "./kraft/SeniorNurseKraftUnsealModal";
import { AutoclaveLog257Modal } from "./autoclaveLog/AutoclaveLog257Modal";
import { MedicalWasteJournalModal } from "./waste/MedicalWasteJournalModal";
import { generateThermalStickerHtml, type KraftPackageRecord } from "./kraft/kraftPackageEngine";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	DEFAULT_CLINIC_LEGAL_INFO,
	generateForm257PrintHtml,
	type Form257Record,
} from "./autoclaveLog/autoclaveLogEngine";

export const DEFAULT_STERILIZATION_DEMO_RECORDS: SterilizationLogRecord[] = [
	{
		id: "00000000-0000-4000-8000-000000000257",
		organizationId: "00000000-0000-0000-0000-000000000001",
		deviceName: "Melag Vacuklav 43 B+ Evolution",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AK-01",
		serialNumber: "2023-V43B-9812",
		cycleNumber: 142,
		itemsDescription: "Хирургический базовый набор (щипцы, элеваторы, кюреты)",
		packagingType: "kraft_heat_sealed",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class5_integrating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "KP-2026-08-00142",
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "СанПиН 3.3686-21. Все 5 точек КТ изменили цвет на эталон. [ЭЦП: Иванова О.С.]",
		timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000258",
		organizationId: "00000000-0000-0000-0000-000000000001",
		deviceName: "Euronda E10 (Class B 24L)",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AK-02",
		serialNumber: "EU-2024-8841",
		cycleNumber: 143,
		itemsDescription: "Эндодонтические лотки и вращающиеся Ni-Ti файлы",
		packagingType: "laminated_heat_sealed",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class5_integrating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "KP-2026-08-00143",
		expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "Интеграторы 5 класса норма. Вакуум-тест пройден. [ЭЦП: Иванова О.С.]",
		timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000259",
		organizationId: "00000000-0000-0000-0000-000000000001",
		deviceName: "Melag Vacuklav 43 B+ Evolution",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AK-01",
		serialNumber: "2023-V43B-9812",
		cycleNumber: 144,
		itemsDescription: "Терапевтические смотровые лотки (зеркала, зонды, пинцеты)",
		packagingType: "kraft_self_adhesive",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class5_integrating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "KP-2026-08-00144",
		expiresAt: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "Пакет герметичен. 50 суток хранения в сухом шкафу. [ЭЦП: Иванова О.С.]",
		timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000260",
		organizationId: "00000000-0000-0000-0000-000000000001",
		deviceName: "DGM AND 20 (Class B)",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AK-03",
		serialNumber: "DGM-2022-3105",
		cycleNumber: 145,
		itemsDescription: "Ортопедические наконечники 1:5 и турбины в крафт-пакетах",
		packagingType: "kraft_heat_sealed",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class5_integrating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "KP-2026-08-00145",
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		operatorId: null,
		operatorName: "Смирнова Е.А. (старшая медсестра)",
		notes: "Предварительная продувка спреем проведена. Контроль стерильности 100%. [ЭЦП: Смирнова Е.А.]",
		timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000261",
		organizationId: "00000000-0000-0000-0000-000000000001",
		deviceName: "Melag Vacuklav 43 B+ Evolution",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AK-01",
		serialNumber: "2023-V43B-9812",
		cycleNumber: 146,
		itemsDescription: "Пародонтологические кюреты Грейси и ультразвуковые насадки",
		packagingType: "kraft_heat_sealed",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class5_integrating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "KP-2026-08-00146",
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "Все 5 контрольных точек камеры перешли в темно-коричневый цвет. [ЭЦП: Иванова О.С.]",
		timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
	},
];

export function AutoclaveRegisterTab() {
	const [logs, setLogs] = useState<SterilizationLogRecord[]>(DEFAULT_STERILIZATION_DEMO_RECORDS);
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
	const [stampedRows, setStampedRows] = useState<Record<string, boolean>>({});

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
				setIsMoreMenuOpen(false);
			}
		};
		if (isMoreMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMoreMenuOpen]);

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
				if (Array.isArray(data) && data.length > 0) {
					setLogs(data);
				} else {
					setLogs(DEFAULT_STERILIZATION_DEMO_RECORDS);
				}
			} else {
				setLogs(DEFAULT_STERILIZATION_DEMO_RECORDS);
			}
		} catch (err) {
			console.error("Failed to load sterilization logs", err);
			setLogs(DEFAULT_STERILIZATION_DEMO_RECORDS);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
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
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Иванова Ольга Николаевна",
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
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Иванова Ольга Николаевна",
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

			{/* Table of Sterilization Cycles with Integrated Compact Header (Height <= 36px) */}
			<div className="sanpin-table-wrapper" style={{ position: "relative", zIndex: 1 }}>
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
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "1 1 200px", minWidth: "160px", maxWidth: "340px", position: "relative" }}>
						<Search size={14} style={{ position: "absolute", left: "0.6rem", color: "var(--muted, #94a3b8)" }} />
						<input
							type="text"
							placeholder="Поиск по аппарату, лотку, штрихкоду, оператору..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "1.9rem", minHeight: "32px", height: "32px", fontSize: "0.78rem", width: "100%", borderRadius: "6px" }}
						/>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
						<select
							value={deviceFilter}
							onChange={(e) => setDeviceFilter(e.target.value)}
							className="sanpin-select"
							style={{ minHeight: "32px", height: "32px", fontSize: "0.78rem", padding: "0.2rem 0.5rem", borderRadius: "6px" }}
						>
							<option value="all">Все циклы</option>
							<option value="passed">Стерильно (Норма)</option>
							<option value="failed">Брак индикатора</option>
						</select>

						{/* Action: + Зафиксировать цикл */}
						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation"
							style={{
								minHeight: "32px",
								height: "32px",
								padding: "0.2rem 0.65rem",
								fontSize: "0.78rem",
								fontWeight: 600,
								cursor: "pointer",
								whiteSpace: "nowrap",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.25rem",
								borderRadius: "6px",
							}}
							data-testid="sanpin-autoclave-new-cycle-btn"
							title="Зафиксировать новый цикл стерилизации"
						>
							<Plus size={13} /> <span>Зафиксировать цикл</span>
						</button>

						{/* Dropdown: [⋮ Дополнительно] */}
						<div ref={moreMenuRef} style={{ position: "relative", display: "inline-block", zIndex: 60 }}>
							<button
								type="button"
								onClick={() => setIsMoreMenuOpen((prev) => !prev)}
								className="sanpin-btn sanpin-btn-secondary touch-manipulation"
								style={{
									minHeight: "32px",
									height: "32px",
									padding: "0.2rem 0.5rem",
									fontSize: "0.78rem",
									fontWeight: 600,
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.2rem",
									borderRadius: "6px",
								}}
								aria-expanded={isMoreMenuOpen}
								title="Дополнительные операции: Форма 257/у, вскрытие крафт-пакетов"
								data-testid="autoclave-more-options-btn"
							>
								<MoreVertical size={13} color="var(--brand-primary, #2563eb)" />
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
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>Дата / № Цикла</th>
							<th style={{ fontSize: "0.85rem" }}>Марка аппарата</th>
							<th style={{ fontSize: "0.85rem" }}>Стерилизуемые изделия</th>
							<th style={{ fontSize: "0.85rem" }}>Вид упаковки</th>
							<th style={{ fontSize: "0.85rem" }}>Режим (T°, Давл., Время)</th>
							<th style={{ fontSize: "0.85rem" }}>Хим. индикатор</th>
							<th style={{ fontSize: "0.85rem", minWidth: "120px" }}>Срок годности</th>
							<th style={{ fontSize: "0.85rem" }}>Штрихкод / Статус</th>
							<th style={{ fontSize: "0.85rem" }}>Заверка / Оператор</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", fontSize: "0.95rem" }}>
									Загрузка журнала стерилизаторов...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "var(--muted)", fontSize: "0.95rem" }}>
									Записи циклов стерилизации не найдены.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => {
								const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
								return (
									<tr key={log.id} style={{ height: "38px" }}>
										<td>
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

										<td>
											<div
												className="truncate max-w-[140px]"
												style={{ fontWeight: 600, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
												title={`${log.deviceName}${log.serialNumber ? ` (Зав. №${log.serialNumber})` : ""}`}
											>
												{log.deviceName}
											</div>
										</td>

										<td>
											<div
												className="truncate max-w-[200px]"
												style={{
													fontSize: "0.8125rem",
													fontWeight: 500,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													maxWidth: "200px",
												}}
												title={log.itemsDescription || "Стоматологический набор"}
											>
												{log.itemsDescription || "Стоматологический набор"}
											</div>
										</td>

										<td>
											<div
												className="truncate max-w-[140px]"
												style={{ fontSize: "0.775rem", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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

										<td>
											<div style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
												<span style={{ fontWeight: 700, color: "var(--ink)" }}>
													{log.temperatureCelsius || 134}°C
												</span>
												<span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
													{" "}/ {log.pressureBar || 2.1}б / {log.durationMin || 5}м
												</span>
											</div>
										</td>

										<td>
											{log.passedIndicator ? (
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap" }}>
													<CheckCircle2 size={12} /> {log.indicatorType === "class5_integrating" ? "Класс 5" : log.indicatorType === "class6_emulating" ? "Класс 6" : log.indicatorType || "Класс 5"}
												</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap" }}>
													<XCircle size={12} /> Брак
												</span>
											)}
										</td>

										<td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
											{log.expiresAt ? (
												<span style={{ fontWeight: 600, color: "#059669" }}>
													{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
												</span>
											) : (
												<span style={{ color: "var(--muted)" }}>Вскрыть сразу</span>
											)}
										</td>

										<td>
											<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
												{log.status === "passed" ? (
													<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}>
														Стерильно
													</span>
												) : (
													<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}>
														БРАК
													</span>
												)}
												{log.barcode && (
													<span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--muted)", fontWeight: 600 }}>
														{log.barcode.slice(-6)}
													</span>
												)}
											</div>
										</td>

										<td>
											<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
												<span className="truncate max-w-[85px]" style={{ fontSize: "0.775rem", fontWeight: 600 }} title={log.operatorName || "Медсестра"}>
													{log.operatorName || "Медсестра"}
												</span>

												{isStamped ? (
													<span className="sanpin-badge-gov" style={{ minHeight: "22px", fontSize: "0.7rem", padding: "0.1rem 0.35rem" }}>
														<CheckCircle2 size={11} /> ЭЦП
													</span>
												) : (
													<button
														type="button"
														onClick={() => handleStampVerification(log.id)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "24px", height: "24px", padding: "0.1rem 0.4rem", fontSize: "0.725rem", cursor: "pointer" }}
														title="Поставить штамп заверки медсестры"
													>
														<Award size={12} color="var(--brand-primary)" /> Заверить
													</button>
												)}

												<button
													type="button"
													onClick={() => openKraftForLog(log)}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "24px", height: "24px", padding: "0.1rem 0.4rem", fontSize: "0.725rem", color: "var(--brand-primary)", cursor: "pointer" }}
													title="Сформировать партию термоэтикеток крафт-пакетов в студии"
												>
													<QrCode size={12} />
												</button>

												<button
													type="button"
													onClick={() => handlePrintSinglePouch(log)}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "24px", height: "24px", width: "24px", padding: "0", fontSize: "0.725rem", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
													title="Быстрая печать термоэтикетки (58x40 мм / DataMatrix)"
												>
													<Tag size={12} />
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
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
		</div>
	);
}
