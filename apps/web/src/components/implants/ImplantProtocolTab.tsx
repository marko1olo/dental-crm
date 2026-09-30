import React from "react";
import {
	CheckCircle2,
	Scan,
	TrendingUp,
} from "lucide-react";
import { DentalImplant, BoneGraft } from "../icons/DentalIcons";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	STANDARD_DIAMETERS,
	STANDARD_LENGTHS,
	QUICK_TORQUE_OPTIONS,
	MISCH_DENSITY_NOTES,
	type MischDensity,
	type ImplantCapType,
} from "./implantQuickPresets";
import {
	FREQUENT_IMPLANT_SITES,
	PERMANENT_TEETH_OPTIONS,
} from "./implantConstants";

export interface ImplantProtocolTabProps {
	readonly toothFdi: number;
	readonly handleToothSelect: (fdi: number) => void;
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly scannedBarcode: string;
	readonly setScannedBarcode: (s: string) => void;
	readonly handleApplyBarcode: (codeOverride?: string) => void;
	readonly isGbrPerformed: boolean;
	readonly setIsGbrPerformed: (gbr: boolean) => void;
	readonly capType: ImplantCapType;
	readonly setCapType: (cap: ImplantCapType) => void;
	readonly isIsqEnabled: boolean;
	readonly setIsIsqEnabled: (en: boolean) => void;
	readonly selectedBrand: string;
	readonly handleBrandSelect: (brand: string) => void;
	readonly diameterMm: number;
	readonly setDiameterMm: (dia: number) => void;
	readonly lengthMm: number;
	readonly setLengthMm: (len: number) => void;
	readonly torqueNcm: number;
	readonly setTorqueNcm: (torque: number) => void;
	readonly lotNumber: string;
	readonly setLotNumber: (lot: string) => void;
	readonly catalogArticle: string;
	readonly setCatalogArticle: (art: string) => void;
	readonly serialNumber: string;
	readonly setSerialNumber: (sn: string) => void;
	readonly isOverdraftActive: boolean;
}

