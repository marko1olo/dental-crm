/**
 * ImplantProtocolTab.tsx — Хирургический протокол имплантации (DENTE CRM).
 * 1-клик физиологическая норма, тактильные кнопки торка, упаковка и склад (Мандаты 8e, 8n, 8am).
 */

import React from "react";
import { CheckCircle2, Gauge, Package, Sparkles, Zap } from "lucide-react";
import { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS } from "./implantConstants";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	STANDARD_DIAMETERS,
	STANDARD_LENGTHS,
	MISCH_DENSITY_NOTES,
	type MischDensity,
	type ImplantCapType,
	type ImplantWarehouseStockItem,
	type ImplantConsumablesStock,
	DEFAULT_CANONICAL_CONSUMABLES,
} from "./implantQuickPresets";
import { ImplantConsumablesSelector } from "./ImplantConsumablesSelector";
import { ImplantWarehouseSelector } from "./ImplantWarehouseSelector";
import { ImplantEconomicsSection } from "./ImplantEconomicsSection";

export interface ImplantProtocolTabProps {
	readonly toothFdi: number;
	readonly handleToothSelect: (fdi: number) => void;
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly scannedBarcode?: string | undefined;
	readonly setScannedBarcode?: ((b: string) => void) | undefined;
	readonly handleApplyBarcode?: ((custom?: string) => void) | undefined;
	readonly isGbrPerformed: boolean;
	readonly setIsGbrPerformed: (g: boolean) => void;
	readonly capType: ImplantCapType;
	readonly setCapType: (c: ImplantCapType) => void;
	readonly selectedBrand: string;
	readonly handleBrandSelect: (brand: string) => void;
	readonly diameterMm: number;
	readonly setDiameterMm: (dia: number) => void;
	readonly lengthMm: number;
	readonly setLengthMm: (len: number) => void;
	readonly torqueNcm: number;
	readonly setTorqueNcm: (t: number) => void;
	readonly isqValue?: number | undefined;
	readonly setIsqValue?: ((val: number) => void) | undefined;
	readonly lotNumber: string;
	readonly setLotNumber: (lot: string) => void;
	readonly catalogArticle: string;
	readonly setCatalogArticle: (art: string) => void;
	readonly serialNumber: string;
	readonly setSerialNumber: (sn: string) => void;
	readonly isOverdraftActive?: boolean | undefined;
	readonly stockItems?: readonly ImplantWarehouseStockItem[] | undefined;
	readonly selectedStockItemId?: string | undefined;
	readonly onSelectStockItem?: ((item: ImplantWarehouseStockItem) => void) | undefined;
	readonly stockConsumables?: ImplantConsumablesStock | undefined;
	readonly selectedGraftId?: string | undefined;
	readonly onSelectGraftId?: ((id: string) => void) | undefined;
	readonly selectedMembraneId?: string | undefined;
	readonly onSelectMembraneId?: ((id: string) => void) | undefined;
	readonly selectedSutureId?: string | undefined;
	readonly onSelectSutureId?: ((id: string) => void) | undefined;
	readonly operationPriceRub?: number | undefined;
	readonly setOperationPriceRub?: ((p: number) => void) | undefined;
	readonly implantCostRub?: number | undefined;
	readonly consumablesCostRub?: number | undefined;
	readonly doctorGrossMarginRub?: number | undefined;
	readonly expirationDate?: string | undefined;
	readonly setExpirationDate?: ((d: string) => void) | undefined;
	readonly onApplyStandardProtocol?: (() => void) | undefined;
	readonly onApplyImmediateProtocol?: (() => void) | undefined;
	readonly onApplyTwoStageProtocol?: (() => void) | undefined;
	readonly onApplyGbrProtocol?: (() => void) | undefined;
}

const TORQUE_PRESETS = [15, 25, 30, 35, 40, 45, 50] as const;

