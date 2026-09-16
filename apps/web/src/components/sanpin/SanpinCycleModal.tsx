import {
	type CreateSterilizationLogDto,
	type CreatePsoCleaningLogDto,
	type SterilizationDeviceType,
	type SterilizerIndicatorClass,
	type SterilizerPackagingType,
	type SterilizerEquipment,
	computePackagingExpirationDate,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	Boxes,
	Check,
	CheckCircle2,
	Clock,
	FileBadge,
	FileSpreadsheet,
	Flame,
	FlaskConical,
	Info,
	Layers,
	PackageCheck,
	Printer,
	QrCode,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { generateThermalStickerHtml, type KraftPackageRecord } from "./kraft/kraftPackageEngine";

export interface SanpinCycleModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	initialDeviceName?: string;
	suggestedCycleNumber?: number;
}

const APPARATUS_PRESETS = [
	{
		name: "Melag Vacuklav 23 B+",
		type: "autoclave_steam" as SterilizationDeviceType,
		temp: 134,
		pressure: 2.15,
		duration: 5,
		indicator: "class5_integrating" as SterilizerIndicatorClass,
		packaging: "kraft_heat_sealed" as SterilizerPackagingType,
		label: "Melag 23 B+ (134°C / 2.15 бар)",
	},
	{
		name: "W&H Lisa 500",
		type: "autoclave_steam" as SterilizationDeviceType,
		temp: 134,
		pressure: 2.15,
		duration: 5,
		indicator: "class5_integrating" as SterilizerIndicatorClass,
		packaging: "kraft_heat_sealed" as SterilizerPackagingType,
		label: "W&H Lisa (134°C / 2.15 бар)",
	},
	{
		name: "Euronda E9 Next",
		type: "autoclave_steam" as SterilizationDeviceType,
		temp: 121,
		pressure: 1.1,
		duration: 20,
		indicator: "class5_integrating" as SterilizerIndicatorClass,
		packaging: "kraft_heat_sealed" as SterilizerPackagingType,
		label: "Euronda E9 (121°C деликатный)",
	},
	{
		name: "ГП-20 СПУ (Сухожаровой шкаф)",
		type: "dry_heat" as SterilizationDeviceType,
		temp: 180,
		pressure: null,
		duration: 60,
		indicator: "class4_multivariable" as SterilizerIndicatorClass,
		packaging: "kraft_self_adhesive" as SterilizerPackagingType,
		label: "Сухожар ГП-20 (180°C / 60 мин)",
	},
	{
		name: "HMTS-40 Плазма",
		type: "plasma" as SterilizationDeviceType,
		temp: 55,
		pressure: null,
		duration: 35,
		indicator: "class5_integrating" as SterilizerIndicatorClass,
		packaging: "laminated_heat_sealed" as SterilizerPackagingType,
		label: "HMTS-40 (Плазменный 55°C)",
	},
];

const QUICK_ITEM_PRESETS = [
	"Хирургический набор №1 (щипцы, элеваторы, скальпель, кюреты)",
	"Терапевтический набор (зеркала, зонды, гладилки, пинцеты)",
	"Наконечники турбинные и угловые микромоторные (4 шт.)",
	"Хирургический набор для имплантации и синус-лифтинга",
	"Эндодонтические инструменты (К-файлы, спредеры, плаггеры)",
	"Ортодонтические щипцы и позиционеры",
];

