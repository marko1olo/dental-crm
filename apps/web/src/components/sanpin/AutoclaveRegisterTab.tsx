import {
	type SterilizationLogRecord,
} from "@dental/shared";
import {
	Sparkles,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import {
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
	sliceDomList,
} from "../../utils/domVirtualizationHelper";
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { AutoclaveLog257Modal } from "./autoclaveLog/AutoclaveLog257Modal";
import { MedicalWasteJournalModal } from "./waste/MedicalWasteJournalModal";
import {
	AutoclaveEquipmentModal,
	type ClinicAutoclaveDevice,
	DEFAULT_CLINIC_DEVICES,
	loadSavedClinicAutoclaves,
	saveClinicAutoclaves,
} from "./AutoclaveEquipmentModal";
import {
	handleGenerateMonthlyForm257,
	handlePrintBatchPouches,
	handlePrintSinglePouch,
} from "./AutoclavePrintHelpers";
import { SterilizationCycleModal } from "./SterilizationCycleModal";
import { AutoclaveRegisterTable } from "./AutoclaveRegisterTable";

export const DEFAULT_SHOWCASE_STERILIZATION_LOGS: SterilizationLogRecord[] = [
	{
		id: "550e8400-e29b-41d4-a716-446655440001",
		organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
		deviceName: "Melag Vacuklav 23 B+ (ЦСО №1)",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AUTO-01",
		serialNumber: "MEL-2024-9812",
		cycleNumber: 3,
		itemsDescription: "Хирургические наборы имплантации (лотки, элеваторы, кюреты), наконечники",
		packagingType: "kraft_heat_sealed",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class6_emulating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "STER-2026-003",
		expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
		operatorId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		operatorName: "Иванова А. С. (Медсестра ЦСО)",
		notes: "ЭЦП проверена. Цикл без замечаний, тест вакуума пройден.",
		timestamp: new Date().toISOString(),
		createdAt: new Date().toISOString(),
	},
	{
		id: "550e8400-e29b-41d4-a716-446655440002",
		organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
		deviceName: "Melag Vacuklav 23 B+ (ЦСО №1)",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AUTO-01",
		serialNumber: "MEL-2024-9812",
		cycleNumber: 2,
		itemsDescription: "Терапевтический смотровой набор (зеркала, зонды, пинцеты, гладилки)",
		packagingType: "kraft_self_adhesive",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class5_integrating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "STER-2026-002",
		expiresAt: new Date(Date.now() + 50 * 86400000).toISOString(),
		operatorId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		operatorName: "Иванова А. С. (Медсестра ЦСО)",
		notes: "ЭЦП проверена. Норма 100%.",
		timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
		createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
	},
	{
		id: "550e8400-e29b-41d4-a716-446655440003",
		organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
		deviceName: "W&H Lina 17 (Австрия)",
		sterilizerType: "autoclave_steam",
		autoclaveId: "AUTO-02",
		serialNumber: "WH-2023-4410",
		cycleNumber: 1,
		itemsDescription: "Ортодонтические щипцы, позиционеры, зеркала для фотопротокола",
		packagingType: "kraft_heat_sealed",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMin: 5,
		indicatorType: "class5_integrating",
		passedIndicator: true,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: "STER-2026-001",
		expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
		operatorId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		operatorName: "Иванова А. С. (Медсестра ЦСО)",
		notes: "Утренний контрольный цикл смены.",
		timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
		createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
	},
];

export function AutoclaveRegisterTab() {
	const [logs, setLogs] = useState<SterilizationLogRecord[]>(() =>
		isDemoShowcaseMode() ? DEFAULT_SHOWCASE_STERILIZATION_LOGS : []
	);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [deviceFilter, setDeviceFilter] = useState<string>("all");
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [isNewCycleModalOpen, setIsNewCycleModalOpen] = useState(false);
	const [isWasteJournalOpen, setIsWasteJournalOpen] = useState(false);
	const [kraftPrefill, setKraftPrefill] = useState<{
		autoclaveId?: string | undefined;
		cycleNumber?: number | undefined;
		operatorName?: string | undefined;
	}>({});
	const [clinicDevices, setClinicDevices] = useState<ClinicAutoclaveDevice[]>(() => {
		const saved = loadSavedClinicAutoclaves();
		if (saved.length > 0) return saved;
		if (isDemoShowcaseMode()) return DEFAULT_CLINIC_DEVICES;
		return [];
	});
	const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
	const [stampedRows, setStampedRows] = useState<Record<string, boolean>>({});

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
				} else if (isDemoShowcaseMode()) {
					setLogs(DEFAULT_SHOWCASE_STERILIZATION_LOGS);
				} else {
					setLogs([]);
				}
			} else {
				if (isDemoShowcaseMode()) {
					setLogs(DEFAULT_SHOWCASE_STERILIZATION_LOGS);
				} else {
					setLogs([]);
				}
			}
		} catch (err) {
			console.error("Failed to load sterilization logs", err);
			if (isDemoShowcaseMode()) {
				setLogs(DEFAULT_SHOWCASE_STERILIZATION_LOGS);
			} else {
				setLogs([]);
			}
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
				if (Array.isArray(data) && data.length > 0) {
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
		const saved = loadSavedClinicAutoclaves();
		if (saved.length > 0) {
			setClinicDevices(saved);
		} else if (isDemoShowcaseMode()) {
			setClinicDevices(DEFAULT_CLINIC_DEVICES);
		} else {
			setClinicDevices([]);
		}
	};

	const [isLoggingBatch, setIsLoggingBatch] = useState(false);

	const handleQuickShiftBatch = async () => {
		if (isLoggingBatch) return;
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
					data.message || "Нормативный цикл стерилизации смены зафиксирован в 1 клик!",
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
		showToast("Электронный штамп ответственного успешно применен к записи", "success");
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

	return (
		<div className="sanpin-tab-content">
			{/* Official Form Header for Print */}
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ РАБОТЫ СТЕРИЛИЗАТОРОВ (АВТОКЛАВОВ)</h2>
				<p title="Контроль работы стерилизаторов">Стерилизация инструментов и контроль качества</p>
			</div>

			{/* Compact 1-Click Autoclave Shift Cycle Strip (32px desktop, 44px mobile touch) */}
			<div
				className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-1.5 my-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] min-w-0"
				style={{ minHeight: "36px", borderRadius: "8px" }}
			>
				<div className="flex items-center gap-2 min-w-0 shrink">
					<span className="px-2 py-0.5 rounded-md bg-[var(--primary,#0284c7)] text-white text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap">
						Стерилизация
					</span>
					<span className="text-xs font-semibold text-ink truncate">
						Типовой регламент: 134°C, 2.1 бар, 5 мин (крафт-пакеты, индикатор 5 класса • 100% норма)
					</span>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-nowrap">
					<button
						type="button"
						onClick={handleQuickShiftBatch}
						aria-busy={isLoggingBatch}
						className="sanpin-btn touch-manipulation h-9 sm:h-8 px-3 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] text-white hover:bg-teal-700 inline-flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-sm w-full sm:w-auto shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[32px]"
						data-testid="banner-autoclave-quick-shift-btn"
						title="Запустить типовой цикл автоклава (134°C, 2.1 бар, 5 мин) и внести в журнал"
					>
						<Sparkles size={14} className="shrink-0" />
						<span className="shrink-0 whitespace-nowrap hidden sm:inline">Запустить типовой цикл (134°C, 2.1 бар, 5 мин)</span>
						<span className="shrink-0 whitespace-nowrap sm:hidden">Запустить типовой цикл</span>
					</button>
				</div>
			</div>

			{/* Table of Sterilization Cycles with Integrated Compact Header (Height <= 36px) */}
			<AutoclaveRegisterTable
				logs={logs}
				filteredLogs={filteredLogs}
				logsSlice={logsSlice}
				loading={loading}
				clinicDevices={clinicDevices}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				deviceFilter={deviceFilter}
				setDeviceFilter={setDeviceFilter}
				stampedRows={stampedRows}
				onStampVerification={handleStampVerification}
				onOpenEquipmentModal={() => setIsEquipmentModalOpen(true)}
				onPrintBatchPouches={handlePrintBatchPouches}
				onPrintSinglePouch={handlePrintSinglePouch}
				onOpenKraftForLog={openKraftForLog}
				onQuickShiftBatch={handleQuickShiftBatch}
				isLoggingBatch={isLoggingBatch}
				onOpenNewCycleModal={() => setIsNewCycleModalOpen(true)}
				onGenerateMonthlyForm257={() =>
					handleGenerateMonthlyForm257(
						deviceFilter !== "all" ? deviceFilter : undefined,
						clinicDevices,
					)
				}
				onOpenJournal257Modal={() => setIsJournal257ModalOpen(true)}
				onOpenKraftModal={() => setIsKraftModalOpen(true)}
				onLoadMore={() => setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP)}
				onLoadAll={() => setDisplayLimit(logsSlice.totalCount)}
			/>

			{/* Official Sterilization Cycle Recording Modal (Form 257/u, Autoclave B / Dry Heat / Glassperlen) */}
			<SterilizationCycleModal
				isOpen={isNewCycleModalOpen}
				onClose={() => setIsNewCycleModalOpen(false)}
				onCycleCreated={fetchLogs}
				clinicDevices={clinicDevices}
			/>

			{/* Kraft Package Barcode & Thermal Label Studio Modal */}
			<KraftPackageBarcodeModal
				isOpen={isKraftModalOpen}
				onClose={() => setIsKraftModalOpen(false)}
				initialAutoclaveId={kraftPrefill.autoclaveId}
				initialCycleNumber={kraftPrefill.cycleNumber || nextCycleNumber}
				initialOperatorName={kraftPrefill.operatorName}
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

export * from "./AutoclavePrintHelpers";
export * from "./AutoclaveRegisterTable";