export const ImplantProtocolTab: React.FC<ImplantProtocolTabProps> = (props) => {
	const isOptimal = props.torqueNcm >= 35;
	const isImmediateLoadingFeasible = props.torqueNcm >= 35 && props.torqueNcm <= 50;

	const handleAutofillPackaging = () => {
		if (!props.catalogArticle) props.setCatalogArticle("TS3S4010S");
		if (!props.lotNumber) props.setLotNumber("24C1208");
		if (!props.serialNumber) props.setSerialNumber(`SN-${Date.now().toString().slice(-6)}`);
	};

	return (
		<div className="implant-protocol-tab space-y-4" data-testid="tab-content-protocol">
			{/* 1-кликовые экспресс-протоколы */}
			<div className="banner-standard-protocol-preset implant-presets-section p-3.5 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.08))] border border-[var(--teal-soft,rgba(13,148,136,0.3))] space-y-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2 min-w-0">
						<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div className="text-xs">
							<strong className="text-[var(--ink)] block text-sm">Хирургический экспресс-протокол:</strong>
							<span className="text-[var(--muted)]">1 клик: физиологическая норма (D2/D3, торк 35 Н·см, ФДМ, охлаждение 0.9% NaCl, шов Викрил 4-0)</span>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
					<button
						type="button"
						onClick={props.onApplyStandardProtocol}
						className="implant-preset-btn implant-preset-btn-standard w-full"
						data-testid="btn-apply-standard-protocol"
						title="Стандарт: торк 35 Н·см, формирователь десны ФДМ, шов Викрил 4-0"
					>
						<span className="font-bold text-[var(--teal,#0d9488)] block leading-snug">
							✓ Стандартный протокол
						</span>
						<span className="text-[11px] text-[var(--muted)] block leading-normal">35 Н·см · ФДМ · Викрил 4-0</span>
					</button>

					<button
						type="button"
						onClick={props.onApplyImmediateProtocol}
						className="implant-preset-btn w-full"
						data-testid="btn-apply-immediate-protocol"
						title="Одномоментная имплантация: лунка удаленного зуба, немедленная нагрузка (45 Н·см)"
					>
						<span className="font-bold text-[var(--ink)] block leading-snug">Немедленная нагрузка</span>
						<span className="text-[11px] text-[var(--muted)] block leading-normal">45 Н·см · Одномоментно</span>
					</button>

					<button
						type="button"
						onClick={props.onApplyTwoStageProtocol}
						className="implant-preset-btn w-full"
						data-testid="btn-apply-twostage-protocol"
						title="Двухэтапная классическая: винт-заглушка с ушиванием раны наглухо (35 Н·см)"
					>
						<span className="font-bold text-[var(--ink)] block leading-snug">Двухэтапная заглушка</span>
						<span className="text-[11px] text-[var(--muted)] block leading-normal">35 Н·см · Заглушка наглухо</span>
					</button>

					<button
						type="button"
						onClick={props.onApplyGbrProtocol}
						className="implant-preset-btn w-full"
						data-testid="btn-apply-gbr-protocol"
						title="Имплантация с НКР (GBR): Bio-Oss + Bio-Gide + швы"
					>
						<span className="font-bold text-[var(--amber,#f59e0b)] block leading-snug">Костная пластика (НКР)</span>
						<span className="text-[11px] text-[var(--muted)] block leading-normal">Bio-Oss + Bio-Gide + швы</span>
					</button>
				</div>
			</div>

			{/* Селектор зуба FDI и параметров имплантата */}
			<div className="protocol-implant-selector space-y-3.5" data-testid="protocol-implant-selector">
				<div className="implant-form-row">
					<label className="implant-label" htmlFor="select-tooth-fdi">Зуб по формуле FDI:</label>
					<div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
						<div className="flex items-center gap-1 flex-wrap">
							{FREQUENT_IMPLANT_SITES.map((fdi) => {
								const isSelected = props.toothFdi === fdi;
								return (
									<button
										key={fdi}
										type="button"
										onClick={() => props.handleToothSelect(fdi)}
										className={`secondary-button min-h-[40px] px-3 font-mono font-bold text-xs ${
											isSelected ? "active bg-[var(--teal,#0d9488)] text-white" : ""
										}`}
										data-testid={`btn-quick-tooth-${fdi} btn-frequent-tooth-${fdi}`}
									>
										#{fdi}
									</button>
								);
							})}
						</div>

						<select
							id="select-tooth-fdi"
							value={props.toothFdi}
							onChange={(e) => props.handleToothSelect(Number(e.target.value))}
							className="implant-select min-h-[40px] flex-1 min-w-[200px]"
							data-testid="select-tooth-fdi select-implant-tooth"
						>
							{PERMANENT_TEETH_OPTIONS.map((tooth) => (
								<option key={tooth.fdi} value={tooth.fdi}>
									{tooth.label}
								</option>
							))}
						</select>

						<input
							type="number"
							value={props.toothFdi}
							onChange={(e) => props.handleToothSelect(Number(e.target.value))}
							min={11}
							max={48}
							className="implant-input w-16 min-h-[40px] text-center font-mono font-bold text-xs"
							data-testid="input-tooth-fdi"
							title="Прямой ввод номера зуба FDI"
						/>
					</div>
				</div>

				<div className="space-y-3">
					<div className="implant-form-row">
						<label className="implant-label">Бренд системы:</label>
						<div className="implant-brand-toolbar flex items-center gap-1.5 flex-wrap flex-1" role="toolbar" data-testid="implant-brand-toolbar">
							{FAST_IMPLANT_SYSTEM_PRESETS.map((preset) => {
								const isSelected = props.selectedBrand === preset.brand;
								return (
									<button
										key={preset.brand}
										type="button"
										onClick={() => props.handleBrandSelect(preset.brand)}
										className={`implant-system-pill secondary-button min-h-[36px] px-3 text-xs font-semibold ${
											isSelected ? "active bg-[var(--teal,#0d9488)] text-white" : ""
										}`}
										data-testid={`btn-system-${preset.brand}`}
									>
										{preset.brand}
									</button>
								);
							})}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="implant-form-row">
							<label className="implant-label" htmlFor="select-diameter">Диаметр платформы:</label>
							<select
								id="select-diameter"
								value={props.diameterMm}
								onChange={(e) => props.setDiameterMm(Number(e.target.value))}
								className="implant-select min-h-[40px] flex-1"
								data-testid="select-diameter"
							>
								{STANDARD_DIAMETERS.map((dia) => (
									<option key={dia} value={dia}>
										Ø {dia.toFixed(1)} мм
									</option>
								))}
							</select>
						</div>

						<div className="implant-form-row">
							<label className="implant-label" htmlFor="select-length">Длина имплантата:</label>
							<select
								id="select-length"
								value={props.lengthMm}
								onChange={(e) => props.setLengthMm(Number(e.target.value))}
								className="implant-select min-h-[40px] flex-1"
								data-testid="select-length"
							>
								{STANDARD_LENGTHS.map((len) => (
									<option key={len} value={len}>
										{len.toFixed(1)} мм
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>

			{/* Плотность кости и стабильность */}
			<div className="space-y-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs">
				<div className="space-y-3">
					<div className="implant-form-row flex items-center justify-between gap-3 flex-wrap">
						<label className="implant-label text-xs font-semibold text-[var(--ink)]">Плотность кости (Misch):</label>
						<div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end">
							{(["D1", "D2", "D3", "D4"] as const).map((density) => (
								<button
									key={density}
									type="button"
									onClick={() => props.setBoneDensity(density)}
									className={`secondary-button min-h-[36px] h-9 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
										props.boneDensity === density ? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
									title={MISCH_DENSITY_NOTES[density].hint}
									data-testid={`btn-bone-density-${density.toLowerCase()}`}
								>
									{density}
								</button>
							))}
						</div>
					</div>

					<div className="implant-form-row flex items-center justify-between gap-3 flex-wrap">
						<label className="implant-label text-xs font-semibold text-[var(--ink)]" htmlFor="select-torque">
							Первичная стабильность и торк:
						</label>
						<div className="flex items-center gap-1.5 flex-wrap flex-1 justify-end">
							{TORQUE_PRESETS.map((val) => {
								const isSelected = props.torqueNcm === val;
								const isStandardOptimum = val === 35;
								return (
									<button
										key={val}
										type="button"
										onClick={() => props.setTorqueNcm(val)}
										className={`secondary-button min-h-[36px] h-9 px-2.5 text-xs font-mono font-bold rounded-xl border cursor-pointer transition-colors ${
											isSelected
												? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
												: isStandardOptimum
													? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)]"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
										}`}
										data-testid={`btn-quick-torque-${val}`}
										title={isStandardOptimum ? "Клинический оптимум (35 Н·см)" : `${val} Н·см`}
									>
										{val} Н·см
									</button>
								);
							})}
							<select
								id="select-torque"
								value={props.torqueNcm}
								onChange={(e) => props.setTorqueNcm(Number(e.target.value))}
								className="implant-select min-h-[36px] h-9 w-28 text-xs font-mono font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2"
								data-testid="select-torque"
							>
								{TORQUE_PRESETS.map((val) => (
									<option key={val} value={val}>
										{val} Н·см
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* Пассивный бейдж ISQ */}
				<div
					className={`p-3 rounded-xl border text-xs leading-normal flex items-center justify-between gap-3 shadow-xs transition-colors flex-wrap sm:flex-nowrap ${
						props.torqueNcm < 25
							? "bg-[var(--amber-surface,rgba(245,158,11,0.08))] border-[var(--amber,#f59e0b)] text-[var(--ink)]"
							: isOptimal
								? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)] font-medium"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
					}`}
					data-testid="isq-stability-passive-badge"
				>
					<div className="flex items-center gap-2.5 min-w-0 flex-1">
						{isOptimal ? (
							<CheckCircle2 size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						) : (
							<Gauge size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
						)}
						<div className="min-w-0">
							<div className="font-bold text-[var(--ink)] flex items-center gap-2 flex-wrap">
								<span>
									{props.torqueNcm < 25
										? "Торк < 25 Н·см · Низкая первичная фиксация"
										: isOptimal
											? `Торк ${props.torqueNcm} Н·см · Высокая первичная стабильность`
											: `Торк ${props.torqueNcm} Н·см · Стандартная стабильность`}
								</span>
								<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--teal,#0d9488)] font-black">
									ISQ {props.isqValue ?? 72}
								</span>
							</div>
							<span className="text-[11px] text-[var(--muted)] block truncate mt-0.5">
								{props.torqueNcm < 25
									? "Показан двухэтапный протокол: винт-заглушка с ушиванием раны наглухо"
									: "Оптимум для установки формирователя десны (ФДМ) или немедленной нагрузки"}
							</span>
						</div>
					</div>

					{isImmediateLoadingFeasible && (
						<span className="text-[10px] font-black uppercase tracking-wider text-[var(--teal,#0d9488)] shrink-0 bg-[var(--paper)] px-2.5 py-1 rounded-xl border border-[var(--teal,#0d9488)] shadow-2xs flex items-center gap-1">
							<Zap size={12} className="shrink-0 text-[var(--teal,#0d9488)]" />
							<span>Немедленная нагрузка</span>
						</span>
					)}
				</div>
			</div>

			{/* Формирователь десны / заглушка и НКР */}
			<div className="space-y-3">
				<div className="implant-form-row">
					<label className="implant-label">Тип ушивания / колпачка:</label>
					<div className="flex items-center gap-2 flex-1">
						<button
							type="button"
							onClick={() => props.setCapType("fdm")}
							className={`secondary-button flex-1 min-h-[44px] h-11 sm:h-9 sm:min-h-[36px] px-3 text-xs font-bold rounded-xl border ${
								props.capType === "fdm" ? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
							}`}
							data-testid="btn-cap-type-fdm"
						>
							ФДМ (формирователь десны)
						</button>
						<button
							type="button"
							onClick={() => props.setCapType("plug")}
							className={`secondary-button flex-1 min-h-[44px] h-11 sm:h-9 sm:min-h-[36px] px-3 text-xs font-bold rounded-xl border ${
								props.capType === "plug" ? "active bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
							}`}
							data-testid="btn-cap-type-plug"
						>
							Винт-заглушка (ушивание наглухо)
						</button>
					</div>
				</div>

				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink)]">
						<input
							type="checkbox"
							checked={props.isGbrPerformed}
							onChange={(e) => props.setIsGbrPerformed(e.target.checked)}
							className="rounded-md"
							data-testid="cb-gbr-performed"
						/>
						<span>Костная пластика (НКР / аугментация костным графтом и мембраной)</span>
					</label>

					{props.isGbrPerformed && (
						<ImplantConsumablesSelector
							stockConsumables={props.stockConsumables || DEFAULT_CANONICAL_CONSUMABLES}
							isGbrPerformed={props.isGbrPerformed}
							selectedGraftId={props.selectedGraftId}
							onSelectGraftId={props.onSelectGraftId || (() => {})}
							selectedMembraneId={props.selectedMembraneId}
							onSelectMembraneId={props.onSelectMembraneId || (() => {})}
							selectedSutureId={props.selectedSutureId}
							onSelectSutureId={props.onSelectSutureId || (() => {})}
						/>
					)}
				</div>
			</div>

			{/* Реквизиты стерильной упаковки (LOT / SN / REF) */}
			<div className="implant-packaging-section p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<Package size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="text-xs font-bold text-[var(--ink)]">Стерильная упаковка изделия (LOT / SN / REF):</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleAutofillPackaging}
							className="secondary-button text-[11px] px-2.5 py-1 min-h-[32px] h-8 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
							title="Автозаполнение по умолчанию"
							data-testid="btn-autofill-packaging"
						>
							По умолчанию
						</button>
						<span className="text-[11px] text-[var(--muted)] hidden sm:inline">Быстрое заполнение реквизитов</span>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
					<div className="min-w-0">
						<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">REF / Артикул:</label>
						<input
							type="text"
							value={props.catalogArticle}
							onChange={(e) => props.setCatalogArticle(e.target.value)}
							placeholder="TS3S4010S"
							className="implant-input w-full min-h-[36px] h-9 px-2.5 text-xs font-mono rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							data-testid="input-catalog-article"
						/>
					</div>
					<div className="min-w-0">
						<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">LOT / Партия:</label>
						<input
							type="text"
							value={props.lotNumber}
							onChange={(e) => props.setLotNumber(e.target.value)}
							placeholder="24C1208"
							className="implant-input w-full min-h-[36px] h-9 px-2.5 text-xs font-mono font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							data-testid="input-lot-number"
						/>
					</div>
					<div className="min-w-0">
						<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">SN / Серийный номер:</label>
						<input
							type="text"
							value={props.serialNumber}
							onChange={(e) => props.setSerialNumber(e.target.value)}
							placeholder="SN-884210"
							className="implant-input w-full min-h-[36px] h-9 px-2.5 text-xs font-mono rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							data-testid="input-serial-number"
						/>
					</div>
				</div>
			</div>

			{/* Складской селектор */}
			{props.stockItems && (
				<ImplantWarehouseSelector
					stockItems={props.stockItems}
					selectedStockItemId={props.selectedStockItemId}
					onSelectStockItem={props.onSelectStockItem || (() => {})}
					isOverdraftActive={props.isOverdraftActive}
					lotNumber={props.lotNumber}
					catalogArticle={props.catalogArticle}
				/>
			)}

			{/* Экономика хирурга */}
			<ImplantEconomicsSection
				operationPriceRub={props.operationPriceRub || 45000}
				setOperationPriceRub={props.setOperationPriceRub || (() => {})}
				implantCostRub={props.implantCostRub || 12500}
				consumablesCostRub={props.consumablesCostRub || 0}
				doctorGrossMarginRub={props.doctorGrossMarginRub || 32500}
			/>
		</div>
	);
};

export default ImplantProtocolTab;
