import {
	Barcode,
	CheckCircle2,
	Scale,
	Sparkles,
} from "lucide-react";
import React from "react";
import {
	SANPIN_DECONTAMINATION_METHODS,
	SANPIN_MEDICAL_WASTE_CLASSES,
	SANPIN_STORAGE_LOCATIONS,
	SANPIN_WASTE_PACKAGING_TYPES,
	type DecontaminationMethodType,
	type MedicalWasteClassId,
	type MedicalWastePackagingTypeId,
	type WasteStorageLocationId,
} from "./medicalWastePresets.js";

export interface MedicalWasteAccumulateTabProps {
	readonly selectedClass: MedicalWasteClassId;
	readonly handleClassChange: (c: MedicalWasteClassId) => void;
	readonly selectedPackaging: MedicalWastePackagingTypeId;
	readonly setSelectedPackaging: (p: MedicalWastePackagingTypeId) => void;
	readonly packageCount: number;
	readonly setPackageCount: (cnt: number) => void;
	readonly grossWeightInput: number;
	readonly setGrossWeightInput: (w: number) => void;
	readonly currentWeights: { grossKg: number; tareKg: number; netKg: number };
	readonly decontamMethod: DecontaminationMethodType;
	readonly setDecontamMethod: (m: DecontaminationMethodType) => void;
	readonly storageLocation: WasteStorageLocationId;
	readonly setStorageLocation: (loc: WasteStorageLocationId) => void;
	readonly sealNumber: string;
	readonly setSealNumber: (s: string) => void;
	readonly barcode: string;
	readonly handleAddRecord: () => void;
	readonly handleQuickShiftWaste: () => void;
	readonly isSubmittingQuickShift: boolean;
}

