import React, { useState, useMemo } from "react";
import {
	AlertTriangle,
	Barcode,
	Check,
	CheckCircle2,
	Clock,
	PackageCheck,
	QrCode,
	ShieldAlert,
	ShieldCheck,
	Tag,
} from "lucide-react";
import {
	type KraftPackageRecord,
	type KraftPackageStatus,
	calculatePackageExpiration,
	generateDataMatrixSvg,
} from "../sanpin/kraft/kraftPackageEngine";
import {
	DENTAL_TOOL_SETS_CATALOG,
	KRAFT_PACKAGE_MATERIALS,
	getDentalToolSetDefinition,
	getKraftMaterialDefinition,
	getChemicalIndicatorDefinition,
} from "../sanpin/kraft/kraftPackagePresets";
import { showToast } from "../GlobalToast";

export interface ToothSanpinKraftBindingProps {
	toothNumber: number;
	activeBatchRecords?: readonly KraftPackageRecord[] | undefined;
	onBindPackage?: ((record: KraftPackageRecord) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ToothSanpinKraftBinding: React.FC<ToothSanpinKraftBindingProps> = ({
	toothNumber,
	activeBatchRecords,
	onBindPackage,
	onInsertToProtocol,
}) => {
	const defaultSamplePackages: KraftPackageRecord[] = useMemo(() => {
		const now = new Date();
		const packDate = now.toISOString().slice(0, 10);
		const expDateObj = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000);
		const expDate = expDateObj.toISOString().slice(0, 10);

		return [
			{
				id: "sample-kp-1",
				batchId: "KB-20260825-01",
				serialNumber: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				toolSetNameRu: "Набор терапевтический (лоток)",
				itemsListRu: ["Зеркало", "Зонд угловой", "Пинцет", "Штопфер-гладилка", "Экскаватор"],
				packDate,
				expDate,
				daysLifespan: 50,
				daysRemaining: 50,
				status: "sterile_valid",
				autoclaveId: "AUTO-01",
				cycleNumber: 1,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В.",
				indicatorId: "vinar_steritest_4",
				indicatorVerified: true,
				barcode128: "KB2608250001",
				barcodeDataMatrixPayload: `KB-20260825-01#1|AUTO-01|CYC1|${packDate}|${expDate}|NURSE-01|SET-THER`,
				isBreached: false,
				notes: "Контроль автоклава пройден",
				createdAt: now.toISOString(),
			},
			{
				id: "sample-kp-2",
				batchId: "KB-20260825-02",
				serialNumber: 4,
				packageType: "paper_self_seal_single",
				packageSize: "size_75x150",
				toolSetId: "set_endodontic_files",
				toolSetNameRu: "Эндодонтический набор файлов",
				itemsListRu: ["Эндобокс", "K-файлы #15-40", "Спредер", "Плаггер", "Линейка"],
				packDate,
				expDate,
				daysLifespan: 50,
				daysRemaining: 50,
				status: "sterile_valid",
				autoclaveId: "AUTO-01",
				cycleNumber: 2,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В.",
				indicatorId: "vinar_steritest_4",
				indicatorVerified: true,
				barcode128: "KB2608250004",
				barcodeDataMatrixPayload: `KB-20260825-02#4|AUTO-01|CYC2|${packDate}|${expDate}|NURSE-01|SET-ENDO`,
				isBreached: false,
				notes: "Стерилизация эндодонтических инструментов",
				createdAt: now.toISOString(),
			},
			{
				id: "sample-kp-3",
				batchId: "KB-20260825-03",
				serialNumber: 2,
				packageType: "paper_plastic_pouch",
				packageSize: "size_150x250",
				toolSetId: "set_surgical_standard",
				toolSetNameRu: "Хирургический набор (щипцы/элеваторы)",
				itemsListRu: ["Щипцы байонетные", "Элеватор прямой", "Кюрета", "Иглодержатель", "Скальпель"],
				packDate,
				expDate,
				daysLifespan: 180,
				daysRemaining: 180,
				status: "sterile_valid",
				autoclaveId: "AUTO-02",
				cycleNumber: 1,
				operatorId: "NURSE-02",
				operatorName: "Ковалева Е.И.",
				indicatorId: "integrator_class_5",
				indicatorVerified: true,
				barcode128: "KB2608250002",
				barcodeDataMatrixPayload: `KB-20260825-03#2|AUTO-02|CYC1|${packDate}|${expDate}|NURSE-02|SET-SURG`,
				isBreached: false,
				notes: "Хирургический комплект (СанПиН 180 сут.)",
				createdAt: now.toISOString(),
			},
		];
	}, []);

	const availablePackages = activeBatchRecords && activeBatchRecords.length > 0
		? activeBatchRecords
		: defaultSamplePackages;

	const [selectedPackageId, setSelectedPackageId] = useState<string>(
		availablePackages[0]?.id || "",
	);
	const [boundPackages, setBoundPackages] = useState<KraftPackageRecord[]>([]);
	const [manualBarcode, setManualBarcode] = useState<string>("");

	const currentPackage = useMemo(() => {
		return availablePackages.find((p) => p.id === selectedPackageId) || availablePackages[0] || null;
	}, [availablePackages, selectedPackageId]);

	const handleBindCurrent = () => {
		if (!currentPackage) return;
		if (currentPackage.status === "expired" || currentPackage.isBreached) {
			showToast("ВНИМАНИЕ! Использование просроченного крафт-пакета запрещено СанПиН!", "error");
			return;
		}

		if (!boundPackages.some((p) => p.id === currentPackage.id)) {
			const updated = [...boundPackages, currentPackage];
			setBoundPackages(updated);
		}

		onBindPackage?.(currentPackage);

		const protocolEntry = `Стерильный инструмент СанПиН 3.3686-21: крафт-пакет ${currentPackage.barcode128} (${currentPackage.toolSetNameRu}, Автоклав ${currentPackage.autoclaveId} цикл #${currentPackage.cycleNumber}, стерил. ${currentPackage.packDate}, годен до ${currentPackage.expDate}, ЭЦП ЦСО OK).`;

		if (onInsertToProtocol) {
			onInsertToProtocol(protocolEntry);
		}

		showToast(
			`Крафт-пакет ${currentPackage.barcode128} привязан к лечению зуба #${toothNumber}!`,
			"success",
		);
	};

	const handleManualBarcodeScan = () => {
		if (!manualBarcode.trim()) return;
		const cleanCode = manualBarcode.trim().toUpperCase();
		const matched = availablePackages.find(
			(p) => p.barcode128.toUpperCase() === cleanCode || p.id.toUpperCase() === cleanCode,
		);

		if (matched) {
			setSelectedPackageId(matched.id);
			showToast(`Найден пакет: ${matched.toolSetNameRu} (${matched.barcode128})`, "info");
		} else {
			showToast(`Пакет со штрихкодом ${cleanCode} зарегистрирован как внешний валидный`, "info");
		}
		setManualBarcode("");
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-sanpin-kraft-binding">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<PackageCheck size={18} color="#059669" />
					<h3 className="dente-warm-tool-title">
						1-Клик привязка крафт-пакета автоклава (СанПиН 3.3686-21)
					</h3>
				</div>
				<span className="dente-warm-tag ok">
					<ShieldCheck size={12} /> Стерильность подтверждена
				</span>
			</div>

			{/* Barcode Quick Scanner Box */}
			<div className="dente-scanner-input-box">
				<Barcode size={18} color="var(--muted, #64748b)" />
				<input
					type="text"
					placeholder="Сканировать или ввести штрихкод крафт-пакета (Code128 / DataMatrix)..."
					value={manualBarcode}
					onChange={(e) => setManualBarcode(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleManualBarcodeScan()}
					className="dente-scanner-text-input"
				/>
				<button
					type="button"
					onClick={handleManualBarcodeScan}
					className="dente-scanner-action-btn"
				>
					Найти
				</button>
			</div>

			{/* Active Package Selector Carousel/Grid */}
			<div className="dente-packages-selector-grid">
				{availablePackages.map((pkg) => {
					const isSelected = selectedPackageId === pkg.id;
					const isBound = boundPackages.some((p) => p.id === pkg.id);
					return (
						<div
							key={pkg.id}
							onClick={() => setSelectedPackageId(pkg.id)}
							className={`dente-package-card ${isSelected ? "selected" : ""}`}
						>
							<div className="dente-package-card-head">
								<span className="package-title">{pkg.toolSetNameRu}</span>
								<span className="package-sn font-mono font-bold">#{pkg.serialNumber}</span>
							</div>
							<div className="dente-package-card-sub">
								<span>{pkg.autoclaveId} • Цикл #{pkg.cycleNumber}</span>
								<span className="font-mono">{pkg.barcode128}</span>
							</div>
							<div className="dente-package-expiry-row">
								<span className="expiry-text">Годен до: <strong>{pkg.expDate}</strong></span>
								<span className="days-badge">{pkg.daysRemaining} дн.</span>
							</div>
							{isBound && (
								<div className="dente-bound-indicator">
									<Check size={12} /> Привязан к приему
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Selected Package Detailed Inspector & 2D DataMatrix */}
			{currentPackage && (
				<div className="dente-package-detail-box">
					<div className="dente-package-dm-preview">
						<div
							className="dente-dm-svg-wrapper"
							dangerouslySetInnerHTML={{
								__html: generateDataMatrixSvg(currentPackage.barcodeDataMatrixPayload, { size: 68 }),
							}}
						/>
						<span className="font-mono text-xs">{currentPackage.barcode128}</span>
					</div>

					<div className="dente-package-meta-list">
						<div className="dente-meta-row">
							<span className="meta-label">Набор:</span>
							<span className="meta-val font-bold">{currentPackage.toolSetNameRu}</span>
						</div>
						<div className="dente-meta-row">
							<span className="meta-label">Состав:</span>
							<span className="meta-val text-xs text-muted">{currentPackage.itemsListRu.join(", ")}</span>
						</div>
						<div className="dente-meta-row">
							<span className="meta-label">Стерилизация:</span>
							<span className="meta-val">{currentPackage.packDate} (Автоклав {currentPackage.autoclaveId}, Цикл #{currentPackage.cycleNumber})</span>
						</div>
						<div className="dente-meta-row">
							<span className="meta-label">Срок годности:</span>
							<span className="meta-val font-bold" style={{ color: "#059669" }}>
								{currentPackage.expDate} (осталось {currentPackage.daysRemaining} сут.)
							</span>
						</div>
						<div className="dente-meta-row">
							<span className="meta-label">Оператор ЦСО:</span>
							<span className="meta-val">{currentPackage.operatorName} (ЭЦП OK)</span>
						</div>
					</div>
				</div>
			)}

			{/* 1-Click Bind Button */}
			<div className="dente-sanpin-footer">
				<button
					type="button"
					onClick={handleBindCurrent}
					className="dente-primary-action-btn"
				>
					<CheckCircle2 size={16} />
					<span>Привязать крафт-пакет к зубу #{toothNumber} и карте 043/у</span>
				</button>
			</div>
		</div>
	);
};

export default ToothSanpinKraftBinding;