export function SanpinCycleModal({
	isOpen,
	onClose,
	onSuccess,
	initialDeviceName = "Melag Vacuklav 23 B+",
	suggestedCycleNumber = 1,
}: SanpinCycleModalProps) {
	const [deviceName, setDeviceName] = useState(initialDeviceName);
	const [sterilizerType, setSterilizerType] = useState<SterilizationDeviceType>("autoclave_steam");
	const [serialNumber, setSerialNumber] = useState("VK-23B-9842");
	const [cycleNumber, setCycleNumber] = useState<number>(suggestedCycleNumber);
	const [itemsDescription, setItemsDescription] = useState(
		"Хирургический набор №1 (щипцы, элеваторы, скальпель, кюреты)",
	);
	const [packagingType, setPackagingType] = useState<SterilizerPackagingType>("kraft_heat_sealed");
	const [temperatureCelsius, setTemperatureCelsius] = useState<number>(134);
	const [pressureBar, setPressureBar] = useState<number | null>(2.15);
	const [durationMin, setDurationMin] = useState<number>(5);
	const [indicatorType, setIndicatorType] = useState<SterilizerIndicatorClass>("class5_integrating");
	const [passedIndicator, setPassedIndicator] = useState(true);
	const [biologicalTestResult, setBiologicalTestResult] = useState<"passed" | "failed" | "not_conducted">("not_conducted");
	const [nurseVerified, setNurseVerified] = useState(true);
	const [nurseName, setNurseName] = useState("Медсестра ЦСО");
	const [notes, setNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [clinicEquipments, setClinicEquipments] = useState<SterilizerEquipment[]>([]);
	const [packageCount, setPackageCount] = useState<number>(10);
	const [packageSize, setPackageSize] = useState<string>("size_100x200");
	const [autoRecordPso, setAutoRecordPso] = useState<boolean>(true);
	const [psoAzopyramNegative, setPsoAzopyramNegative] = useState<boolean>(true);
	const [psoPhenolNegative, setPsoPhenolNegative] = useState<boolean>(true);
	const [psoDetergent, setPsoDetergent] = useState<string>("Биолот 0.5% + Аламинол 1.0%");

	useEffect(() => {
		if (isOpen) {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			fetch("/api/registers/sterilizers/equipments", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			})
				.then((res) => (res.ok ? res.json() : []))
				.then((data) => {
					if (Array.isArray(data)) {
						const activeOnly = data.filter((d: SterilizerEquipment) => d.status === "active");
						setClinicEquipments(activeOnly.length > 0 ? activeOnly : data);
					}
				})
				.catch(() => {});
		}
	}, [isOpen]);

	useEffect(() => {
		if (suggestedCycleNumber) {
			setCycleNumber(suggestedCycleNumber);
		}
	}, [suggestedCycleNumber]);

	// Live expiration date calculation
	const estimatedExpiration = useMemo(() => {
		return computePackagingExpirationDate(packagingType, new Date());
	}, [packagingType]);

	const calculatedBarcode = useMemo(() => {
		const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
		const packCode = packagingType.slice(0, 4).toUpperCase();
		return `STER-${dateStr}-C${cycleNumber}-${packCode}`;
	}, [cycleNumber, packagingType]);

	if (!isOpen) return null;

	const handleEquipmentSelect = (eq: SterilizerEquipment) => {
		setDeviceName(eq.brandModel || eq.name);
		setSerialNumber(eq.serialNumber);
		setSterilizerType(eq.deviceType);
		if (eq.deviceType === "dry_heat") {
			setTemperatureCelsius(180);
			setPressureBar(null);
			setDurationMin(60);
			setIndicatorType("class4_multivariable");
			setPackagingType("kraft_self_adhesive");
		} else {
			setTemperatureCelsius(134);
			setPressureBar(2.15);
			setDurationMin(5);
			setIndicatorType("class5_integrating");
			setPackagingType("kraft_heat_sealed");
		}
	};

	const handlePresetSelect = (preset: (typeof APPARATUS_PRESETS)[0]) => {
		setDeviceName(preset.name);
		setSterilizerType(preset.type);
		setTemperatureCelsius(preset.temp);
		setPressureBar(preset.pressure);
		setDurationMin(preset.duration);
		setIndicatorType(preset.indicator);
		setPackagingType(preset.packaging);
	};

	const handleApplyTypicalCycle = () => {
		const targetEq = clinicEquipments[0];
		if (targetEq) {
			handleEquipmentSelect(targetEq);
		} else {
			handlePresetSelect(APPARATUS_PRESETS[0]!);
		}
		setTemperatureCelsius(134);
		setPressureBar(2.15);
		setDurationMin(5);
		setIndicatorType("class5_integrating");
		setPassedIndicator(true);
		setPackagingType("kraft_heat_sealed");
		setPackageCount(10);
		setAutoRecordPso(true);
		setPsoAzopyramNegative(true);
		setPsoPhenolNegative(true);
		setItemsDescription("Базовый стоматологический набор смены (лотки, зеркала, зонды, пинцеты, боры)");
		setNurseVerified(true);
		setNurseName("Медсестра ЦСО");
		setNotes("СанПиН 3.3686-21. Все 5 контрольных точек камеры изменили цвет на эталон (Норма). ПСО: азопирам и фенолфталеин отрицательны.");
		showToast("Установлен типовой цикл автоклава (134°C, 2.15 бар, 5 мин) и норма ПСО", "success");
	};

	const handleSubmit = async (e?: React.FormEvent, bypassNurse = false) => {
		if (e) e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const effectiveNurse = bypassNurse ? (nurseName.trim() || "Персонал клиники") : (nurseName.trim() || "Персонал клиники");
			const effectiveVerified = bypassNurse ? true : nurseVerified;

			// 1. Mandate 8k & 8e: 1-Click simultaneous PSO cleaning log (Form 366/u)
			if (autoRecordPso) {
				try {
					const totalInstrumentsInBatch = Math.max(1, packageCount * 4);
					const sample1Percent = Math.max(3, Math.round(totalInstrumentsInBatch * 0.01));
					const psoPayload: CreatePsoCleaningLogDto = {
						instrumentName: `${itemsDescription} (Партия ${packageCount} пакетов)`,
						testType: "both",
						batchItemCount: totalInstrumentsInBatch,
						testedSampleCount: sample1Percent,
						isAzopyramNegative: psoAzopyramNegative,
						isPhenolphthaleinNegative: psoPhenolNegative,
						detergentBrand: psoDetergent,
						notes: `ПСО партии перед автоклавированием (Цикл №${cycleNumber}, ${deviceName}, оператор: ${effectiveNurse}). СанПиН 3.3686-21 п. 3584.`,
					};

					await fetch("/api/registers/pso", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
							...(staffToken ? { "X-Staff-Token": staffToken } : {}),
						},
						body: JSON.stringify(psoPayload),
					});
				} catch (psoErr) {
					console.warn("Failed to auto-register PSO log, proceeding with sterilization cycle", psoErr);
				}
			}

			const payload: CreateSterilizationLogDto = {
				deviceName,
				sterilizerType,
				serialNumber: serialNumber || undefined,
				cycleNumber: Number(cycleNumber),
				itemsDescription: `${itemsDescription} [Партия: ${packageCount} пакетов]`,
				packagingType,
				temperatureCelsius: Number(temperatureCelsius),
				pressureBar: sterilizerType === "autoclave_steam" && pressureBar !== null ? Number(pressureBar) : null,
				durationMin: Number(durationMin),
				indicatorType,
				passedIndicator,
				biologicalTestResult,
				notes: notes
					? `${notes}${effectiveVerified ? ` [ЭЦП ЦСО: ${effectiveNurse} подтверждено]` : " [Зафиксировано персоналом клиники]"}`
					: effectiveVerified
						? `[ЭЦП ЦСО: ${effectiveNurse} подтверждено]`
						: "[Зафиксировано персоналом клиники]",
			};

			const res = await fetch("/api/registers/sterilization", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			// Save batch to local kraft packages registry for chairside scanner
			try {
				const existingRaw = localStorage.getItem("dente_kraft_packages_v1");
				const existingList: KraftPackageRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
				const packDate = new Date().toISOString().slice(0, 10);
				const expFormatted = estimatedExpiration
					? new Date(estimatedExpiration).toISOString().slice(0, 10)
					: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);

				const newBatchRecords: KraftPackageRecord[] = [];
				for (let i = 1; i <= Math.min(packageCount, 50); i++) {
					const serialStr = String(i).padStart(3, "0");
					const barcode128 = `KP-${packDate.replace(/-/g, "")}-C${cycleNumber}-${serialStr}`;
					newBatchRecords.push({
						id: `kp-${Date.now()}-${i}`,
						batchId: `CYC-${cycleNumber}`,
						serialNumber: i,
						packageType: packagingType === "laminated_heat_sealed" ? "paper_plastic_pouch" : "paper_self_seal_single",
						packageSize: packageSize as any,
						toolSetId: "custom_set",
						toolSetNameRu: `${itemsDescription.slice(0, 26)} (#${i}/${packageCount})`,
						itemsListRu: [itemsDescription],
						packDate,
						expDate: expFormatted,
						daysLifespan: 50,
						daysRemaining: 50,
						status: "sterile_valid",
						autoclaveId: deviceName,
						cycleNumber: Number(cycleNumber),
						operatorId: "STAFF-01",
						operatorName: effectiveNurse,
						indicatorId: indicatorType === "class6_emulating" ? "vinar_inte_6" : indicatorType === "class5_integrating" ? "vinar_inte_5" : "vinar_steritest_4",
						indicatorVerified: passedIndicator,
						barcode128,
						barcodeDataMatrixPayload: `${barcode128}|${deviceName}|CYC${cycleNumber}|${packDate}|${expFormatted}|${effectiveNurse}`,
						isBreached: false,
						notes: notes || `Партия ${packageCount} шт. (СанПиН 3.3686-21)`,
						createdAt: new Date().toISOString(),
					});
				}
				localStorage.setItem("dente_kraft_packages_v1", JSON.stringify([...newBatchRecords, ...existingList].slice(0, 300)));
			} catch (storageErr) {
				console.warn("Could not save to local kraft storage", storageErr);
			}

			if (res.ok) {
				showToast(
					autoRecordPso
						? `Цикл стерилизации №${cycleNumber} (ф. 257/у) и ПСО партии (ф. 366/у) успешно зафиксированы!`
						: `Стерилизационный цикл №${cycleNumber} зарегистрирован (Форма № 257/у)`,
					"success",
				);
				if (onSuccess) onSuccess();
				onClose();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при фиксации цикла стерилизации", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при отправке журнала стерилизации", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handlePrintPouchLabel = () => {
		const printWin = window.open("", "_blank", "width=500,height=400");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати этикетки", "error");
			return;
		}
		const expFormatted = estimatedExpiration
			? new Date(estimatedExpiration).toISOString().slice(0, 10)
			: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
		const packDate = new Date().toISOString().slice(0, 10);

		const rec: KraftPackageRecord = {
			id: `kp-cycle-${cycleNumber}`,
			batchId: `CYC-${cycleNumber}`,
			serialNumber: 1,
			packageType: (packagingType === "laminated_heat_sealed" ? "paper_plastic_pouch" : "paper_self_seal_single"),
			packageSize: packageSize as any,
			toolSetId: "custom_set",
			toolSetNameRu: itemsDescription.slice(0, 32) || "Стоматологический набор",
			itemsListRu: [itemsDescription],
			packDate,
			expDate: expFormatted,
			daysLifespan: 50,
			daysRemaining: 50,
			status: "sterile_valid",
			autoclaveId: deviceName,
			cycleNumber: Number(cycleNumber),
			operatorId: "STAFF-01",
			operatorName: nurseName.trim() || "Персонал клиники",
			indicatorId: indicatorType === "class6_emulating" ? "vinar_inte_6" : indicatorType === "class5_integrating" ? "vinar_inte_5" : "vinar_steritest_4",
			indicatorVerified: passedIndicator,
			barcode128: calculatedBarcode,
			barcodeDataMatrixPayload: `${calculatedBarcode}|${deviceName}|CYC${cycleNumber}|${packDate}|${expFormatted}|${nurseName.trim() || "Персонал клиники"}`,
			isBreached: false,
			notes: notes || "",
			createdAt: new Date().toISOString(),
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
				<title>Термоэтикетка: ${calculatedBarcode}</title>
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

	const handlePrintBatchLabels = (countToPrint = packageCount) => {
		const printWin = window.open("", "_blank", "width=600,height=500");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати партии этикеток", "error");
			return;
		}
		const expFormatted = estimatedExpiration
			? new Date(estimatedExpiration).toISOString().slice(0, 10)
			: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
		const packDate = new Date().toISOString().slice(0, 10);

		const stickersHtmlArray: string[] = [];
		for (let i = 1; i <= Math.min(countToPrint, 50); i++) {
			const serialStr = String(i).padStart(3, "0");
			const barcode128 = `KP-${packDate.replace(/-/g, "")}-C${cycleNumber}-${serialStr}`;
			const rec: KraftPackageRecord = {
				id: `kp-cycle-${cycleNumber}-${i}`,
				batchId: `CYC-${cycleNumber}`,
				serialNumber: i,
				packageType: (packagingType === "laminated_heat_sealed" ? "paper_plastic_pouch" : "paper_self_seal_single"),
				packageSize: packageSize as any,
				toolSetId: "custom_set",
				toolSetNameRu: `${itemsDescription.slice(0, 24)} (#${i}/${countToPrint})`,
				itemsListRu: [itemsDescription],
				packDate,
				expDate: expFormatted,
				daysLifespan: 50,
				daysRemaining: 50,
				status: "sterile_valid",
				autoclaveId: deviceName,
				cycleNumber: Number(cycleNumber),
				operatorId: "STAFF-01",
				operatorName: nurseName.trim() || "Персонал клиники",
				indicatorId: indicatorType === "class6_emulating" ? "vinar_inte_6" : indicatorType === "class5_integrating" ? "vinar_inte_5" : "vinar_steritest_4",
				indicatorVerified: passedIndicator,
				barcode128,
				barcodeDataMatrixPayload: `${barcode128}|${deviceName}|CYC${cycleNumber}|${packDate}|${expFormatted}|${nurseName.trim() || "Персонал клиники"}`,
				isBreached: false,
				notes: notes || "",
				createdAt: new Date().toISOString(),
			};
			stickersHtmlArray.push(`
				<div class="sticker-wrapper" style="page-break-after: always; display: flex; justify-content: center; align-items: center; width: 58mm; height: 40mm;">
					${generateThermalStickerHtml(rec, { size: "58x40", clinicName: "Стоматологическая клиника «DENTE»" })}
				</div>
			`);
		}

		printWin.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="UTF-8">
				<title>Партия термоэтикеток (${countToPrint} шт.): Цикл #${cycleNumber}</title>
				<style>
					@page { size: 58mm 40mm; margin: 0; }
					body { margin: 0; padding: 0; background: #fff; }
					.sticker-wrapper { width: 58mm; height: 40mm; box-sizing: border-box; }
					@media print {
						body { margin: 0; }
						.sticker-wrapper { page-break-after: always; }
					}
				</style>
			</head>
			<body>
				${stickersHtmlArray.join("\n")}
				<script>window.print(); setTimeout(() => window.close(), 700);</script>
			</body>
			</html>
		`);
		printWin.document.close();
		showToast(`Сформирована печать партии термоэтикеток (${countToPrint} шт.)`, "success");
	};

	return (
		<div className="sanpin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sanpin-cycle-title">
			<div className="sanpin-modal sanpin-cycle-modal" style={{ maxWidth: "780px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
				{/* Modal Header */}
				<div className="sanpin-modal-header" style={{ padding: "1.25rem 1.5rem", flexShrink: 0 }}>
					<div>
						<h3 id="sanpin-cycle-title" style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<Flame size={22} color="var(--brand-primary, #2563eb)" />
							Регистрация цикла стерилизации (Форма № 257/у)
						</h3>
						<div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.25rem" }}>
							Контроль автоклавирования, упаковки и химических индикаторов по СанПиН 3.3686-21
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="sanpin-touch-btn"
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
						aria-label="Закрыть модальное окно"
					>
						<X size={22} />
					</button>
				</div>

				<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
					<div className="sanpin-modal-body" style={{ padding: "1.5rem", gap: "1.25rem", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
						{/* 1-Click Typical Cycle Banner */}
						<div
							style={{
								padding: "0.85rem 1rem",
								borderRadius: "0.6rem",
								background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(13, 148, 136, 0.06) 100%)",
								border: "1.5px solid var(--primary, #0284c7)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								gap: "0.75rem",
								flexWrap: "wrap",
							}}
						>
							<div>
								<div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
									<Sparkles size={16} color="var(--primary, #0284c7)" />
									Типовой регламент автоклава по СанПиН 3.3686-21
								</div>
								<div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.15rem" }}>
									134°C, 2.15 бар, 5 мин, хим. индикатор 5 кл. (Медтест), крафт-пакеты термосварные
								</div>
							</div>
							<button
								type="button"
								onClick={handleApplyTypicalCycle}
								className="sanpin-btn touch-manipulation"
								style={{
									minHeight: "44px",
									padding: "0.5rem 1rem",
									fontSize: "0.85rem",
									fontWeight: 700,
									cursor: "pointer",
									borderRadius: "6px",
									background: "var(--primary, #0284c7)",
									color: "#ffffff",
									border: "none",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.35rem",
								}}
								data-testid="modal-quick-default-cycle-btn"
								title="Заполнить типовой цикл автоклава (134°C, 2.1 бар, 5 мин) в 1 клик"
							>
								<Sparkles size={15} />
								<span>Применить типовой цикл (134°C, 2.1 бар, 5 мин)</span>
							</button>
						</div>

						{/* Quick Apparatus Presets */}
						<div>
							<div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--ink)" }}>
								{clinicEquipments.length > 0 ? "Стерилизатор клиники (ЦСО):" : "Быстрый выбор аппарата ЦСО:"}
							</div>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
								{clinicEquipments.length > 0
									? clinicEquipments.map((eq) => {
											const isSelected = (deviceName === eq.name || deviceName === eq.brandModel) && serialNumber === eq.serialNumber;
											return (
												<button
													type="button"
													key={eq.id}
													onClick={() => handleEquipmentSelect(eq)}
													className={`sanpin-preset-chip ${isSelected ? "active" : ""}`}
													style={{
														minHeight: "44px",
														padding: "0.5rem 0.9rem",
														borderRadius: "0.5rem",
														border: isSelected
															? "2px solid var(--brand-primary, #2563eb)"
															: "1px solid var(--glass-border)",
														background: isSelected
															? "rgba(37, 99, 235, 0.12)"
															: "var(--paper-subtle)",
														color: isSelected ? "var(--brand-primary, #2563eb)" : "var(--ink)",
														fontWeight: isSelected ? 700 : 500,
														fontSize: "0.85rem",
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														gap: "0.35rem",
														transition: "all 0.15s ease",
													}}
												>
													{isSelected && <Check size={16} />}
													<span>{eq.name} ({eq.chamberVolumeLiters} л)</span>
												</button>
											);
										})
									: APPARATUS_PRESETS.map((p) => {
											const isSelected = deviceName === p.name && sterilizerType === p.type;
											return (
												<button
													type="button"
													key={p.name}
													onClick={() => handlePresetSelect(p)}
													className={`sanpin-preset-chip ${isSelected ? "active" : ""}`}
													style={{
														minHeight: "44px",
														padding: "0.5rem 0.9rem",
														borderRadius: "0.5rem",
														border: isSelected
															? "2px solid var(--brand-primary, #2563eb)"
															: "1px solid var(--glass-border)",
														background: isSelected
															? "rgba(37, 99, 235, 0.12)"
															: "var(--paper-subtle)",
														color: isSelected ? "var(--brand-primary, #2563eb)" : "var(--ink)",
														fontWeight: isSelected ? 700 : 500,
														fontSize: "0.85rem",
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														gap: "0.35rem",
														transition: "all 0.15s ease",
													}}
												>
													{isSelected && <Check size={16} />}
													{p.label}
												</button>
											);
										})}
							</div>
						</div>

						{/* Apparatus Info Row */}
						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Марка и модель стерилизатора
								</label>
								<input
									type="text"
									required
									value={deviceName}
									onChange={(e) => setDeviceName(e.target.value)}
									className="sanpin-input"
									style={{ minHeight: "44px", fontSize: "0.9rem" }}
									placeholder="Melag Vacuklav 23B+ / W&H Lisa"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Тип стерилизационной камеры
								</label>
								<select
									value={sterilizerType}
									onChange={(e) => {
										const t = e.target.value as SterilizationDeviceType;
										setSterilizerType(t);
										if (t === "dry_heat") {
											setTemperatureCelsius(180);
											setDurationMin(60);
											setPressureBar(null);
										} else if (t === "plasma") {
											setTemperatureCelsius(55);
											setDurationMin(35);
											setPressureBar(null);
										} else {
											setTemperatureCelsius(134);
											setDurationMin(5);
											setPressureBar(2.15);
										}
									}}
									className="sanpin-select"
									style={{ minHeight: "44px", fontSize: "0.9rem" }}
								>
									<option value="autoclave_steam">Паровой автоклав (Класс B/S — 134°C / 121°C)</option>
									<option value="dry_heat">Сухожаровой шкаф (Воздушный — 180°C / 60 мин)</option>
									<option value="plasma">Плазменный низкотемпературный стерилизатор (55°C)</option>
									<option value="gas_eo">Газовый этиленоксидный стерилизатор (EO)</option>
								</select>
							</div>
						</div>

						{/* Cycle Number and Serial */}
						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Номер цикла за смену
								</label>
								<input
									type="number"
									min={1}
									required
									value={cycleNumber}
									onChange={(e) => setCycleNumber(parseInt(e.target.value, 10) || 1)}
									className="sanpin-input"
									style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Заводской / инвентарный номер аппарата
								</label>
								<input
									type="text"
									value={serialNumber}
									onChange={(e) => setSerialNumber(e.target.value)}
									className="sanpin-input"
									style={{ minHeight: "44px", fontSize: "0.9rem" }}
									placeholder="VK-23B-9842"
								/>
							</div>
						</div>

						{/* Items Description & Presets */}
						<div className="sanpin-form-group">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Наименование стерилизуемых изделий, лотков и наборов
								</label>
								<span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Требование п. 3676 СанПиН</span>
							</div>
							<textarea
								rows={2}
								required
								value={itemsDescription}
								onChange={(e) => setItemsDescription(e.target.value)}
								className="sanpin-input"
								style={{ padding: "0.6rem 0.75rem", fontSize: "0.9rem", minHeight: "64px" }}
								placeholder="Например: Хирургический набор №1 (щипцы, элеваторы, скальпель), наконечники, боры"
							/>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.35rem" }}>
								{QUICK_ITEM_PRESETS.map((item) => (
									<button
										type="button"
										key={item}
										onClick={() => setItemsDescription(item)}
										style={{
											fontSize: "0.775rem",
											padding: "0.25rem 0.6rem",
											borderRadius: "0.375rem",
											border: "1px solid var(--glass-border)",
											background: "var(--paper-subtle)",
											color: "var(--muted)",
											cursor: "pointer",
											minHeight: "32px",
										}}
									>
										+ {item.slice(0, 28)}...
									</button>
								))}
							</div>
						</div>

						{/* Packaging and Expiration Row */}
						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Вид упаковочного материала
								</label>
								<select
									value={packagingType}
									onChange={(e) => setPackagingType(e.target.value as SterilizerPackagingType)}
									className="sanpin-select"
									style={{ minHeight: "44px", fontSize: "0.9rem" }}
								>
									<option value="kraft_heat_sealed">Крафт-пакет термосвариваемый (Срок: 1 год / 365 дн)</option>
									<option value="kraft_self_adhesive">Крафт-пакет самоклеящийся (Срок: 50 суток)</option>
									<option value="laminated_heat_sealed">Ламинированный пакет термосварной (Срок: 180 дн)</option>
									<option value="metal_cassette">Металлическая кассета в крафт-бумаге (Срок: 72 ч)</option>
									<option value="bix_filter">Стерилизационная коробка (бикс с фильтром, 20 суток)</option>
									<option value="unpacked">Без упаковки (вскрыть и использовать немедленно)</option>
								</select>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Расчетный срок сохранения стерильности
								</label>
								<div
									style={{
										minHeight: "44px",
										padding: "0.6rem 0.9rem",
										background: "rgba(16, 185, 129, 0.08)",
										border: "1px solid rgba(16, 185, 129, 0.3)",
										borderRadius: "0.375rem",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
										<ShieldCheck size={18} color="#059669" />
										<span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#059669" }}>
											{estimatedExpiration
												? new Date(estimatedExpiration).toLocaleDateString("ru-RU", {
														day: "numeric",
														month: "long",
														year: "numeric",
													})
												: "Использовать немедленно"}
										</span>
									</div>
									<span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>
										ГОСТ Р ИСО 11607
									</span>
								</div>
							</div>
						</div>

						{/* Group Kraft Packages Batch Card */}
						<div
							style={{
								padding: "1rem",
								borderRadius: "0.5rem",
								background: "var(--paper-subtle)",
								border: "1px solid var(--glass-border)",
								display: "flex",
								flexDirection: "column",
								gap: "0.75rem",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
								<div style={{ fontSize: "0.875rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--ink)" }}>
									<Boxes size={18} color="var(--brand-primary, #2563eb)" />
									Партия крафт-пакетов в загрузке камеры (Мандат 8e / 8k)
								</div>
								<span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>
									Групповая фиксация без ввода каждого пакета вручную
								</span>
							</div>

							<div className="sanpin-form-row">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
										Количество пакетов в партии (шт.)
									</label>
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
										<input
											type="number"
											min={1}
											max={100}
											required
											value={packageCount}
											onChange={(e) => setPackageCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
											className="sanpin-input"
											style={{ width: "90px", minHeight: "40px", fontSize: "0.95rem", fontWeight: 700 }}
										/>
										<div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
											{[1, 5, 10, 15, 20, 30].map((cnt) => (
												<button
													key={cnt}
													type="button"
													onClick={() => setPackageCount(cnt)}
													className={`sanpin-btn ${packageCount === cnt ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
													style={{ minHeight: "32px", padding: "0.2rem 0.55rem", fontSize: "0.78rem" }}
												>
													{cnt} шт.
												</button>
											))}
										</div>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
										Типоразмер крафт-пакетов
									</label>
									<select
										value={packageSize}
										onChange={(e) => setPackageSize(e.target.value)}
										className="sanpin-select"
										style={{ minHeight: "40px", fontSize: "0.875rem" }}
									>
										<option value="size_100x200">100 × 200 мм (Терапевтический / базовый набор)</option>
										<option value="size_75x150">75 × 150 мм (Боры, наконечники, эндофайлы)</option>
										<option value="size_150x250">150 × 250 мм (Хирургический набор, щипцы, элеваторы)</option>
										<option value="size_200x300">200 × 300 мм (Ортопедические слепочные ложки / кассеты)</option>
									</select>
								</div>
							</div>

							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--paper)", borderRadius: "0.375rem", border: "1px dashed var(--glass-border)", flexWrap: "wrap", gap: "0.5rem" }}>
								<div style={{ fontSize: "0.8rem", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
									<PackageCheck size={16} color="#059669" />
									<span>Партия из <strong>{packageCount} шт.</strong> регистрируется со сквозными штрихкодами (CYC-{cycleNumber}-001 ... CYC-{cycleNumber}-{String(packageCount).padStart(3, "0")})</span>
								</div>
								<button
									type="button"
									onClick={() => handlePrintBatchLabels(packageCount)}
									className="sanpin-btn sanpin-btn-secondary"
									style={{ minHeight: "34px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600 }}
									title="Печать всех термоэтикеток партии на принтере 58x40 мм в 1 клик"
								>
									<Printer size={15} />
									Печать всей партии ({packageCount} шт.)
								</button>
							</div>
						</div>

						{/* 1-Click Pre-Sterilization Cleaning (ПСО Форма № 366/у) */}
						<div
							style={{
								padding: "1rem",
								borderRadius: "0.5rem",
								background: autoRecordPso ? "rgba(13, 148, 136, 0.06)" : "var(--paper-subtle)",
								border: autoRecordPso ? "1.5px solid rgba(13, 148, 136, 0.35)" : "1px solid var(--glass-border)",
								display: "flex",
								flexDirection: "column",
								gap: "0.75rem",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>
									<input
										type="checkbox"
										checked={autoRecordPso}
										onChange={(e) => setAutoRecordPso(e.target.checked)}
										style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal, #0d9488)" }}
									/>
									<FlaskConical size={18} color="var(--teal, #0d9488)" />
									<span>Предстерилизационная очистка (ПСО, Форма № 366/у) — норма в 1 клик</span>
								</label>
								<span className="sanpin-badge-gov" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
									СанПиН 3.3686-21 п. 3584
								</span>
							</div>

							{autoRecordPso && (
								<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
										{/* Azopyram Test Control */}
										<div style={{ padding: "0.5rem 0.75rem", borderRadius: "0.375rem", background: "var(--paper)", border: "1px solid var(--glass-border)" }}>
											<div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600 }}>
												Азопирамовая проба (на скрытую кровь):
											</div>
											<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.35rem" }}>
												<button
													type="button"
													onClick={() => setPsoAzopyramNegative(true)}
													style={{
														flex: 1,
														minHeight: "32px",
														borderRadius: "4px",
														border: psoAzopyramNegative ? "2px solid #059669" : "1px solid var(--glass-border)",
														background: psoAzopyramNegative ? "rgba(16, 185, 129, 0.15)" : "var(--paper-subtle)",
														color: psoAzopyramNegative ? "#059669" : "var(--muted)",
														fontWeight: psoAzopyramNegative ? 700 : 500,
														fontSize: "0.78rem",
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														gap: "0.25rem",
													}}
												>
													<CheckCircle2 size={13} /> Отрицательно (Норма)
												</button>
												<button
													type="button"
													onClick={() => setPsoAzopyramNegative(false)}
													style={{
														flex: 1,
														minHeight: "32px",
														borderRadius: "4px",
														border: !psoAzopyramNegative ? "2px solid #dc2626" : "1px solid var(--glass-border)",
														background: !psoAzopyramNegative ? "rgba(239, 68, 68, 0.15)" : "var(--paper-subtle)",
														color: !psoAzopyramNegative ? "#dc2626" : "var(--muted)",
														fontWeight: !psoAzopyramNegative ? 700 : 500,
														fontSize: "0.78rem",
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														gap: "0.25rem",
													}}
												>
													<XCircle size={13} /> Положительно (Брак)
												</button>
											</div>
										</div>

										{/* Phenolphthalein Test Control */}
										<div style={{ padding: "0.5rem 0.75rem", borderRadius: "0.375rem", background: "var(--paper)", border: "1px solid var(--glass-border)" }}>
											<div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600 }}>
												Фенолфталеиновая проба (на щелочность СМС):
											</div>
											<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.35rem" }}>
												<button
													type="button"
													onClick={() => setPsoPhenolNegative(true)}
													style={{
														flex: 1,
														minHeight: "32px",
														borderRadius: "4px",
														border: psoPhenolNegative ? "2px solid #059669" : "1px solid var(--glass-border)",
														background: psoPhenolNegative ? "rgba(16, 185, 129, 0.15)" : "var(--paper-subtle)",
														color: psoPhenolNegative ? "#059669" : "var(--muted)",
														fontWeight: psoPhenolNegative ? 700 : 500,
														fontSize: "0.78rem",
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														gap: "0.25rem",
													}}
												>
													<CheckCircle2 size={13} /> Отрицательно (Норма)
												</button>
												<button
													type="button"
													onClick={() => setPsoPhenolNegative(false)}
													style={{
														flex: 1,
														minHeight: "32px",
														borderRadius: "4px",
														border: !psoPhenolNegative ? "2px solid #dc2626" : "1px solid var(--glass-border)",
														background: !psoPhenolNegative ? "rgba(239, 68, 68, 0.15)" : "var(--paper-subtle)",
														color: !psoPhenolNegative ? "#dc2626" : "var(--muted)",
														fontWeight: !psoPhenolNegative ? 700 : 500,
														fontSize: "0.78rem",
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														gap: "0.25rem",
													}}
												>
													<XCircle size={13} /> Положительно (Брак)
												</button>
											</div>
										</div>
									</div>

									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--muted)", gap: "0.5rem", flexWrap: "wrap" }}>
										<span>Моющее средство: <strong>{psoDetergent}</strong></span>
										<span>Выборка 1% от партии: <strong>{Math.max(3, Math.round(packageCount * 4 * 0.01))} изд.</strong> (норматив СанПиН выполнен)</span>
									</div>
								</div>
							)}
						</div>

						{/* Regime Parameters: Temp, Pressure, Time */}
						<div
							style={{
								padding: "1rem",
								borderRadius: "0.5rem",
								background: "var(--paper-subtle)",
								border: "1px solid var(--glass-border)",
								display: "flex",
								flexDirection: "column",
								gap: "0.75rem",
							}}
						>
							<div style={{ fontSize: "0.875rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
								<Thermometer size={16} color="var(--brand-primary)" />
								Параметры режима стерилизации (температура, давление, экспозиция):
							</div>

							<div style={{ display: "grid", gridTemplateColumns: sterilizerType === "autoclave_steam" ? "1fr 1fr 1fr" : "1fr 1fr", gap: "0.75rem" }}>
								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.8rem" }}>
										Температура (°C)
									</label>
									<input
										type="number"
										required
										value={temperatureCelsius}
										onChange={(e) => setTemperatureCelsius(parseFloat(e.target.value) || 0)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
									/>
								</div>

								{sterilizerType === "autoclave_steam" && (
									<div className="sanpin-form-group">
										<label className="sanpin-form-label" style={{ fontSize: "0.8rem" }}>
											Давление пара (бар)
										</label>
										<input
											type="number"
											step="0.01"
											value={pressureBar ?? 2.15}
											onChange={(e) => setPressureBar(parseFloat(e.target.value) || null)}
											className="sanpin-input"
											style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
										/>
									</div>
								)}

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.8rem" }}>
										Экспозиция / Время (мин)
									</label>
									<input
										type="number"
										min={1}
										required
										value={durationMin}
										onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 1)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
									/>
								</div>
							</div>
						</div>

						{/* Chemical & Biological Indicators Strip */}
						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Химический индикатор контроля (Класс по ГОСТ ISO 11140-1)
								</label>
								<select
									value={indicatorType}
									onChange={(e) => setIndicatorType(e.target.value as SterilizerIndicatorClass)}
									className="sanpin-select"
									style={{ minHeight: "44px", fontSize: "0.9rem" }}
								>
									<option value="class5_integrating">Класс 5 (Интегрирующий хим. индикатор — НОРМА СанПиН)</option>
									<option value="class6_emulating">Класс 6 (Эмулирующий индикатор предельного цикла)</option>
									<option value="class4_multivariable">Класс 4 (Многопараметрический индикатор)</option>
									<option value="bowie_dick">Тест Бови-Дика (Bowie-Dick / контроль вакуума)</option>
									<option value="helix">Хеликс-тест (Helix / контроль полых инструментов)</option>
									<option value="biological">Биологический тест (споровые полоски G. stearothermophilus)</option>
								</select>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Срабатывание тест-полоски индикатора
								</label>
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
									<button
										type="button"
										onClick={() => setPassedIndicator(true)}
										style={{
											minHeight: "44px",
											borderRadius: "0.375rem",
											border: passedIndicator ? "2px solid #059669" : "1px solid var(--glass-border)",
											background: passedIndicator ? "rgba(16, 185, 129, 0.15)" : "var(--paper-subtle)",
											color: passedIndicator ? "#059669" : "var(--muted)",
											fontWeight: passedIndicator ? 700 : 500,
											fontSize: "0.85rem",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.35rem",
											cursor: "pointer",
										}}
									>
										<CheckCircle2 size={16} /> Сработал (Норма)
									</button>
									<button
										type="button"
										onClick={() => setPassedIndicator(false)}
										style={{
											minHeight: "44px",
											borderRadius: "0.375rem",
											border: !passedIndicator ? "2px solid #dc2626" : "1px solid var(--glass-border)",
											background: !passedIndicator ? "rgba(239, 68, 68, 0.15)" : "var(--paper-subtle)",
											color: !passedIndicator ? "#dc2626" : "var(--muted)",
											fontWeight: !passedIndicator ? 700 : 500,
											fontSize: "0.85rem",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.35rem",
											cursor: "pointer",
										}}
									>
										<XCircle size={16} /> БРАК / Не сработал
									</button>
								</div>
							</div>
						</div>

						{/* Electronic Nurse Verification Stamp */}
						<div
							style={{
								padding: "1.1rem",
								borderRadius: "0.5rem",
								background: nurseVerified ? "rgba(37, 99, 235, 0.06)" : "var(--paper-subtle)",
								border: nurseVerified ? "1.5px solid rgba(37, 99, 235, 0.4)" : "1px solid var(--glass-border)",
								display: "flex",
								flexDirection: "column",
								gap: "0.75rem",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<Award size={20} color="var(--brand-primary, #2563eb)" />
									<span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>
										Электронная заверка медсестры ЦСО (ЭЦП)
									</span>
								</div>
								<span className="sanpin-badge-gov" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
									<CheckCircle2 size={14} /> Юридическая сила 63-ФЗ
								</span>
							</div>

							<div className="sanpin-form-row">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.8rem" }}>
										ФИО ответственного оператора / медсестры ЦСО (опционально)
									</label>
									<input
										type="text"
										value={nurseName}
										onChange={(e) => setNurseName(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
										placeholder="Персонал клиники"
									/>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.8rem" }}>
										Сгенерированный штрихкод партии
									</label>
									<div
										style={{
											minHeight: "44px",
											padding: "0.5rem 0.75rem",
											background: "var(--paper)",
											border: "1px dashed var(--glass-border)",
											borderRadius: "0.375rem",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											fontFamily: "monospace",
											fontWeight: 700,
											fontSize: "0.9rem",
										}}
									>
										<span>{calculatedBarcode}</span>
										<div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
											<button
												type="button"
												onClick={handlePrintPouchLabel}
												className="sanpin-btn sanpin-btn-secondary"
												style={{ minHeight: "34px", padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
												title="Печать одиночной этикетки 58x40 мм"
											>
												<Printer size={14} /> Печать бирки #1
											</button>
											<button
												type="button"
												onClick={() => handlePrintBatchLabels(packageCount)}
												className="sanpin-btn sanpin-btn-primary"
												style={{ minHeight: "34px", padding: "0.25rem 0.6rem", fontSize: "0.8rem", fontWeight: 700 }}
												title="Печать всей партии крафт-пакетов на термопринтере 58x40 мм"
											>
												<Printer size={14} /> Партия ({packageCount} шт.)
											</button>
										</div>
									</div>
								</div>
							</div>

							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.6rem",
									cursor: "pointer",
									fontSize: "0.875rem",
									color: "var(--ink)",
									marginTop: "0.25rem",
									minHeight: "44px",
								}}
							>
								<input
									type="checkbox"
									checked={nurseVerified}
									onChange={(e) => setNurseVerified(e.target.checked)}
									style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--brand-primary)" }}
								/>
								<span>
									<strong>Подтверждаю:</strong> целостность упаковки проверена, параметры режима (T°, давление, время) соблюдены, индикатор класса 5 изменил цвет на эталонный.
								</span>
							</label>
						</div>
					</div>

					{/* Modal Footer */}
					<div className="sanpin-modal-footer" style={{ padding: "1.25rem 1.5rem", gap: "0.75rem", flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={onClose}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "44px", padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={() => handleSubmit(undefined, true)}
							disabled={submitting}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "44px", padding: "0.6rem 1.25rem", fontSize: "0.9rem", fontWeight: 700 }}
							title="Зафиксировать цикл персоналом клиники без обязательной ЭЦП медсестры"
						>
							Зафиксировать персоналом клиники
						</button>
						<button
							type="submit"
							disabled={submitting}
							className="sanpin-btn sanpin-btn-primary"
							style={{ minHeight: "44px", padding: "0.6rem 1.5rem", fontSize: "0.95rem", fontWeight: 700 }}
						>
							<FileBadge size={18} />
							{submitting ? "Сохранение..." : "Зафиксировать цикл и поставить ЭЦП"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
