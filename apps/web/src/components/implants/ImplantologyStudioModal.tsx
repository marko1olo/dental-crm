/**
 * ImplantologyStudioModal.tsx — Каноническая студия хирурга-имплантолога DENTE CRM (Мандаты 8e, 8n, 8am, 8b).
 * Монолитное окно: 6 систем РФ, зубная формула FDI 11–48, зеленая зона торка 35–45 Н·см, ISQ 65–85,
 * гарантийный паспорт А5 с векторным QR-кодом и ровно 1 Primary CTA кнопка var(--teal).
 */

import React, { useId, useState, useMemo } from "react";
import { Award, Check, FileText, HeartHandshake, Printer, QrCode, ShieldCheck, Sparkles, Stethoscope, Wrench, X } from "lucide-react";
import {
	CANONICAL_IMPLANT_SYSTEMS,
	SURGICAL_QUICK_TEMPLATES,
	FDI_SURGICAL_PRESETS,
	getMischBoneDensityByToothFdi,
	getRecommendedTorqueZone,
	formatKopecksToRubles,
	generateWarrantyPassportRecord,
	buildSoapSurgeryDiaryText,
	type CanonicalImplantSystemId,
	type ImplantStageType,
	type MischBoneDensity,
	type ImplantWarrantyPassportData,
} from "./implantologyCatalogData";
import "./implants.css";
import "./implantsDarkAndResponsive.css";

export type ImplantStudioTab = "protocol" | "passport" | "diary" | "memo";

export interface ImplantologyStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly initialTab?: ImplantStudioTab | undefined;
	readonly onSaveProtocol?: ((passport: ImplantWarrantyPassportData, soapDiary: string) => void) | undefined;
	readonly className?: string | undefined;
}

const STUDIO_TABS: readonly { readonly id: ImplantStudioTab; readonly label: string; readonly icon: React.FC<{ size?: number; className?: string }> }[] = [
	{ id: "protocol", label: "1. Протокол", icon: Stethoscope },
	{ id: "passport", label: "2. Паспорт имплантата", icon: Award },
	{ id: "diary", label: "3. В дневник (SOAP)", icon: FileText },
	{ id: "memo", label: "4. Памятка пациенту", icon: HeartHandshake },
];

