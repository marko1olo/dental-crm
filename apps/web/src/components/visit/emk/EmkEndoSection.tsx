import React from "react";
import { ChevronDown, FileText, Zap, Compass, Sparkles } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { formatEndoProtocolQuickSnippet } from "../../../lib/clinicalProtocols043";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import { loadPersistedEndoCanals } from "../../radiology/endoClinicalIntegrationBridge";

export interface EmkEndoSectionProps extends EmkSectionProps {
	onOpenEndoModal?: () => void;
}

export function EmkEndoSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activeTooth,
	onOpenEndoModal,
}: EmkEndoSectionProps) {
	const [selectedEndoCanalKey, setSelectedEndoCanalKey] = React.useState<string>("MB1");
	const [endoRefPoint, setEndoRefPoint] = React.useState<string>("Щечный бугор");
	const [endoWorkingLengthMm, setEndoWorkingLengthMm] = React.useState<number>(21.5);
	const [endoMasterFile, setEndoMasterFile] = React.useState<string>("#25");
	const [endoTaper, setEndoTaper] = React.useState<string>(".06");
	const [endoSealer, setEndoSealer] = React.useState<string>("AH Plus");
	const [endoObturation, setEndoObturation] = React.useState<string>("Латеральная компакция");
	const [cbct3dCanals, setCbct3dCanals] = React.useState<any[] | null>(null);

	const targetToothNum = React.useMemo(() => {
		const parsed = Number(activeTooth);
		return Number.isNaN(parsed) || parsed <= 0 ? 16 : parsed;
	}, [activeTooth]);

	React.useEffect(() => {
		const checkPersisted = () => {
			const persisted = loadPersistedEndoCanals(visitNoteForm?.patientId, targetToothNum);
			setCbct3dCanals(persisted);
		};
		checkPersisted();

		const handleUpdate = (e: Event) => {
			const custom = e as CustomEvent<{ toothFdi?: number; canals?: any[] }>;
			if (!custom.detail?.toothFdi || custom.detail.toothFdi === targetToothNum) {
				checkPersisted();
			}
		};
		window.addEventListener("dente-endo-canals-updated", handleUpdate);
		return () => window.removeEventListener("dente-endo-canals-updated", handleUpdate);
	}, [targetToothNum, visitNoteForm?.patientId]);

	const canalsList = [
		{ key: "MB1", name: "МБ-1 (MB1)", ref: "Щечный бугор", defWl: 21.5, defMaf: "#25", defTaper: ".06" },
		{ key: "MB2", name: "МБ-2 (MB2)", ref: "Щечный бугор", defWl: 20.0, defMaf: "#20", defTaper: ".04" },
		{ key: "DB", name: "ДБ (DB)", ref: "Дистально-щечный бугор", defWl: 20.5, defMaf: "#25", defTaper: ".06" },
		{ key: "P", name: "Нёбный (P)", ref: "Нёбный бугор", defWl: 22.0, defMaf: "#30", defTaper: ".06" },
		{ key: "D", name: "Дистальный (D)", ref: "Дистальный бугор", defWl: 22.0, defMaf: "#30", defTaper: ".06" },
		{ key: "MB", name: "Медиально-щечный (MB)", ref: "Щечный бугор", defWl: 21.5, defMaf: "#25", defTaper: ".06" },
		{ key: "ML", name: "Медиально-язычный (ML)", ref: "Медиально-язычный бугор", defWl: 21.0, defMaf: "#25", defTaper: ".06" },
	];

	const handleApplyEndoToPlan = () => {
		if (!updateVisitNoteField) return;
		const curr = visitNoteForm?.treatmentPlan || "";
		const targetTooth =
			activeTooth ||
			(typeof visitNoteForm?.diagnosis === "string"
				? visitNoteForm.diagnosis.match(/\b([1-4][1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/)?.[0]
				: null) ||
			16;

		const endoText = formatEndoProtocolQuickSnippet({
			toothNumber: targetTooth,
			canals: [
				{
					canalName: selectedEndoCanalKey,
					referencePoint: endoRefPoint,
					workingLengthMm: endoWorkingLengthMm,
					masterApicalFile: endoMasterFile,
					taper: endoTaper,
					obturationTechnique: endoObturation,
					sealer: endoSealer,
				},
			],
			sealer: endoSealer,
			obturationTechnique: endoObturation,
		});

		updateVisitNoteField("treatmentPlan", appendClinicalText(curr, endoText, "\n\n"));
		showToast(
			`Эндо-протокол (Канал ${selectedEndoCanalKey}, ${endoWorkingLengthMm} мм) внесен в карту`,
			"success",
			3000,
		);
	};

	return (
		<details className="group border-t border-[var(--line)] pt-2 bg-transparent overflow-hidden">
			<summary className="flex items-center justify-between py-2 px-1 cursor-pointer font-bold text-xs sm:text-sm select-none list-none text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors">
				<div className="flex items-center gap-2">
					<span className="w-6 h-6 rounded-md bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] flex items-center justify-center text-xs">
						<Zap className="w-3.5 h-3.5" />
					</span>
					<span>
						Эндодонтия: Учет каналов, апекслокация, мастер-файлы и силеры ({selectedEndoCanalKey},{" "}
						{endoWorkingLengthMm} мм)
					</span>
				</div>
				<ChevronDown
					size={16}
					className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180"
				/>
			</summary>
			<div className="py-2.5 px-1 flex flex-col gap-3 border-t border-[var(--line)]/50">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<span className="text-xs text-[var(--muted)]">
						Эндодонтический протокол • Обработка и обтурация каналов
					</span>
					{onOpenEndoModal && (
						<button
							type="button"
							onClick={onOpenEndoModal}
							className="min-h-[32px] h-8 px-3 py-1 text-xs font-extrabold rounded-lg bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
							data-testid="btn-open-full-endo-modal"
						>
							<FileText size={14} />
							<span>Интерактивный журнал каналов</span>
						</button>
					)}
				</div>

				{cbct3dCanals && cbct3dCanals.length > 0 && (
					<div
						className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-between gap-2 text-xs text-cyan-200"
						data-testid="emk-cbct-3d-channels-banner"
					>
						<div className="flex items-center gap-2 font-medium">
							<Compass className="w-4 h-4 text-cyan-400 shrink-0" />
							<span>
								Обнаружен расчет 3D КЛКТ Компаса ({cbct3dCanals.length} к. для зуба #{targetToothNum})
							</span>
						</div>
						<button
							type="button"
							onClick={() => {
								const first = cbct3dCanals[0];
								if (first) {
									setSelectedEndoCanalKey(first.canalName);
									if (first.workingLengthMm) setEndoWorkingLengthMm(Number(first.workingLengthMm));
									if (first.taper) setEndoTaper(first.taper);
									if (first.masterApicalFile) setEndoMasterFile(first.masterApicalFile);
									showToast(`Параметры канала ${first.canalName} (WL=${first.workingLengthMm} мм) подгружены из 3D КЛКТ!`, "success");
								}
							}}
							className="px-2.5 py-1 rounded bg-cyan-800 hover:bg-cyan-700 text-cyan-100 font-semibold border border-cyan-600 transition-colors cursor-pointer shrink-0 text-xs"
							data-testid="emk-apply-cbct-channel-btn"
						>
							Загрузить 3D WL
						</button>
					</div>
				)}

				{/* 1. Выбор анатомического корневого канала */}
				<div className="space-y-1.5">
					<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
						1. Анатомический корневой канал:
					</label>
					<div className="flex flex-wrap gap-1.5">
						{canalsList.map((c) => (
							<button
								key={c.key}
								type="button"
								onClick={() => {
									setSelectedEndoCanalKey(c.key);
									setEndoRefPoint(c.ref);
									setEndoWorkingLengthMm(c.defWl);
									setEndoMasterFile(c.defMaf);
									setEndoTaper(c.defTaper);
								}}
								className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
									selectedEndoCanalKey === c.key
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
								data-testid={`btn-endo-canal-${c.key}`}
							>
								{c.name}
							</button>
						))}
					</div>
				</div>

				{/* 2. Рабочая длина по апекслокатору (WL) и мастер-файл (MAF) */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<div className="space-y-1.5">
						<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between">
							<span>2. Длина по апекслокатору (WL):</span>
							<strong className="text-[var(--teal,var(--brand-primary))] font-mono text-xs">
								{endoWorkingLengthMm} мм (Apex 0.0)
							</strong>
						</label>
						<div className="flex items-center gap-2">
							<input
								type="range"
								min={15}
								max={28}
								step={0.5}
								value={endoWorkingLengthMm}
								onChange={(e) => setEndoWorkingLengthMm(parseFloat(e.target.value) || 21.5)}
								className="w-full accent-[var(--teal,var(--brand-primary))] cursor-pointer"
								data-testid="input-endo-wl-slider"
							/>
							<input
								type="number"
								min={15}
								max={28}
								step={0.5}
								value={endoWorkingLengthMm}
								onChange={(e) => setEndoWorkingLengthMm(parseFloat(e.target.value) || 21.5)}
								className="w-16 min-h-[32px] h-8 px-2 py-1 text-xs font-bold text-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								data-testid="input-endo-wl-num"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
							3. Мастер-файл (MAF) и конусность:
						</label>
						<div className="flex flex-wrap gap-1.5">
							{[
								{ maf: "#20", taper: ".04" },
								{ maf: "#25", taper: ".04" },
								{ maf: "#25", taper: ".06" },
								{ maf: "#30", taper: ".04" },
								{ maf: "#30", taper: ".06" },
								{ maf: "#35", taper: ".06" },
								{ maf: "#40", taper: ".06" },
							].map((opt) => {
								const isSel = endoMasterFile === opt.maf && endoTaper === opt.taper;
								return (
									<button
										key={`${opt.maf}-${opt.taper}`}
										type="button"
										onClick={() => {
											setEndoMasterFile(opt.maf);
											setEndoTaper(opt.taper);
										}}
										className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
											isSel
												? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
												: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
										}`}
										data-testid={`btn-maf-${opt.maf.replace("#", "")}-${opt.taper.replace(".", "")}`}
									>
										{opt.maf}/{opt.taper}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* 4. Силеры и метод обтурации */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<div className="space-y-1.5">
						<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
							4. Эндодонтический силер:
						</label>
						<div className="flex flex-wrap gap-1.5">
							{[
								{ key: "AH Plus", label: "AH Plus" },
								{ key: "BioRoot RCS", label: "BioRoot RCS" },
								{ key: "TotalFill BC", label: "TotalFill BC" },
								{ key: "Каласепт", label: "Каласепт" },
							].map((s) => (
								<button
									key={s.key}
									type="button"
									onClick={() => setEndoSealer(s.key)}
									className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
										endoSealer === s.key
											? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
									}`}
									data-testid={`btn-sealer-${s.key.replace(/\s+/g, "")}`}
								>
									{s.label}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
							5. Метод обтурации:
						</label>
						<div className="flex flex-wrap gap-1.5">
							{[
								{ key: "Латеральная компакция", label: "Латеральная" },
								{ key: "Вертикальная конденсация", label: "Вертикальная" },
								{ key: "Моноштифт + Биокерамика", label: "Моноштифт" },
								{ key: "Непрерывная волна", label: "Непрерывная волна" },
							].map((m) => (
								<button
									key={m.key}
									type="button"
									onClick={() => setEndoObturation(m.key)}
									className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[32px] h-8 ${
										endoObturation === m.key
											? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
									}`}
									data-testid={`btn-obturation-${m.key.slice(0, 5)}`}
								>
									{m.label}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Внесение в протокол лечения */}
				<div className="pt-3 border-t border-[var(--line)] bg-transparent flex items-center justify-between gap-3 flex-wrap">
					<div className="text-xs text-[var(--muted)]">
						Канал <strong>{selectedEndoCanalKey}</strong> ({endoRefPoint}): WL ={" "}
						<strong>{endoWorkingLengthMm} мм</strong>, MAF ={" "}
						<strong>
							{endoMasterFile}/{endoTaper}
						</strong>
						, Обтурация:{" "}
						<strong>
							{endoObturation} + {endoSealer}
						</strong>
					</div>
					<button
						type="button"
						onClick={handleApplyEndoToPlan}
						className="min-h-[32px] sm:min-h-[34px] h-8 sm:h-8.5 px-3 py-1 text-xs sm:text-sm font-extrabold rounded-lg bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-2xs active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 touch-manipulation"
						data-testid="btn-apply-endo-to-plan"
					>
						<Zap className="w-3.5 h-3.5" />
						<span>+ Внести эндо-протокол в дневник</span>
					</button>
				</div>
			</div>
		</details>
	);
}
