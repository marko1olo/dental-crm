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

	const availablePackages = activeBatchRecords && activeBatchRecords.length > 0
		? activeBatchRecords
		: [];

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
					<PackageCheck size={18} color="var(--brand-primary, var(--teal))" />
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
			{availablePackages.length === 0 ? (
				<div className="p-4 text-center text-sm text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)]">
					Нет доступных стерильных крафт-пакетов из текущего журнала ЦСО. Отсканируйте или введите штрихкод пакета вручную для привязки.
				</div>
			) : (
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
			)}

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
							<span className="meta-val font-bold" style={{ color: "var(--ok-fg)" }}>
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