export const ImplantologyStudioModal: React.FC<ImplantologyStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Иванов Иван Иванович",
	patientId = "PAT-01",
	doctorName = "Д-р Воронов А. В.",
	doctorId = "DOC-01",
	initialTooth = 46,
	initialTab = "protocol",
	onSaveProtocol,
	className = "",
}) => {
	const titleId = useId();
	const [activeTab, setActiveTab] = useState<ImplantStudioTab>(initialTab);
	const [toothFdi, setToothFdi] = useState<number>(initialTooth || 46);
	const [systemId, setSystemId] = useState<CanonicalImplantSystemId>("osstem");
	const [diameterMm, setDiameterMm] = useState<number>(4.0);
	const [lengthMm, setLengthMm] = useState<number>(10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(35);
	const [isqValue, setIsqValue] = useState<number>(72);
	const [stage, setStage] = useState<ImplantStageType>("one_stage_healing_abutment");
	const [isGbrPerformed, setIsGbrPerformed] = useState<boolean>(false);
	const [lotNumber, setLotNumber] = useState<string>("");
	const [serialNumber, setSerialNumber] = useState<string>("");

	const activeSystem = CANONICAL_IMPLANT_SYSTEMS[systemId] || CANONICAL_IMPLANT_SYSTEMS.osstem;
	const boneDensity: MischBoneDensity = useMemo(() => getMischBoneDensityByToothFdi(toothFdi), [toothFdi]);
	const torqueZone = useMemo(() => getRecommendedTorqueZone(torqueNcm), [torqueNcm]);

	const warrantyPassport: ImplantWarrantyPassportData = useMemo(() => {
		return generateWarrantyPassportRecord({
			toothFdi,
			systemId,
			diameterMm,
			lengthMm,
			torqueNcm,
			isq: isqValue,
			stage,
			patientName,
			patientId,
			doctorName,
			doctorId,
			lotNumber: lotNumber.trim() || undefined,
			serialNumber: serialNumber.trim() || undefined,
		});
	}, [toothFdi, systemId, diameterMm, lengthMm, torqueNcm, isqValue, stage, patientName, patientId, doctorName, doctorId, lotNumber, serialNumber]);

	const soapDiary = useMemo(() => {
		return buildSoapSurgeryDiaryText({
			toothFdi,
			boneDensity,
			brandName: activeSystem.brandName,
			lineName: activeSystem.lineName,
			diameterMm,
			lengthMm,
			torqueNcm,
			isqValue,
			screwdriverAliasRu: activeSystem.screwdriverAliasRu,
			stage,
			isGbrPerformed,
		});
	}, [toothFdi, boneDensity, activeSystem, diameterMm, lengthMm, torqueNcm, isqValue, stage, isGbrPerformed]);

	if (!isOpen) return null;

	const handleSystemChange = (id: CanonicalImplantSystemId) => {
		setSystemId(id);
		const target = CANONICAL_IMPLANT_SYSTEMS[id];
		if (!target.diametersMm.includes(diameterMm)) setDiameterMm(target.defaultDiameterMm);
		if (!target.lengthsMm.includes(lengthMm)) setLengthMm(target.defaultLengthMm);
	};

	const handleApplyTemplate = (tmpl: (typeof SURGICAL_QUICK_TEMPLATES)[number]) => {
		setStage(tmpl.stage);
		setTorqueNcm(tmpl.defaultTorqueNcm);
		setIsqValue(tmpl.defaultIsq);
		setIsGbrPerformed(tmpl.boneGraftRequired);
	};

	const handleCommitProtocol = () => {
		if (onSaveProtocol) onSaveProtocol(warrantyPassport, soapDiary);
		onClose();
	};

	return (
		<div className="implant-passport-modal-backdrop" data-testid="implantology-studio-backdrop">
			<div
				className={`implant-passport-card-container implant-surgical-passport-modal flex flex-col min-h-0 ${className}`.trim()}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				data-testid="implantology-studio-modal"
			>
				<div className="implant-sheet-drag-handle" aria-hidden="true" />

				{/* Шапка студии */}
				<header className="implant-passport-header-bar flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="implant-passport-header-title flex items-center gap-2.5 min-w-0 flex-1 pr-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<Stethoscope size={18} />
						</div>
						<div className="flex-1 min-w-0">
							<h2 id={titleId} className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug">
								Хирургический протокол имплантации · Зуб #{toothFdi}
							</h2>
							<p className="text-[11px] text-[var(--muted)] truncate">Пациент: <span className="font-medium text-[var(--ink)]">{patientName}</span> · {doctorName}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] bg-transparent transition-all cursor-pointer border border-transparent shrink-0"
						aria-label="Закрыть"
						data-testid="btn-close-implant-studio"
					>
						<X size={18} />
					</button>
				</header>

				{/* Табы */}
				<nav className="implant-tabs-nav flex items-center gap-1.5 px-3 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0 overflow-x-auto" role="tablist">
					{STUDIO_TABS.map((t) => {
						const Icon = t.icon;
						const isSel = activeTab === t.id;
						return (
							<button
								key={t.id}
								type="button"
								role="tab"
								aria-selected={isSel}
								onClick={() => setActiveTab(t.id)}
								className={`min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border transition-all shrink-0 whitespace-nowrap ${
									isSel
										? "bg-[var(--paper)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] shadow-xs"
										: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
								}`}
								data-testid={`implant-tab-${t.id}`}
							>
								<Icon size={14} className="shrink-0" />
								<span>{t.id === "protocol" ? `1. Протокол (${torqueNcm} Н·см)` : t.label}</span>
							</button>
						);
					})}
				</nav>

				{/* Контент */}
				<main className="implant-passport-content p-4 overflow-y-auto min-h-0 flex-1 space-y-3.5">
					{activeTab === "protocol" && (
						<div className="space-y-3.5" data-testid="tab-content-protocol">
							{/* 1-клик шаблоны */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] mb-2">
									<Sparkles size={14} className="text-[var(--teal,#0d9488)]" />
									<span>1-клик клинические шаблоны протокола:</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{SURGICAL_QUICK_TEMPLATES.map((tmpl) => (
										<button
											key={tmpl.id}
											type="button"
											onClick={() => handleApplyTemplate(tmpl)}
											className="text-left p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer flex flex-col gap-1 w-full"
											data-testid={`quick-template-${tmpl.id}`}
										>
											<div className="text-xs font-semibold text-[var(--ink)] flex items-center justify-between gap-1 w-full">
												<span className="leading-snug">{tmpl.labelRu}</span>
												<span className="text-[11px] font-mono font-bold text-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">{tmpl.defaultTorqueNcm} Н·см</span>
											</div>
											<div className="text-[11px] text-[var(--muted)] leading-normal line-clamp-2">{tmpl.descriptionRu}</div>
										</button>
									))}
								</div>
							</div>

							{/* Выбор зуба FDI */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
								<div className="flex items-center justify-between">
									<label htmlFor="tooth-fdi-select" className="text-xs font-bold text-[var(--ink)]">Позиция зуба (FDI 11–48):</label>
									<span className="text-xs text-[var(--muted)]">Плотность Misch: <strong className="text-[var(--ink)]">{boneDensity}</strong></span>
								</div>
								<div className="flex flex-wrap gap-1.5 items-center">
									{FDI_SURGICAL_PRESETS.map((fdi) => (
										<button
											key={fdi}
											type="button"
											onClick={() => setToothFdi(fdi)}
											className={`min-h-[36px] min-w-[38px] px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
												toothFdi === fdi
													? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
											}`}
											data-testid={`fdi-chip-${fdi}`}
										>
											#{fdi}
										</button>
									))}
									<div className="flex items-center gap-1.5 ml-auto sm:ml-0">
										<span className="text-[11px] text-[var(--muted)]">Свой:</span>
										<input
											id="tooth-fdi-select"
											type="number"
											min={11}
											max={48}
											value={toothFdi}
											onChange={(e) => setToothFdi(Number(e.target.value) || 46)}
											className="min-h-[36px] w-14 px-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-center"
											data-testid="tooth-fdi-custom-input"
										/>
									</div>
								</div>
							</div>

							{/* Выбор 6 систем РФ */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
								<div className="text-xs font-bold text-[var(--ink)]">Система имплантации (6 стандартов РФ):</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{(Object.keys(CANONICAL_IMPLANT_SYSTEMS) as CanonicalImplantSystemId[]).map((id) => {
										const sys = CANONICAL_IMPLANT_SYSTEMS[id];
										const isSel = systemId === id;
										return (
											<button
												key={id}
												type="button"
												onClick={() => handleSystemChange(id)}
												className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
													isSel
														? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--ink)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
														: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
												}`}
												data-testid={`system-card-${id}`}
											>
												<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
													<span>{sys.brandName}</span>
													{isSel && <Check size={13} className="text-[var(--teal,#0d9488)]" />}
												</div>
												<div className="text-[11px] truncate text-[var(--muted)] font-medium">{sys.lineName}</div>
												<div className="text-[10px] text-[var(--muted)]">{sys.countryRu}</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Диаметр и длина */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
									<div className="text-xs font-bold text-[var(--ink)]">Диаметр (мм):</div>
									<div className="flex flex-wrap gap-1.5">
										{activeSystem.diametersMm.map((d) => (
											<button
												key={d}
												type="button"
												onClick={() => setDiameterMm(d)}
												className={`min-h-[36px] min-w-[42px] px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
													diameterMm === d ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
												}`}
												data-testid={`diameter-chip-${d}`}
											>
												Ø {d}
											</button>
										))}
									</div>
								</div>
								<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
									<div className="text-xs font-bold text-[var(--ink)]">Длина (мм):</div>
									<div className="flex flex-wrap gap-1.5">
										{activeSystem.lengthsMm.map((l) => (
											<button
												key={l}
												type="button"
												onClick={() => setLengthMm(l)}
												className={`min-h-[36px] min-w-[42px] px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
													lengthMm === l ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
												}`}
												data-testid={`length-chip-${l}`}
											>
												{l} мм
											</button>
										))}
									</div>
								</div>
							</div>

							{/* Торк и ISQ */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="text-xs font-bold text-[var(--ink)]">Первичная стабильность (Торк):</div>
									<span className={`text-xs font-bold ${torqueZone.colorClass}`}>{torqueZone.labelRu}</span>
								</div>
								<div className="flex items-center gap-3">
									<input
										type="range"
										min={15}
										max={60}
										step={5}
										value={torqueNcm}
										onChange={(e) => setTorqueNcm(Number(e.target.value))}
										className="flex-1 accent-[var(--teal,#0d9488)] cursor-pointer"
										data-testid="torque-slider"
									/>
									<span className="font-mono text-sm font-bold text-[var(--ink)] w-16 text-right">{torqueNcm} Н·см</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-xs">
									<div className="flex items-center justify-between">
										<span className="text-[var(--muted)]">Коэффициент ISQ:</span>
										<div className="flex items-center gap-1.5">
											<input
												type="number"
												min={40}
												max={90}
												value={isqValue}
												onChange={(e) => setIsqValue(Number(e.target.value) || 70)}
												className="w-14 px-1 py-1 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-center text-[var(--ink)]"
												data-testid="isq-input"
											/>
											<span className="text-[11px] text-[var(--muted)]">ISQ (65–85)</span>
										</div>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-[var(--muted)]">Отвертка:</span>
										<span className="font-semibold text-[var(--ink)] flex items-center gap-1"><Wrench size={12} className="text-[var(--teal,#0d9488)]" />{activeSystem.screwdriverAliasRu}</span>
									</div>
								</div>
							</div>

							{/* Этап и костная пластика */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-2.5">
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setStage("one_stage_healing_abutment")}
										className={`min-h-[36px] px-3 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
											stage === "one_stage_healing_abutment" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
										}`}
										data-testid="stage-healing-abutment"
									>
										Формирователь десны (1-эт.)
									</button>
									<button
										type="button"
										onClick={() => setStage("two_stage_plug")}
										className={`min-h-[36px] px-3 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
											stage === "two_stage_plug" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
										}`}
										data-testid="stage-plug"
									>
										Заглушка (2-эт.)
									</button>
								</div>
								<label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--ink)]">
									<input
										type="checkbox"
										checked={isGbrPerformed}
										onChange={(e) => setIsGbrPerformed(e.target.checked)}
										className="rounded text-[var(--teal,#0d9488)] cursor-pointer"
										data-testid="checkbox-gbr"
									/>
									<span>Костная пластика (GBR)</span>
								</label>
							</div>
						</div>
					)}

					{activeTab === "passport" && (
						<div className="space-y-3.5" data-testid="tab-content-passport">
							<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs space-y-3">
								<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
									<div className="flex items-center gap-2">
										<ShieldCheck size={20} className="text-[var(--teal,#0d9488)]" />
										<div>
											<h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wide">Гарантийный паспорт имплантата</h3>
											<span className="text-[11px] text-[var(--muted)] font-mono">{warrantyPassport.passportId}</span>
										</div>
									</div>
									<div className="text-right">
										<div className="text-[11px] font-bold text-[var(--teal,#0d9488)]">ПОЖИЗНЕННАЯ ГАРАНТИЯ</div>
										<div className="text-[10px] text-[var(--muted)]">Стандарт остеоинтеграции</div>
									</div>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
									<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
										<div className="text-[10px] text-[var(--muted)]">Система:</div>
										<div className="font-bold text-[var(--ink)]">{warrantyPassport.brandName}</div>
									</div>
									<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
										<div className="text-[10px] text-[var(--muted)]">Размер / Зуб:</div>
										<div className="font-bold text-[var(--ink)]">Ø {warrantyPassport.diameterMm} × {warrantyPassport.lengthMm} мм (FDI #{warrantyPassport.toothFdi})</div>
									</div>
									<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
										<div className="text-[10px] text-[var(--muted)]">Лот / Серия:</div>
										<div className="font-mono font-bold text-[var(--ink)] text-[11px]">{warrantyPassport.lotNumber}</div>
									</div>
									<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
										<div className="text-[10px] text-[var(--muted)]">Торк / ISQ:</div>
										<div className="font-bold text-emerald-600 dark:text-emerald-400">{warrantyPassport.insertionTorqueNcm} Н·см · {warrantyPassport.isqValue} ISQ</div>
									</div>
								</div>

								<div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center shadow-xs">
										<svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" aria-label="QR-код">
											<rect width="100" height="100" fill="#ffffff" />
											<rect x="5" y="5" width="25" height="25" fill="#0f172a" />
											<rect x="10" y="10" width="15" height="15" fill="#ffffff" />
											<rect x="14" y="14" width="7" height="7" fill="#0f172a" />
											<rect x="70" y="5" width="25" height="25" fill="#0f172a" />
											<rect x="75" y="10" width="15" height="15" fill="#ffffff" />
											<rect x="79" y="14" width="7" height="7" fill="#0f172a" />
											<rect x="5" y="70" width="25" height="25" fill="#0f172a" />
											<rect x="10" y="75" width="15" height="15" fill="#ffffff" />
											<rect x="14" y="79" width="7" height="7" fill="#0f172a" />
											<rect x="40" y="10" width="10" height="10" fill="#0f172a" />
											<rect x="42" y="35" width="18" height="18" fill="#0f172a" />
											<rect x="70" y="70" width="20" height="20" fill="#0f172a" />
										</svg>
									</div>
									<div className="space-y-1 text-xs min-w-0 flex-1">
										<div className="font-bold text-[var(--ink)] flex items-center gap-1.5"><QrCode size={15} className="text-[var(--teal,#0d9488)]" /><span>Верификация производителя</span></div>
										<p className="text-[11px] text-[var(--muted)]">Срок остеоинтеграции: <strong className="text-[var(--ink)]">{warrantyPassport.expectedOsteointegrationDateIso}</strong>.</p>
										<div className="text-[11px] text-[var(--muted)]">Стоимость для пациента: <strong className="text-[var(--ink)]">{formatKopecksToRubles(warrantyPassport.patientPriceKopecks)}</strong></div>
									</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === "diary" && (
						<div className="space-y-2" data-testid="tab-content-diary">
							<div className="text-xs font-bold text-[var(--ink)]">Протокол SOAP для медицинской карты приёма:</div>
							<textarea readOnly value={soapDiary} rows={9} className="w-full p-3 font-mono text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] leading-relaxed resize-none focus:outline-none" data-testid="textarea-soap-diary" />
						</div>
					)}

					{activeTab === "memo" && (
						<div className="space-y-2" data-testid="tab-content-memo">
							<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 text-xs">
								<div className="font-bold text-[var(--ink)] flex items-center gap-1.5"><HeartHandshake size={16} className="text-[var(--teal,#0d9488)]" /><span>Памятка пациента (зуб #{toothFdi}):</span></div>
								<ul className="list-disc pl-4 space-y-1 text-[var(--muted)]">
									<li>Холод на область операции: 15 минут в первые 3 часа.</li>
									<li>Исключить горячую и грубую пищу на 48 часов.</li>
									<li>Антисептические ротовые ванночки без активного полоскания.</li>
									<li>Контрольный осмотр через 10–14 дней.</li>
								</ul>
							</div>
						</div>
					)}
				</main>

				{/* Подвал — ровно ОДНА Primary CTA кнопка var(--teal) #0d9488 (Мандат 8e, Мандат 8am) */}
				<footer className="implant-passport-actions flex items-center justify-between gap-2.5 p-3 bg-[var(--paper-soft)] border-t border-[var(--line)] shrink-0">
					<div className="text-xs text-[var(--muted)] truncate min-w-0 flex-1 hidden sm:flex items-center gap-2">
						<span className="font-semibold text-[var(--ink)]">{activeSystem.brandName}</span>
						<span>Ø {diameterMm} × {lengthMm} мм</span>
						<span className="text-[var(--line-strong,#94a3b8)]">|</span>
						<span>{torqueNcm} Н·см</span>
						<span className="text-[var(--line-strong,#94a3b8)]">|</span>
						<span className="font-mono text-[11px]">{activeSystem.screwdriverType}</span>
					</div>

					<div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={() => typeof window !== "undefined" && window.print()}
							className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 sm:px-3.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-[0.98] transition-all shrink-0"
							data-testid="btn-print-passport-a5"
							title="Печать паспорта А5"
						>
							<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="hidden sm:inline">Печать паспорта А5</span>
							<span className="sm:hidden">Печать А5</span>
						</button>

						<button
							type="button"
							onClick={handleCommitProtocol}
							className="primary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 sm:px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer bg-[var(--teal,#0d9488)] text-white hover:bg-[#0f766e] active:scale-[0.98] shadow-sm transition-all whitespace-nowrap"
							data-testid="btn-save-implant-protocol"
						>
							<Check size={15} className="shrink-0" />
							<span className="hidden sm:inline">Зафиксировать протокол имплантации</span>
							<span className="sm:hidden">Зафиксировать</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ImplantologyStudioModal;