export const ImplantProtocolTab: React.FC<ImplantProtocolTabProps> = ({
	toothFdi,
	handleToothSelect,
	boneDensity,
	setBoneDensity,
	scannedBarcode,
	setScannedBarcode,
	handleApplyBarcode,
	isGbrPerformed,
	setIsGbrPerformed,
	capType,
	setCapType,
	isIsqEnabled,
	setIsIsqEnabled,
	selectedBrand,
	handleBrandSelect,
	diameterMm,
	setDiameterMm,
	lengthMm,
	setLengthMm,
	torqueNcm,
	setTorqueNcm,
	lotNumber,
	setLotNumber,
	catalogArticle,
	setCatalogArticle,
	serialNumber,
	setSerialNumber,
	isOverdraftActive,
}) => {
	return (
		<div className="space-y-4" data-testid="tab-content-protocol">
			{/* Выбор зуба FDI и плотность кости (Анатомическая локализация) */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
						Локализация имплантата (Зубная формула FDI 11–48):
					</div>
					<div className="text-xs font-mono font-bold text-[var(--teal,#0d9488)]">
						Плотность кости: {boneDensity} ({MISCH_DENSITY_NOTES[boneDensity].title})
					</div>
				</div>

				{/* Quick FDI sites */}
				<div className="flex items-center gap-1.5 flex-wrap" role="toolbar" aria-label="Быстрый выбор причинного зуба">
					<span className="text-[11px] font-bold text-[var(--muted)] mr-1">Частые:</span>
					{FREQUENT_IMPLANT_SITES.map((site) => {
						const isSel = toothFdi === site;
						return (
							<button
								key={site}
								type="button"
								onClick={() => handleToothSelect(site)}
								className={`h-8 px-2.5 rounded-lg text-xs font-mono font-black border cursor-pointer transition-all ${
									isSel
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`btn-quick-tooth-${site}`}
								title={`Выбрать зуб #${site}`}
							>
								#{site}
							</button>
						);
					})}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
					<div className="flex flex-col gap-1">
						<label htmlFor="passport-tooth-fdi" className="text-xs font-bold text-[var(--ink)]">
							Полный список зубов постоянного прикуса:
						</label>
						<select
							id="passport-tooth-fdi"
							value={toothFdi}
							onChange={(e) => handleToothSelect(Number(e.target.value))}
							className="min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)]"
							data-testid="select-tooth-fdi"
						>
							{PERMANENT_TEETH_OPTIONS.map((t) => (
								<option key={t.fdi} value={t.fdi}>
									{t.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1">
						<label htmlFor="input-tooth-fdi" className="text-xs font-bold text-[var(--ink)]">
							Номер зуба FDI (число):
						</label>
						<input
							id="input-tooth-fdi"
							type="number"
							min="11"
							max="48"
							value={toothFdi}
							onChange={(e) => {
								const val = Number(e.target.value);
								if (!isNaN(val) && val >= 11 && val <= 48) {
									handleToothSelect(val);
								}
							}}
							className="min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-mono font-bold text-[var(--ink)]"
							data-testid="input-tooth-fdi"
							aria-label="Номер зуба FDI"
						/>
					</div>
				</div>
			</div>

			{/* 2D Сканер блистера упаковки (GS1 DataMatrix / Штрихкод) */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
				<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
					<Scan size={15} className="text-[var(--teal,#0d9488)]" />
					<span>Сканирование блистера упаковки (GS1 DataMatrix / 2D сканер):</span>
				</div>
				<div className="flex items-center gap-2">
					<input
						id="passport-barcode-scan"
						type="text"
						value={scannedBarcode}
						onChange={(e) => {
							setScannedBarcode(e.target.value);
							handleApplyBarcode(e.target.value);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleApplyBarcode();
						}}
						placeholder="(01)GTIN(10)LOT(21)SN или сканируйте 2D сканером..."
						className="flex-1 min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-mono text-[var(--ink)]"
						data-testid="input-barcode-scanner"
					/>
					<button
						type="button"
						onClick={() => handleApplyBarcode()}
						className="min-h-[44px] px-4 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] hover:filter hover:brightness-105 cursor-pointer touch-manipulation shrink-0"
						data-testid="btn-scan-barcode"
						title="Распознать артикул, серию и лот из штрихкода"
					>
						Применить
					</button>
				</div>
			</div>

			{/* 1-Click Clinical Presets (Standard vs GBR) */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
				<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
					Клинический протокол вмешательства (1 клик):
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setIsGbrPerformed(false)}
						className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
							!isGbrPerformed
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="preset-standard-implantation"
					>
						<span className="flex items-center gap-2 min-w-0">
							<DentalImplant size={16} className={!isGbrPerformed ? "text-[var(--warn,#f59e0b)] shrink-0" : "text-[var(--teal,#0d9488)] shrink-0"} />
							<span className="truncate">Стандартная имплантация (без НКР / Без костной пластики)</span>
						</span>
						{!isGbrPerformed && <CheckCircle2 size={16} className="text-[var(--on-teal,#ffffff)] shrink-0" />}
					</button>

					<button
						type="button"
						onClick={() => setIsGbrPerformed(true)}
						className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
							isGbrPerformed
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="preset-gbr-implantation"
					>
						<span className="flex items-center gap-2 min-w-0">
							<BoneGraft size={16} className={isGbrPerformed ? "text-[var(--on-teal,#ffffff)] shrink-0" : "text-[var(--brand-primary,#0ea5e9)] shrink-0"} />
							<span className="truncate">Имплантация с НКР (костная пластика)</span>
						</span>
						{isGbrPerformed && <CheckCircle2 size={16} className="text-[var(--on-teal,#ffffff)] shrink-0" />}
					</button>
				</div>
			</div>

			{/* 1-Click Выбор: ФДМ vs Винт-заглушка (Gingiva Former vs Cover Screw) */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
				<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
					Формирователь десны / Винт-заглушка (1 клик):
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setCapType("fdm")}
						className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
							capType === "fdm"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="btn-cap-type-fdm"
					>
						<span className="flex flex-col min-w-0">
							<span className="font-extrabold truncate">ФДМ (формирователь десны)</span>
							<span className="text-[10px] opacity-85 truncate">Одноэтапный протокол с формированием контура</span>
						</span>
						{capType === "fdm" && <CheckCircle2 size={18} className="text-[var(--on-teal,#ffffff)] shrink-0" />}
					</button>

					<button
						type="button"
						onClick={() => setCapType("plug")}
						className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
							capType === "plug"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="btn-cap-type-plug"
					>
						<span className="flex flex-col min-w-0">
							<span className="font-extrabold truncate">Винт-заглушка (Cover screw)</span>
							<span className="text-[10px] opacity-85 truncate">Двухэтапный протокол (ушивание наглухо)</span>
						</span>
						{capType === "plug" && <CheckCircle2 size={18} className="text-[var(--on-teal,#ffffff)] shrink-0" />}
					</button>
				</div>
			</div>

			{/* Stability Mode Switcher (Torque vs ISQ device) */}
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => setIsIsqEnabled(false)}
					className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-2 cursor-pointer touch-manipulation ${
						!isIsqEnabled
							? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
					}`}
					data-testid="btn-stability-torque-only"
				>
					<DentalImplant size={16} />
					<span>Контроль стабильности по торку (35 Н·см ключом)</span>
					{!isIsqEnabled && <CheckCircle2 size={16} className="text-[var(--on-teal,#ffffff)] shrink-0" />}
				</button>

				<button
					type="button"
					onClick={() => setIsIsqEnabled(true)}
					className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-2 cursor-pointer touch-manipulation ${
						isIsqEnabled
							? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
					}`}
					data-testid="btn-stability-isq-sensor"
				>
					<TrendingUp size={16} />
					<span>Магнитный резонанс ISQ (72 ISQ Osstell / Penguin)</span>
					{isIsqEnabled && <CheckCircle2 size={16} className="text-[var(--on-teal,#ffffff)] shrink-0" />}
				</button>
			</div>

			{/* Выбор системы имплантации (Закон Хика: компактный тулбар брендов 32-36px) */}
			<div>
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] block mb-1.5">
					Имплантационная система (1 клик):
				</span>
				<div className="implant-brand-toolbar" role="toolbar" aria-label="Выбор бренда имплантата">
					{FAST_IMPLANT_SYSTEM_PRESETS.map((sys) => {
						const isSel = selectedBrand === sys.brand;
						return (
							<button
								key={sys.brand}
								type="button"
								onClick={() => handleBrandSelect(sys.brand)}
								className={`implant-system-pill ${isSel ? "selected" : ""}`}
								data-testid={`btn-system-${sys.brand} implant-preset-btn-${sys.brand}`}
								title={`${sys.brand} ${sys.model} · Ø ${sys.defaultDiameterMm} × ${sys.defaultLengthMm} мм · ${sys.defaultTorqueNcm} Н·см`}
							>
								<span className="truncate font-extrabold text-xs">{sys.brand}</span>
								<span className="text-[10px] opacity-75 truncate hidden sm:inline">({sys.model})</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Misch Bone Density Cards */}
			<div>
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] block mb-2">
					Плотность кости (Классификация Misch D1–D4):
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1">
					{(["D1", "D2", "D3", "D4"] as MischDensity[]).map((b) => {
						const isSel = boneDensity === b;
						return (
							<button
								key={b}
								type="button"
								onClick={() => setBoneDensity(b)}
								className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
									isSel
										? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)] shadow-xs"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:border-[var(--line-strong,#94a3b8)]"
								}`}
								data-testid={`bone-card-${b}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-black text-xs text-[var(--teal,#0d9488)]">{b}</span>
									{isSel && <CheckCircle2 size={14} className="text-[var(--teal,#0d9488)] shrink-0" />}
								</div>
								<div className="text-[11px] font-bold text-[var(--ink)] truncate" title={MISCH_DENSITY_NOTES[b].title}>{MISCH_DENSITY_NOTES[b].title}</div>
								<div className="text-[10px] text-[var(--muted)] truncate" title={MISCH_DENSITY_NOTES[b].hint}>{MISCH_DENSITY_NOTES[b].hint}</div>
							</button>
						);
					})}
				</div>
				<select
					id="passport-bone"
					value={boneDensity}
					onChange={(e) => setBoneDensity(e.target.value as MischDensity)}
					className="sr-only"
					data-testid="select-bone-density"
					aria-label="Выбор плотности кости по Misch"
				>
					{(["D1", "D2", "D3", "D4"] as MischDensity[]).map((b) => (
						<option key={b} value={b}>
							{MISCH_DENSITY_NOTES[b].title}
						</option>
					))}
				</select>
			</div>

			{/* Размеры и Торк */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="flex flex-col gap-1">
					<label htmlFor="passport-dia" className="text-xs font-bold text-[var(--ink)]">
						Диаметр (Ø мм):
					</label>
					<select
						id="passport-dia"
						value={diameterMm}
						onChange={(e) => setDiameterMm(Number(e.target.value))}
						className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)]"
						data-testid="select-diameter"
					>
						{STANDARD_DIAMETERS.map((d) => (
							<option key={d} value={d}>
								Ø {d} мм
							</option>
						))}
					</select>
					<input
						id="implant-dia"
						type="number"
						step="0.1"
						value={diameterMm}
						onChange={(e) => setDiameterMm(Number(e.target.value))}
						className="sr-only"
						data-testid="input-diameter"
						aria-label="Диаметр имплантата числовой"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label htmlFor="passport-len" className="text-xs font-bold text-[var(--ink)]">
						Длина (мм):
					</label>
					<select
						id="passport-len"
						value={lengthMm}
						onChange={(e) => setLengthMm(Number(e.target.value))}
						className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)]"
						data-testid="select-length"
					>
						{STANDARD_LENGTHS.map((l) => (
							<option key={l} value={l}>
								{l} мм
							</option>
						))}
					</select>
					<input
						id="implant-len"
						type="number"
						step="0.5"
						value={lengthMm}
						onChange={(e) => setLengthMm(Number(e.target.value))}
						className="sr-only"
						data-testid="input-length"
						aria-label="Длина имплантата числовая"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<label htmlFor="passport-torque" className="text-xs font-bold text-[var(--ink)]">
							Торк стабилизации:
						</label>
						<span className="text-xs font-mono font-black text-[var(--teal,#0d9488)]">
							{torqueNcm} Н·см
						</span>
					</div>
					<select
						id="passport-torque"
						value={torqueNcm}
						onChange={(e) => setTorqueNcm(Number(e.target.value))}
						className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
						data-testid="select-torque"
					>
						{QUICK_TORQUE_OPTIONS.map((t) => (
							<option key={t} value={t}>
								{t} Н·см {t === 35 ? "(Идеал)" : ""}
							</option>
						))}
					</select>
					<input
						type="range"
						id="torque-slider"
						min="15"
						max="60"
						step="5"
						value={torqueNcm}
						onChange={(e) => setTorqueNcm(Number(e.target.value))}
						className="w-full h-2 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--teal,#0d9488)] mt-1"
						data-testid="torque-slider"
						aria-label="Ползунок торка первичной стабилизации"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label htmlFor="passport-lot" className="text-xs font-bold text-[var(--ink)]">
						LOT / Партия завода:
					</label>
					<input
						id="passport-lot"
						type="text"
						value={lotNumber}
						onChange={(e) => setLotNumber(e.target.value)}
						className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
						data-testid="input-lot input-passport-lot"
					/>
				</div>
			</div>

			{/* Артикул REF и Серийный номер */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<label htmlFor="passport-article" className="text-xs font-bold text-[var(--ink)]">
						REF / Каталожный артикул:
					</label>
					<input
						id="passport-article"
						type="text"
						value={catalogArticle}
						onChange={(e) => setCatalogArticle(e.target.value)}
						placeholder="TS3S4010S"
						className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
						data-testid="input-article input-passport-article"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label htmlFor="passport-sn" className="text-xs font-bold text-[var(--ink)]">
						Серийный номер (SN):
					</label>
					<input
						id="passport-sn"
						type="text"
						value={serialNumber}
						onChange={(e) => setSerialNumber(e.target.value)}
						className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
						data-testid="input-sn input-passport-sn"
					/>
				</div>

				{/* Статус склада и мягкий овердрафт (Мандат 8e) */}
				<div className="flex items-center justify-between p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex-wrap gap-2">
					<span className="text-[var(--muted)]">
						Складской статус: {isOverdraftActive ? "Мягкий овердрафт (задержка накладной)" : "компоненты оприходованы"}
					</span>
					<span className={`text-xs font-semibold ${isOverdraftActive ? "text-[var(--amber,#f59e0b)]" : "text-[var(--teal,#0d9488)]"}`}>
						{isOverdraftActive ? "Овердрафт разрешен (списание до проведения накладной)" : "В наличии"}
					</span>
				</div>
			</div>
		</div>
	);
};
