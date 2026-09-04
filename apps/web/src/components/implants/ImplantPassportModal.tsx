import React, { useState, useId } from "react";
import {
	Activity,
	CheckCircle2,
	X,
	ShieldCheck,
	Sliders,
	FileText,
	Copy,
	AlertTriangle,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	STANDARD_DIAMETERS,
	STANDARD_LENGTHS,
	QUICK_TORQUE_OPTIONS,
	MISCH_DENSITY_NOTES,
	createDefaultPassportRecord,
	type FastImplantPassportData,
	type MischDensity,
} from "./implantQuickPresets";
import { ImplantPassportCard } from "./ImplantPassportCard";
import "./implants.css";

export interface ImplantPassportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly initialTooth?: number;
	readonly onSavePassport?: (data: FastImplantPassportData) => void;
	readonly onInsertIntoDiary?: (diaryText: string) => void;
	readonly className?: string;
}

export const ImplantPassportModal: React.FC<ImplantPassportModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientId = "PAT-01",
	doctorName = "Хирург-имплантолог",
	doctorId = "DOC-01",
	initialTooth = 46,
	onSavePassport,
	onInsertIntoDiary,
	className = "",
}) => {
	const [toothFdi, setToothFdi] = useState<number>(initialTooth);
	const [selectedBrand, setSelectedBrand] = useState<string>("Osstem");
	const [diameterMm, setDiameterMm] = useState<number>(4.0);
	const [lengthMm, setLengthMm] = useState<number>(10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(35); // 35 Н/см по умолчанию
	const [boneDensity, setBoneDensity] = useState<MischDensity>("D2");
	const [lotNumber, setLotNumber] = useState<string>("LOT-2026-OSS-8842");
	const [serialNumber, setSerialNumber] = useState<string>("SN-991428");
	const [isOverdraftActive, setIsOverdraftActive] = useState<boolean>(false);
	const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
	const titleId = useId();

	const selectedSystem =
		FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === selectedBrand) ??
		FAST_IMPLANT_SYSTEM_PRESETS[0]!;

	const assembledData: FastImplantPassportData = {
		passportId: `IMP-PASSPORT-${toothFdi}-${Date.now().toString().slice(-6)}`,
		toothFdi,
		brand: selectedSystem.brand,
		model: selectedSystem.model,
		diameterMm,
		lengthMm,
		torqueNcm,
		lotNumber: lotNumber.trim() || `LOT-${selectedSystem.brand.slice(0, 3)}-AUTO`,
		serialNumber: serialNumber.trim() || `SN-${Date.now().toString().slice(-4)}`,
		boneDensity,
		isqDay0: 74,
		patientName,
		patientId,
		doctorName,
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: isOverdraftActive,
	};

	const handleBrandSelect = (brand: string) => {
		setSelectedBrand(brand);
		const found = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === brand);
		if (found) {
			setDiameterMm(found.defaultDiameterMm);
			setLengthMm(found.defaultLengthMm);
			setTorqueNcm(found.defaultTorqueNcm);
		}
	};

	const handleSave = () => {
		onSavePassport?.(assembledData);
		showToast(`Паспорт имплантата #${toothFdi} сохранен`, "success");
		onClose();
	};

	const handleInsertDiary = () => {
		const diaryEntry =
			`ПАСПОРТ ИМПЛАНТАТА (Зуб FDI #${toothFdi}):\n` +
			`Установлен имплантат: ${assembledData.brand} ${assembledData.model} Ø ${assembledData.diameterMm} x ${assembledData.lengthMm} мм.\n` +
			`Торк первичной стабильности: ${assembledData.torqueNcm} Н/см. Плотность кости: ${assembledData.boneDensity}.\n` +
			`LOT: ${assembledData.lotNumber}, SN: ${assembledData.serialNumber}.\n` +
			(isOverdraftActive ? "Примечание: списание проведено в мягкий овердрафт склада.\n" : "") +
			`Рекомендации даны. Протокол зафиксирован.`;

		if (onInsertIntoDiary) {
			onInsertIntoDiary(diaryEntry);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: diaryEntry,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast("Данные паспорта имплантата внесены в карту 043/у", "success");
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div
			className="implant-passport-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="implant-passport-modal-backdrop"
		>
			<div
				className={`implant-passport-card-container ${className}`.trim()}
				data-testid="implant-passport-modal"
			>
				{/* Header */}
				<header className="implant-passport-header-bar">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
							<ShieldCheck size={22} />
						</div>
						<div>
							<h2 id={titleId} className="text-base font-black text-[var(--ink)] flex items-center gap-2">
								<span>Паспорт дентального имплантата</span>
								<span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
									Зуб FDI #{toothFdi}
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)]">
								{patientName} · {doctorName} · Быстрая фиксация без бюрократических замков
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setActiveView(activeView === "edit" ? "preview" : "edit")}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] text-xs"
							data-testid="btn-toggle-passport-view"
						>
							<Sliders size={15} />
							<span>{activeView === "edit" ? "Предпросмотр карты" : "Параметры"}</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] p-2.5"
							aria-label="Закрыть окно паспорта"
							data-testid="btn-close-implant-passport"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Body */}
				<div className="implant-passport-content">
					{/* Мягкий овердрафт предупреждение */}
					{isOverdraftActive && (
						<div className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5" data-testid="passport-overdraft-notice">
							<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
							<div className="flex-1">
								<strong className="text-[var(--amber-dark,#b45309)]">Мягкий овердрафт склада: </strong>
								<span>Задержка накладной не блокирует сохранение. Паспорт сохраняется штатно.</span>
							</div>
							<button
								type="button"
								onClick={() => setIsOverdraftActive(false)}
								className="text-xs font-bold underline text-[var(--ink)]"
							>
								Закрыть
							</button>
						</div>
					)}

					{activeView === "preview" ? (
						<ImplantPassportCard data={assembledData} />
					) : (
						<div className="space-y-4">
							{/* Выбор системы имплантации */}
							<div>
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] block mb-2">
									Имплантационная система:
								</span>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
									{FAST_IMPLANT_SYSTEM_PRESETS.map((sys) => {
										const isSel = selectedBrand === sys.brand;
										return (
											<button
												key={sys.brand}
												type="button"
												onClick={() => handleBrandSelect(sys.brand)}
												className={`implant-system-pill ${isSel ? "selected" : ""}`}
												data-testid={`btn-system-${sys.brand}`}
											>
												<div className="truncate">{sys.brand}</div>
												<div className="text-[10px] opacity-80 truncate">{sys.model}</div>
											</button>
										);
									})}
								</div>
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
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="passport-torque" className="text-xs font-bold text-[var(--ink)]">
										Торк стабилизации:
									</label>
									<select
										id="passport-torque"
										value={torqueNcm}
										onChange={(e) => setTorqueNcm(Number(e.target.value))}
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
										data-testid="select-torque"
									>
										{QUICK_TORQUE_OPTIONS.map((t) => (
											<option key={t} value={t}>
												{t} Н/см {t === 35 ? "(Идеал)" : ""}
											</option>
										))}
									</select>
								</div>

								<div className="flex flex-col gap-1">
									<label htmlFor="passport-bone" className="text-xs font-bold text-[var(--ink)]">
										Плотность кости:
									</label>
									<select
										id="passport-bone"
										value={boneDensity}
										onChange={(e) => setBoneDensity(e.target.value as MischDensity)}
										className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)]"
										data-testid="select-bone-density"
									>
										{(["D1", "D2", "D3", "D4"] as MischDensity[]).map((b) => (
											<option key={b} value={b}>
												{MISCH_DENSITY_NOTES[b].title}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* LOT и Серийный номер */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
										data-testid="input-passport-lot"
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
										data-testid="input-passport-sn"
									/>
								</div>
							</div>

							{/* Имитация овердрафта для проверки неблокирующего сохранения */}
							<div className="flex items-center justify-between p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
								<span className="text-[var(--muted)]">
									Складской статус: компоненты оприходованы
								</span>
								<button
									type="button"
									onClick={() => setIsOverdraftActive(!isOverdraftActive)}
									className="text-xs font-bold text-[var(--teal,#0d9488)] hover:underline cursor-pointer"
									data-testid="btn-toggle-overdraft-test"
								>
									{isOverdraftActive ? "Снять овердрафт" : "Тест задержки накладной"}
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<footer className="implant-passport-actions">
					<div className="text-xs text-[var(--muted)]">
						{selectedSystem.brand} Ø {diameterMm} × {lengthMm} мм · {torqueNcm} Н/см
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleInsertDiary}
							className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"
							data-testid="btn-passport-insert-diary"
						>
							<FileText size={16} />
							<span>Внести в 043/у</span>
						</button>

						<button
							type="button"
							onClick={handleSave}
							className="implant-touch-btn bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
							data-testid="btn-save-implant-passport"
						>
							<CheckCircle2 size={16} />
							<span>Сохранить паспорт</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ImplantPassportModal;
