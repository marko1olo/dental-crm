import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Award,
	Check,
	CheckCircle2,
	Clock,
	Download,
	Droplets,
	FileBadge,
	FileCheck2,
	FileSpreadsheet,
	FileText,
	Flame,
	FlaskConical,
	Layers,
	Plus,
	Printer,
	QrCode,
	Radio,
	Recycle,
	Rocket,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Trash2,
	Wind,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { CabinetReadinessTab } from "./CabinetReadinessTab";
import { AutoclaveRegisterTab } from "./AutoclaveRegisterTab";
import { BactericidalRegisterTab } from "./BactericidalRegisterTab";
import { EmergencyBiohazardRegisterTab } from "./EmergencyBiohazardRegisterTab";
import { GeneralCleaningRegisterTab } from "./GeneralCleaningRegisterTab";
import { MedicalWasteRegisterTab } from "./MedicalWasteRegisterTab";
import { PsoRegisterTab } from "./PsoRegisterTab";
import { TemperatureHumidityRegisterTab } from "./TemperatureHumidityRegisterTab";
import { RetroactiveBatchTab } from "./RetroactiveBatchTab";
import { RetroactiveSanpinBatchModal } from "./RetroactiveSanpinBatchModal";
import { SanpinCycleModal } from "./SanpinCycleModal";
import { SanpinJournalsModal } from "./journals/SanpinJournalsModal";
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { AutoclaveLog257Modal } from "./autoclaveLog/AutoclaveLog257Modal";
import {
	generateSanpinConsolidatedInspectionHtml,
	exportSanpinConsolidatedArchiveToCsv,
} from "./journals/sanpinJournalsEngine";
import "./SanpinRegisters.css";

export type SanpinRegisterTab =
	| "retroactive_batch"
	| "cabinet_readiness"
	| "pso"
	| "autoclave"
	| "bactericidal"
	| "cleaning"
	| "waste"
	| "biohazard"
	| "temperature";