export function MedicalWasteAccumulateTab({
	selectedClass,
	handleClassChange,
	selectedPackaging,
	setSelectedPackaging,
	packageCount,
	setPackageCount,
	grossWeightInput,
	setGrossWeightInput,
	currentWeights,
	decontamMethod,
	setDecontamMethod,
	storageLocation,
	setStorageLocation,
	sealNumber,
	setSealNumber,
	barcode,
	handleAddRecord,
	handleQuickShiftWaste,
	isSubmittingQuickShift,
}: MedicalWasteAccumulateTabProps) {
	return (
		<div className="flex flex-col gap-4">
			{/* Dominant 1-Click Shift Preset */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.6rem",
					padding: "1rem",
					borderRadius: "12px",
					background: "var(--teal-soft, #f0fdfa)",
					border: "2px solid var(--teal, #0d9488)",
					boxShadow: "0 4px 12px rgba(13, 148, 136, 0.15)",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 800, fontSize: "0.95rem", color: "var(--ink, #0f172a)" }}>
							<Sparkles size={18} color="var(--teal, #0d9488)" />
							<span>Экспресс-учет отходов смены</span>
						</div>
						<div style={{ fontSize: "0.775rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
							1-клик автоматическое формирование двух записей: мягкие отходы (желтый пакет 2.5 кг) + острые отходы (контейнер игл 0.8 кг)
						</div>
					</div>

					<button
						type="button"
						onClick={handleQuickShiftWaste}
						aria-busy={isSubmittingQuickShift}
						className="touch-manipulation"
						style={{
							minHeight: "44px",
							padding: "0.6rem 1.25rem",
							fontSize: "0.925rem",
							fontWeight: 800,
							borderRadius: "8px",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.5rem",
							boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
							whiteSpace: "nowrap",
						}}
						title="1-Клик сдать отходы смены (пакет 2.5 кг + контейнер игл 0.8 кг)"
						data-testid="waste-quick-shift-btn"
					>
						<Sparkles size={18} />
						<span>{isSubmittingQuickShift ? "Оформление смены..." : "1-Клик сдать отходы смены (пакет 2.5 кг + контейнер игл 0.8 кг)"}</span>
					</button>
				</div>
			</div>

			{/* 1. Выбор класса отходов */}
			<div>
				<div className="text-xs font-bold uppercase text-muted mb-2">
					1. Класс отходов
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{SANPIN_MEDICAL_WASTE_CLASSES.map((cls) => {
						const isSelected = selectedClass === cls.id;
						return (
							<div
								key={cls.id}
								className={`waste-class-card ${
									cls.id === "class_A" && isSelected
										? "selected-class-a"
										: cls.id === "class_B" && isSelected
										? "selected-class-b"
										: cls.id === "class_V" && isSelected
										? "selected-class-v"
										: isSelected
										? "selected-class-g"
										: ""
								}`}
								onClick={() => handleClassChange(cls.id)}
							>
								<div className="flex items-center justify-between">
									<span
										className="text-xs font-black px-2.5 py-1 rounded-full uppercase"
										style={{
											backgroundColor: cls.colorTheme.hexBadgeBg,
											color: cls.colorTheme.hexBadgeFg,
											border: `1px solid ${cls.colorTheme.hexBorder}`,
										}}
									>
										Класс {cls.letterCode}
									</span>
									{isSelected && <CheckCircle2 size={18} className="text-[var(--teal,#0d9488)]" />}
								</div>
								<div className="font-bold text-sm text-ink">{cls.nameRu}</div>
								<div className="text-xs text-muted leading-tight">
									{cls.dentalSpecificItemsRu[0]}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Информационный баннер состава отходов Класса Б */}
			{selectedClass === "class_B" && (
				<div
					style={{
						padding: "0.75rem 1rem",
						borderRadius: "10px",
						background: "#fef3c7",
						border: "1px solid #f59e0b",
						color: "#92400e",
						fontSize: "0.8rem",
						lineHeight: 1.4,
					}}
				>
					<div style={{ fontWeight: 800, marginBottom: "2px" }}>
						Опасные стоматологические отходы (Класс Б):
					</div>
					<div>
						• <strong>Мягкие отходы:</strong> карпулы от анестетиков со следами крови, ватные валики, марлевые салфетки, латексные/нитриловые перчатки, удаленные зубы.<br />
						• <strong>Острый инструментарий:</strong> карпульные инъекционные иглы, эндодонтические файлы, лезвия скальпелей — сбор строго в непрокалываемые желтые емкости с иглосъемником!
					</div>
				</div>
			)}

			{/* 2. Тара, весы и количество */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-line bg-paper-soft">
				{/* Тара */}
				<div>
					<label htmlFor="waste-packaging-select" className="text-xs font-semibold text-muted block mb-1">
						Тип тары / Упаковки
					</label>
					<select
						id="waste-packaging-select"
						value={selectedPackaging}
						onChange={(e) => setSelectedPackaging(e.target.value as MedicalWastePackagingTypeId)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring"
					>
						{SANPIN_WASTE_PACKAGING_TYPES.filter((p) => p.wasteClass === selectedClass).map((pkg) => (
							<option key={pkg.id} value={pkg.id}>
								{pkg.nameRu} (тара {pkg.defaultTareWeightKg} кг / {Math.round(pkg.defaultTareWeightKg * 1000)} г)
							</option>
						))}
					</select>
				</div>

				{/* Количество упаковок */}
				<div>
					<label htmlFor="waste-package-count" className="text-xs font-semibold text-muted block mb-1">
						Количество мест (пакетов/баков)
					</label>
					<input
						id="waste-package-count"
						type="number"
						min={1}
						max={50}
						value={packageCount}
						onChange={(e) => setPackageCount(Number(e.target.value))}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-focus-ring"
					/>
				</div>

				{/* Вес брутто по весам */}
				<div>
					<div className="flex items-center justify-between mb-1">
						<label htmlFor="waste-gross-weight" className="text-xs font-semibold text-muted">
							Фактический вес брутто (по весам)
						</label>
					</div>
					<div className="flex items-center gap-2">
						<Scale size={20} className="text-[var(--teal,#0d9488)] shrink-0" />
						<input
							id="waste-gross-weight"
							type="number"
							step="0.001"
							min="0.001"
							value={grossWeightInput}
							onChange={(e) => setGrossWeightInput(parseFloat(e.target.value) || 0)}
							placeholder="Вес в кг (например 2.45 или 0.8)"
							className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-focus-ring"
						/>
						<span className="text-xs font-bold text-muted px-2 py-1 bg-paper rounded border border-line">
							кг ({Math.round(grossWeightInput * 1000)} г)
						</span>
					</div>
				</div>
			</div>

			{/* 3. Дисплей весового баланса */}
			<div className="waste-weight-display">
				<div className="waste-weight-metric">
					<span className="waste-weight-lbl">Брутто (с тарой)</span>
					<span className="waste-weight-val">
						{currentWeights.grossKg.toFixed(2)} кг <span className="text-xs font-normal text-muted">({Math.round(currentWeights.grossKg * 1000)} г)</span>
					</span>
				</div>
				<div className="waste-weight-metric">
					<span className="waste-weight-lbl">Тара (пакет/контейнер)</span>
					<span className="waste-weight-val text-muted">
						{currentWeights.tareKg.toFixed(2)} кг <span className="text-xs font-normal">({Math.round(currentWeights.tareKg * 1000)} г)</span>
					</span>
				</div>
				<div className="waste-weight-metric">
					<span className="waste-weight-lbl">Чистый вес нетто</span>
					<span className="waste-weight-net-val">
						{currentWeights.netKg.toFixed(2)} кг <span className="text-xs font-normal">({Math.round(currentWeights.netKg * 1000)} г)</span>
					</span>
				</div>
			</div>

			{/* Норматив накопления */}
			<div className="text-xs text-muted px-1 flex items-center justify-between flex-wrap gap-2">
				<span>
					• Срок хранения: <strong>не более 24 часов</strong> при комнатной температуре, <strong>до 72 часов</strong> в холодильнике.
				</span>
			</div>

			{/* 4. Обеззараживание, пломба и место хранения */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				{/* Обеззараживание */}
				<div>
					<label htmlFor="waste-decontam-select" className="text-xs font-semibold text-muted block mb-1">
						Метод обеззараживания
					</label>
					<select
						id="waste-decontam-select"
						value={decontamMethod}
						onChange={(e) => setDecontamMethod(e.target.value as DecontaminationMethodType)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
					>
						{SANPIN_DECONTAMINATION_METHODS.map((m) => (
							<option key={m.id} value={m.id}>
								{m.nameRu}
							</option>
						))}
					</select>
				</div>

				{/* Место хранения */}
				<div>
					<label htmlFor="waste-storage-select" className="text-xs font-semibold text-muted block mb-1">
						Режим накопления / Хранилище
					</label>
					<select
						id="waste-storage-select"
						value={storageLocation}
						onChange={(e) => setStorageLocation(e.target.value as WasteStorageLocationId)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
					>
						{SANPIN_STORAGE_LOCATIONS.map((loc) => (
							<option key={loc.id} value={loc.id}>
								{loc.nameRu} ({loc.temperatureRangeRu})
							</option>
						))}
					</select>
				</div>

				{/* Номер пломбы */}
				<div>
					<label htmlFor="waste-seal-number" className="text-xs font-semibold text-muted block mb-1">
						Номер бирки / Пломбы-стяжки
					</label>
					<input
						id="waste-seal-number"
						type="text"
						value={sealNumber}
						onChange={(e) => setSealNumber(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-focus-ring"
					/>
				</div>
			</div>

			{/* Штрихкод и кнопка фиксации */}
			<div className="p-4 rounded-xl border border-line bg-paper-soft flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-3">
					<Barcode size={28} className="text-[var(--teal,#0d9488)]" />
					<div>
						<div className="text-xs text-muted">Сгенерированный штрихкод СанПиН</div>
						<div className="font-mono font-bold text-ink text-sm">{barcode}</div>
					</div>
				</div>

				<button
					type="button"
					onClick={handleAddRecord}
					className="waste-btn waste-btn-primary"
				>
					<CheckCircle2 size={18} /> Зафиксировать в журнале
				</button>
			</div>
		</div>
	);
}