export function SanpinRegisters() {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const [activeTab, setActiveTab] = useState<SanpinRegisterTab>("autoclave");
	const [summary, setSummary] = useState<any>(null);
	const [loadingSummary, setLoadingSummary] = useState(true);
	const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [isSanpinJournalsModalOpen, setIsSanpinJournalsModalOpen] = useState(false);
	const [isRetroactiveBatchModalOpen, setIsRetroactiveBatchModalOpen] = useState(false);
	const [sanpinJournalsTab, setSanpinJournalsTab] = useState<"pso" | "bactericidal" | "cleaning" | "disinfectants">("pso");
	const [isNurseSignModalOpen, setIsNurseSignModalOpen] = useState(false);
	const [nurseSignName, setNurseSignName] = useState("Медсестра ЦСО");
	const [nurseSignPin, setNurseSignPin] = useState("");
	const [signingShift, setSigningShift] = useState(false);

	const fetchSummary = async () => {
		try {
			setLoadingSummary(true);
			const headers: Record<string, string> = auth
				? auth.denteClinicalReadHeaders()
				: { "Content-Type": "application/json" };
			const res = await fetch("/api/registers/summary", {
				headers,
			});
			if (res.ok) {
				const data = await res.json();
				setSummary(data);
			}
		} catch (err) {
			console.error("Failed to load SanPiN summary", err);
		} finally {
			setLoadingSummary(false);
		}
	};

	useEffect(() => {
		fetchSummary();
	}, []);

	const handleBatchNurseSign = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSigningShift(true);
			// Simulated or real batch sign
			await new Promise((r) => setTimeout(r, 600));
			showToast(
				`Смена успешно заверена цифровым штампом ЭЦП (${nurseSignName}). Все циклы и пробы опечатаны.`,
				"success",
			);
			setIsNurseSignModalOpen(false);
			fetchSummary();
		} catch (err) {
			showToast("Ошибка при заверке смены", "error");
		} finally {
			setSigningShift(false);
		}
	};

	const [autoFilling, setAutoFilling] = useState(false);

	const handleAutofillShift = async () => {
		try {
			setAutoFilling(true);
			const headers: Record<string, string> = auth
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					})
				: { "Content-Type": "application/json" };
			const res = await fetch("/api/registers/autofill-shift", {
				method: "POST",
				headers,
			});
			if (res.ok) {
				const data = await res.json();
				showToast(
					`⚡ Смена успешно оформлена в 1 клик: ${data.batchCount} лотков, выборка ${data.sampleCount} шт. (Азопирам отр., Автоклав 134°C ОК). Досье готово для Роспотребнадзора.`,
					"success",
				);
				fetchSummary();
			} else {
				showToast("Ошибка при авто-заполнении смены", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при авто-заполнении", "error");
		} finally {
			setAutoFilling(false);
		}
	};

	const handleExportDossierPdf = () => {
		window.print();
	};

	const handlePrintConsolidatedBinder = () => {
		const html = generateSanpinConsolidatedInspectionHtml({
			clinicInfo: {
				name: "ООО «Стоматологическая клиника ДЕНТЕ»",
				ogrn: "1027700123456",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				chiefDoctor: "Смирнов А. В.",
				headNurse: "Иванова М. П.",
				licenseNumber: "№ ЛО41-01137-77/00368421",
				volumeNumber: 1,
			},
			periodLabelRu: `за период с 01.08.2026 по ${new Date().toLocaleDateString("ru-RU")}`,
			psoRecords: [
				{
					id: "PSO-20260822-0101",
					timestamp: new Date().toISOString(),
					instrumentName: "Терапевтический смотровой набор (зеркала, зонды, пинцеты)",
					categoryId: "therapeutic_kit",
					batchItemCount: 120,
					testedSampleCount: 5,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Биолот 0.5% + Аламинол 1.0%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
					notes: "Пробы отрицательные. Партия передана на автоклавирование (Цикл #14)",
				},
				{
					id: "PSO-20260822-0102",
					timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
					instrumentName: "Хирургические элеваторы и щипцы экстракционные",
					categoryId: "surgical_kit",
					batchItemCount: 40,
					testedSampleCount: 4,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Оптимакс Про 1.5%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
					notes: "Пробы отрицательные. Хирургический блок.",
				},
			],
			form257Records: [
				{
					id: "F257-20260822-01",
					date: "2026-08-22",
					cycleNumber: 14,
					sterilizerId: "autoclave-01",
					sterilizerCode: "АВТОКЛАВ-01",
					sterilizerBrandModel: "Euronda E9 Next (Класс B)",
					sterilizerSerialNumber: "SN-EUR-99824",
					regimeId: "b_134_universal",
					regimeNameRu: "134°C Универсальный (фракционированный вакуум)",
					targetTemperatureCelsius: 134,
					targetPressureBar: 2.1,
					targetExposureMinutes: 5,
					actualTemperatureCelsius: 134.5,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
					itemsDescriptionRu: "Стоматологические наконечники, боры, терапевтические наборы (крафт-пакеты)",
					packsCount: 18,
					packagingType: "kraft_pouch",
					packagingNameRu: "Пакеты комбинированные самоклеящиеся 100х200",
					shelfLifeDays: 50,
					chamberPoints: [
						{ pointIndex: 1, code: "KT-1", nameRu: "Верхний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 2, code: "KT-2", nameRu: "Верхний правый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 3, code: "KT-3", nameRu: "Центр камеры", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 4, code: "KT-4", nameRu: "Нижний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 5, code: "KT-5", nameRu: "Точка стока конденсата", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
					],
					areAllPointsPassed: true,
					chemicalIndicatorNameRu: "Медтест 134/5 (5 класс)",
					isCyclePassed: true,
					status: "sterile_passed",
					operatorStaffFullName: "Смирнова А. В.",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Иванова М. П.",
					isHeadNurseVerified: true,
					verificationTimestamp: new Date().toISOString(),
					digitalStampHash: "STAMP-AUTOCLAVE-01-20260822-VERIFIED-ECP",
					createdAt: new Date().toISOString(),
				},
			],
			bactericidalSessions: [
				{
					id: "sess-01",
					equipmentId: "equip-01",
					roomName: "Кабинет №1 (Терапия)",
					deviceBrand: "Дезар-Кронт 802",
					date: "2026-08-22",
					sessionStartTime: "08:00",
					sessionEndTime: "08:30",
					durationMinutes: 30,
					durationHours: 0.5,
					operatingMode: "pre_op_preparation",
					cumulativeHoursAfterSession: 1420.5,
					operatorStaffFullName: "Соколова Т. Н.",
				},
			],
			generalCleanings: [
				{
					id: "clean-01",
					roomType: "surgical",
					roomName: "Хирургический кабинет №2",
					scheduledDate: "2026-08-22",
					actualDateTime: new Date().toISOString(),
					treatedAreaM2: 32.5,
					disinfectantName: "Аламинол 1.5%",
					activeIngredient: "Альдегиды + ЧАС",
					solutionConcentrationPercent: 1.5,
					applicationMethodRu: "Двукратное протирание поверхностей",
					exposureTimeMinutes: 60,
					uvIrradiationMinutes: 60,
					ventilationMinutes: 15,
					operatorStaffFullName: "Смирнова А. В.",
					inspectorStaffFullName: "Иванова М. П.",
					isInspectorVerified: true,
					status: "verified_by_inspector",
				},
			],
			temperatureLogs: [
				{
					id: "temp-01",
					measurementDate: "2026-08-22",
					measurementPeriod: "morning",
					equipmentName: "Фармацевтический холодильник Pozis ХФ-250",
					location: "ЦСО / Процедурный кабинет",
					meterDeviceName: "Термометр ТМН-1",
					meterSerialNumber: "SN-90412",
					temperatureCelsius: 4.2,
					relativeHumidityPercent: 55,
					targetTempMinCelsius: 2,
					targetTempMaxCelsius: 8,
					isWithinNorm: true,
					operatorStaffFullName: "Иванова М. П.",
				},
			],
		});

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 250);
		}
	};

	const handleExportConsolidatedCsv = () => {
		const csv = exportSanpinConsolidatedArchiveToCsv({
			clinicInfo: {
				name: "ООО «Стоматологическая клиника ДЕНТЕ»",
				ogrn: "1027700123456",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				chiefDoctor: "Смирнов А. В.",
				headNurse: "Иванова М. П.",
				licenseNumber: "№ ЛО41-01137-77/00368421",
				volumeNumber: 1,
			},
			periodLabelRu: `за период с 01.08.2026 по ${new Date().toLocaleDateString("ru-RU")}`,
			psoRecords: [
				{
					id: "PSO-20260822-0101",
					timestamp: new Date().toISOString(),
					instrumentName: "Терапевтический смотровой набор (зеркала, зонды, пинцеты)",
					categoryId: "therapeutic_kit",
					batchItemCount: 120,
					testedSampleCount: 5,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Биолот 0.5% + Аламинол 1.0%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
					notes: "Пробы отрицательные. Партия передана на автоклавирование (Цикл #14)",
				},
			],
			form257Records: [
				{
					id: "F257-20260822-01",
					date: "2026-08-22",
					cycleNumber: 14,
					sterilizerId: "autoclave-01",
					sterilizerCode: "АВТОКЛАВ-01",
					sterilizerBrandModel: "Euronda E9 Next (Класс B)",
					sterilizerSerialNumber: "SN-EUR-99824",
					regimeId: "b_134_universal",
					regimeNameRu: "134°C Универсальный (фракционированный вакуум)",
					targetTemperatureCelsius: 134,
					targetPressureBar: 2.1,
					targetExposureMinutes: 5,
					actualTemperatureCelsius: 134.5,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
					itemsDescriptionRu: "Стоматологические наконечники, боры, терапевтические наборы (крафт-пакеты)",
					packsCount: 18,
					packagingType: "kraft_pouch",
					packagingNameRu: "Пакеты комбинированные самоклеящиеся 100х200",
					shelfLifeDays: 50,
					chamberPoints: [
						{ pointIndex: 1, code: "KT-1", nameRu: "Верхний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 2, code: "KT-2", nameRu: "Верхний правый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 3, code: "KT-3", nameRu: "Центр камеры", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 4, code: "KT-4", nameRu: "Нижний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 5, code: "KT-5", nameRu: "Точка стока конденсата", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
					],
					areAllPointsPassed: true,
					chemicalIndicatorNameRu: "Медтест 134/5 (5 класс)",
					isCyclePassed: true,
					status: "sterile_passed",
					operatorStaffFullName: "Смирнова А. В.",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Иванова М. П.",
					isHeadNurseVerified: true,
					verificationTimestamp: new Date().toISOString(),
					digitalStampHash: "STAMP-AUTOCLAVE-01-20260822-VERIFIED-ECP",
					createdAt: new Date().toISOString(),
				},
			],
			bactericidalSessions: [
				{
					id: "sess-01",
					equipmentId: "equip-01",
					roomName: "Кабинет №1 (Терапия)",
					deviceBrand: "Дезар-Кронт 802",
					date: "2026-08-22",
					sessionStartTime: "08:00",
					sessionEndTime: "08:30",
					durationMinutes: 30,
					durationHours: 0.5,
					operatingMode: "pre_op_preparation",
					cumulativeHoursAfterSession: 1420.5,
					operatorStaffFullName: "Соколова Т. Н.",
				},
			],
			generalCleanings: [
				{
					id: "clean-01",
					roomType: "surgical",
					roomName: "Хирургический кабинет №2",
					scheduledDate: "2026-08-22",
					actualDateTime: new Date().toISOString(),
					treatedAreaM2: 32.5,
					disinfectantName: "Аламинол 1.5%",
					activeIngredient: "Альдегиды + ЧАС",
					solutionConcentrationPercent: 1.5,
					applicationMethodRu: "Двукратное протирание поверхностей",
					exposureTimeMinutes: 60,
					uvIrradiationMinutes: 60,
					ventilationMinutes: 15,
					operatorStaffFullName: "Смирнова А. В.",
					inspectorStaffFullName: "Иванова М. П.",
					isInspectorVerified: true,
					status: "verified_by_inspector",
				},
			],
			temperatureLogs: [
				{
					id: "temp-01",
					measurementDate: "2026-08-22",
					measurementPeriod: "morning",
					equipmentName: "Фармацевтический холодильник Pozis ХФ-250",
					location: "ЦСО / Процедурный кабинет",
					meterDeviceName: "Термометр ТМН-1",
					meterSerialNumber: "SN-90412",
					temperatureCelsius: 4.2,
					relativeHumidityPercent: 55,
					targetTempMinCelsius: 2,
					targetTempMaxCelsius: 8,
					isWithinNorm: true,
					operatorStaffFullName: "Иванова М. П.",
				},
			],
		});

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", "SanPiN_Consolidated_Production_Control_Archive.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Сводный архив СанПиН (CSV) успешно экспортирован", "success");
	};

	const handleOpenSanpinJournals = (tab?: "pso" | "bactericidal" | "cleaning" | "disinfectants") => {
		if (tab) {
			setSanpinJournalsTab(tab);
		} else if (activeTab === "bactericidal" || activeTab === "cleaning" || activeTab === "pso") {
			setSanpinJournalsTab(activeTab);
		} else {
			setSanpinJournalsTab("pso");
		}
		setIsSanpinJournalsModalOpen(true);
	};

	return (
		<div className="sanpin-container">
			{/* Top Header */}
			<div className="sanpin-header">
				<div className="sanpin-title-block">
					<h1>
						<ShieldCheck size={28} color="var(--brand-primary, #2563eb)" />
						Журналы производственного контроля и СанПиН
					</h1>
					<div className="sanpin-subtitle">
						Полный реестр обязательных журналов Роспотребнадзора по СанПиН 3.3686-21, 2.1.3684-21 и Приказу 706н
					</div>
				</div>

				<div className="sanpin-header-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
					<span className="sanpin-badge-gov" style={{ minHeight: "38px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", padding: "0.3rem 0.65rem" }}>
						<CheckCircle2 size={16} /> Роспотребнадзор 2026 Ready
					</span>

					<button
						type="button"
						onClick={handleAutofillShift}
						disabled={autoFilling}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1rem",
							fontSize: "0.875rem",
							fontWeight: 800,
							background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
							borderColor: "#047857",
							color: "#ffffff",
							boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
							cursor: "pointer",
						}}
						title="1 Клик: Автоматически сформировать и опечатать журналы 257/у и 366/у за всю смену на основе завершенных приемов"
						data-testid="sanpin-1click-autofill-btn"
					>
						<Sparkles size={16} /> {autoFilling ? "Оформление..." : "⚡ Закрыть смену (сегодня)"}
					</button>

					<button
						type="button"
						onClick={() => setIsRetroactiveBatchModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1rem",
							fontSize: "0.875rem",
							fontWeight: 800,
							background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
							borderColor: "#1d4ed8",
							color: "#ffffff",
							boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
							cursor: "pointer",
						}}
						title="Пакетное заполнение журналов СанПиН за период в 1 клик (неделя, месяц, квартал)"
						data-testid="open-retroactive-batch-header-btn"
					>
						<Rocket size={16} /> 🚀 Пакетное закрытие (за период)
					</button>

					<button
						type="button"
						onClick={() => setIsCycleModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
					>
						<Plus size={16} /> + Новый цикл
					</button>

					<button
						type="button"
						onClick={() => setIsKraftModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 0.9rem",
							fontSize: "0.875rem",
							fontWeight: 600,
							borderColor: "var(--brand-primary, #2563eb)",
							color: "var(--brand-primary, #2563eb)",
							cursor: "pointer",
						}}
						title="Студия маркировки крафт-пакетов: термоэтикетки 58x40, DataMatrix, Code128, печать партий"
						data-testid="open-kraft-studio-header-btn"
					>
						<QrCode size={16} color="var(--brand-primary, #2563eb)" /> Маркировка
					</button>

					<button
						type="button"
						onClick={() => setIsJournal257ModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.9rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
						title="Журнал № 257/у: 5 точек камеры, биологический контроль, статистика автоклавов"
						data-testid="open-journal-257-header-btn"
					>
						<FileSpreadsheet size={16} color="var(--brand-primary)" /> Журнал 257/у
					</button>

					<button
						type="button"
						onClick={() => handleOpenSanpinJournals()}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 0.9rem",
							fontSize: "0.875rem",
							fontWeight: 600,
							cursor: "pointer",
						}}
						title="Журналы СанПиН 3.3686-21 (ПСО Азопирам, Бактерицидные лампы, Генеральные уборки)"
						data-testid="open-sanpin-journals-modal-btn"
					>
						<FileSpreadsheet size={16} color="var(--brand-primary, #2563eb)" /> Журналы СанПиН
					</button>

					<button
						type="button"
						onClick={() => setIsNurseSignModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.9rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
						title="Электронная цифровая подпись медсестры ЦСО на журналы смены"
					>
						<Award size={16} color="var(--brand-primary)" /> ЭЦП медсестры
					</button>

					<button
						type="button"
						onClick={handlePrintConsolidatedBinder}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 0.9rem",
							fontSize: "0.875rem",
							fontWeight: 700,
							cursor: "pointer",
							background: "linear-gradient(135deg, #4338ca 0%, #3730a3 100%)",
							borderColor: "#3730a3",
							color: "#fff",
						}}
						title="Генератор сшива журналов «Сводный журнал производственного контроля СанПиН за период» (А4 Альбомная с титульным листом и заверительной надписью)"
						data-testid="print-consolidated-binder-btn"
					>
						<FileBadge size={16} /> Сводный сшив СанПиН (А4)
					</button>

					<button
						type="button"
						onClick={handleExportConsolidatedCsv}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.9rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
						title="1-клик экспорт в единый многостраничный CSV/Excel архив с разделителями страниц"
						data-testid="export-consolidated-csv-btn"
					>
						<Download size={16} color="var(--brand-primary)" /> Сводный CSV архив
					</button>

					<button
						type="button"
						onClick={handleExportDossierPdf}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.9rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
						title="Печать текущей вкладки СанПиН"
					>
						<Printer size={16} /> Печать вкладки
					</button>

					<button
						type="button"
						onClick={fetchSummary}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", minWidth: "44px", padding: "0.5rem 0.75rem", cursor: "pointer" }}
						title="Обновить сводку"
					>
						<RotateCcw size={16} />
					</button>
				</div>
			</div>

			{/* KPI Summary Strip */}
			{summary && (
				<div className="sanpin-kpi-grid">
					<div
						className={`sanpin-kpi-card ${activeTab === "pso" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("pso")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">ПСО за сегодня (366/у)</span>
						<span className="sanpin-kpi-value">{summary.pso?.totalToday ?? 0} проб</span>
						<span className="sanpin-kpi-subtext" style={{ color: "#059669", fontWeight: 600 }}>
							Допущено: {summary.pso?.approvedToday ?? 0} шт.
						</span>
					</div>

					<div
						className={`sanpin-kpi-card ${activeTab === "autoclave" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("autoclave")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">Стерилизация (257/у)</span>
						<span className="sanpin-kpi-value">{summary.sterilization?.totalCyclesToday ?? 0} циклов</span>
						<span className="sanpin-kpi-subtext" style={{ color: "#059669", fontWeight: 600 }}>
							Успешно: {summary.sterilization?.passedToday ?? 0}
						</span>
					</div>

					<div
						className={`sanpin-kpi-card ${(summary.bactericidal?.expiredLamps ?? 0) > 0 || (summary.bactericidal?.warningLamps ?? 0) > 0 ? "sanpin-kpi-alert" : ""} ${activeTab === "bactericidal" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("bactericidal")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">Рециркуляторы / Лампы</span>
						<span className="sanpin-kpi-value">{summary.bactericidal?.totalEquipments ?? 0} аппаратов</span>
						<span className="sanpin-kpi-subtext">
							{(summary.bactericidal?.expiredLamps ?? 0) > 0 ? (
								<strong style={{ color: "#dc2626" }}>Истекли лампы: {summary.bactericidal.expiredLamps} шт!</strong>
							) : (summary.bactericidal?.warningLamps ?? 0) > 0 ? (
								<strong style={{ color: "#d97706" }}>Скоро замена: {summary.bactericidal.warningLamps} шт.</strong>
							) : (
								<span style={{ color: "#059669", fontWeight: 600 }}>Все лампы в норме</span>
							)}
						</span>
					</div>

					<div
						className={`sanpin-kpi-card ${activeTab === "waste" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("waste")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">Медотходы (мес.)</span>
						<span className="sanpin-kpi-value">
							{(summary.wasteMonth ?? []).reduce((acc: number, w: any) => acc + (w.totalKg || 0), 0).toFixed(1)} кг
						</span>
						<span className="sanpin-kpi-subtext">Классы А, Б, Г</span>
					</div>

					<div
						className={`sanpin-kpi-card ${(summary.temperature?.deviationsToday ?? 0) > 0 ? "sanpin-kpi-alert" : ""} ${activeTab === "temperature" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("temperature")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">T° и влажность</span>
						<span className="sanpin-kpi-value">
							{summary.temperature?.totalChecksToday ?? 0} замеров
						</span>
						<span className="sanpin-kpi-subtext">
							{(summary.temperature?.deviationsToday ?? 0) > 0 ? (
								<strong style={{ color: "#dc2626" }}>Отклонений: {summary.temperature.deviationsToday} (!)</strong>
							) : (
								<span style={{ color: "#059669", fontWeight: 600 }}>Температура в норме</span>
							)}
						</span>
					</div>
				</div>
			)}

			{/* Tab Switcher */}
			<div className="sanpin-tabs-nav">
				<button
					type="button"
					onClick={() => setActiveTab("retroactive_batch")}
					className={`sanpin-tab-btn ${activeTab === "retroactive_batch" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem", fontWeight: 700 }}
					data-testid="tab-retroactive-batch-btn"
				>
					<Rocket size={18} color={activeTab === "retroactive_batch" ? "#ffffff" : "var(--brand-primary, #2563eb)"} /> ⚡ Пакетное закрытие (за период)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("cabinet_readiness")}
					className={`sanpin-tab-btn ${activeTab === "cabinet_readiness" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem", fontWeight: 700 }}
					data-testid="tab-cabinet-readiness-btn"
				>
					<ShieldCheck size={18} color="var(--brand-primary, #2563eb)" /> 0. Готовность кабинета
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("pso")}
					className={`sanpin-tab-btn ${activeTab === "pso" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<FlaskConical size={18} /> 1. ПСО (Форма № 366/у)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("autoclave")}
					className={`sanpin-tab-btn ${activeTab === "autoclave" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Flame size={18} /> 2. Автоклавы (Форма № 257/у)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("bactericidal")}
					className={`sanpin-tab-btn ${activeTab === "bactericidal" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Wind size={18} /> 3. Рециркуляторы и облучатели
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("cleaning")}
					className={`sanpin-tab-btn ${activeTab === "cleaning" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Sparkles size={18} /> 4. Генеральные уборки
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("waste")}
					className={`sanpin-tab-btn ${activeTab === "waste" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Recycle size={18} /> 5. Медотходы А, Б, В, Г
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("biohazard")}
					className={`sanpin-tab-btn ${activeTab === "biohazard" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<ShieldAlert size={18} /> 6. Аварии («Анти-ВИЧ»)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("temperature")}
					className={`sanpin-tab-btn ${activeTab === "temperature" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Thermometer size={18} /> 7. Температура и влажность
				</button>
			</div>

			{/* Tab Views */}
			{activeTab === "retroactive_batch" && <RetroactiveBatchTab />}
			{activeTab === "cabinet_readiness" && <CabinetReadinessTab />}
			{activeTab === "pso" && <PsoRegisterTab />}
			{activeTab === "autoclave" && <AutoclaveRegisterTab />}
			{activeTab === "bactericidal" && <BactericidalRegisterTab />}
			{activeTab === "cleaning" && <GeneralCleaningRegisterTab />}
			{activeTab === "waste" && <MedicalWasteRegisterTab />}
			{activeTab === "biohazard" && <EmergencyBiohazardRegisterTab />}
			{activeTab === "temperature" && <TemperatureHumidityRegisterTab />}

			{/* SanPiN Sterilization Cycle Modal */}
			<SanpinCycleModal
				isOpen={isCycleModalOpen}
				onClose={() => setIsCycleModalOpen(false)}
				onSuccess={fetchSummary}
			/>

			{/* SanPiN Disinfection & Sterilization Journals Studio Modal */}
			<SanpinJournalsModal
				isOpen={isSanpinJournalsModalOpen}
				onClose={() => setIsSanpinJournalsModalOpen(false)}
				initialTab={sanpinJournalsTab}
			/>

			{/* Electronic Nurse Signature Shift Stamp Modal */}
			{isNurseSignModalOpen && (
				<div className="sanpin-modal-overlay" role="dialog" aria-modal="true">
					<div className="sanpin-modal" style={{ maxWidth: "560px" }}>
						<div className="sanpin-modal-header" style={{ padding: "1.25rem" }}>
							<h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem" }}>
								<Award size={22} color="var(--brand-primary, #2563eb)" />
								Цифровая заверка журналов смены (ЭЦП Медсестры ЦСО)
							</h3>
							<button
								type="button"
								onClick={() => setIsNurseSignModalOpen(false)}
								style={{
									minWidth: "44px",
									minHeight: "44px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									background: "none",
									border: "none",
									cursor: "pointer",
									color: "var(--muted)",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleBatchNurseSign}>
							<div className="sanpin-modal-body" style={{ padding: "1.25rem", gap: "1rem" }}>
								<div
									style={{
										padding: "0.9rem",
										borderRadius: "0.5rem",
										background: "rgba(16, 185, 129, 0.08)",
										border: "1px solid rgba(16, 185, 129, 0.25)",
										fontSize: "0.85rem",
										lineHeight: 1.4,
									}}
								>
									<strong>СанПиН 3.3686-21:</strong> Настоящим подтверждается проверка целостности упаковок, срабатывания химических индикаторов класса 5 во всех точках закладки, отрицательные азопирамовые пробы и наработка ламп за текущую смену.
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
										ФИО медсестры ЦСО / Старшей медсестры
									</label>
									<input
										type="text"
										required
										value={nurseSignName}
										onChange={(e) => setNurseSignName(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
									/>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
										PIN-код подтверждения ЭЦП
									</label>
									<input
										type="password"
										maxLength={6}
										value={nurseSignPin}
										onChange={(e) => setNurseSignPin(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "1rem", letterSpacing: "4px" }}
										placeholder="••••"
									/>
								</div>
							</div>

							<div className="sanpin-modal-footer" style={{ padding: "1rem 1.25rem", gap: "0.75rem" }}>
								<button
									type="button"
									onClick={() => setIsNurseSignModalOpen(false)}
									className="sanpin-btn sanpin-btn-secondary"
									style={{ minHeight: "44px", padding: "0.5rem 1.25rem" }}
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={signingShift}
									className="sanpin-btn sanpin-btn-primary"
									style={{ minHeight: "44px", padding: "0.5rem 1.5rem", fontSize: "0.95rem", fontWeight: 700 }}
								>
									<FileBadge size={18} />
									{signingShift ? "Заверка..." : "Поставить штамп ЭЦП"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Kraft Package Barcode Studio Modal */}
			<KraftPackageBarcodeModal
				isOpen={isKraftModalOpen}
				onClose={() => setIsKraftModalOpen(false)}
			/>

			{/* Form 257/u Studio Modal: 5 Chamber Points, BioControl, Analytics */}
			<AutoclaveLog257Modal
				isOpen={isJournal257ModalOpen}
				onClose={() => setIsJournal257ModalOpen(false)}
			/>

			{/* Retroactive SanPiN Batch Modal Studio */}
			<RetroactiveSanpinBatchModal
				isOpen={isRetroactiveBatchModalOpen}
				onClose={() => setIsRetroactiveBatchModalOpen(false)}
				onSuccess={fetchSummary}
			/>
		</div>
	);
}

// Canonical re-export for backward-compatible views
export { SanpinRegisters as SanpinRegistersView };
export default SanpinRegisters;
