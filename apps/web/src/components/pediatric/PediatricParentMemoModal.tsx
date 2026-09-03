import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	Check,
	Copy,
	FileText,
	Heart,
	Printer,
	ShieldCheck,
	Sparkles,
	Zap,
	X,
} from "lucide-react";
import {
	type FranklRating,
	type PediatricSilveringOptions,
	type PediatricFissureSealingOptions,
	type PediatricPulpotomyOptions,
	type PediatricTwinkyStarOptions,
	type TwinkyStarColor,
	TWINKY_STAR_COLORS,
	generatePediatricParentRecommendations,
	calculatePediatricSilveringProtocol,
	calculatePediatricFissureSealingProtocol,
	calculatePediatricPulpotomyProtocol,
	calculatePediatricTwinkyStarProtocol,
} from "../odontogram/pediatricDentitionEngine";
import { showToast } from "../GlobalToast";

export interface PediatricParentMemoModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	patientAgeYears?: number | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	initialFrankl?: FranklRating | undefined;
	initialSilvering?: PediatricSilveringOptions | undefined;
	initialFissureSealing?: PediatricFissureSealingOptions | undefined;
	initialPulpotomy?: PediatricPulpotomyOptions | undefined;
	initialTwinkyStar?: PediatricTwinkyStarOptions | undefined;
	autoPrint?: boolean | undefined;
}

export const PediatricParentMemoModal: React.FC<PediatricParentMemoModalProps> = ({
	isOpen,
	onClose,
	patientName = "Юный пациент",
	patientAgeYears = 7,
	doctorName = "Врач-стоматолог детский",
	clinicName = "Детское отделение DENTE",
	initialFrankl = 3,
	initialSilvering,
	initialFissureSealing,
	initialPulpotomy,
	initialTwinkyStar,
	autoPrint = false,
}) => {
	const [frankl, setFrankl] = useState<FranklRating>(initialFrankl);
	const [hasPulpotomy, setHasPulpotomy] = useState<boolean>(Boolean(initialPulpotomy));
	const [pulpotomyTooth, setPulpotomyTooth] = useState<number>(initialPulpotomy?.toothNumber ?? 54);
	const [hasFissureSealing, setHasFissureSealing] = useState<boolean>(Boolean(initialFissureSealing));
	const [fissureTeeth, setFissureTeeth] = useState<string>(
		(initialFissureSealing?.teethNumbers ?? [16, 26, 36, 46]).join(", "),
	);
	const [hasSilvering, setHasSilvering] = useState<boolean>(Boolean(initialSilvering));
	const [silveringTeeth, setSilveringTeeth] = useState<string>(
		(initialSilvering?.teethNumbers ?? [51, 52, 61, 62]).join(", "),
	);
	const [hasTwinkyStar, setHasTwinkyStar] = useState<boolean>(Boolean(initialTwinkyStar));
	const [twinkyTooth, setTwinkyTooth] = useState<number>(initialTwinkyStar?.toothNumber ?? 54);
	const [twinkyColor, setTwinkyColor] = useState<TwinkyStarColor>(initialTwinkyStar?.color ?? "blue");
	const [customNotes, setCustomNotes] = useState<string>("");

	const generatedMemoText = useMemo(() => {
		const parsedFissureTeeth = fissureTeeth
			.split(",")
			.map((s) => Number.parseInt(s.trim(), 10))
			.filter((n) => !Number.isNaN(n));

		const parsedSilveringTeeth = silveringTeeth
			.split(",")
			.map((s) => Number.parseInt(s.trim(), 10))
			.filter((n) => !Number.isNaN(n));

		return generatePediatricParentRecommendations({
			patientName,
			patientAgeYears,
			clinicName,
			doctorName,
			franklRating: frankl,
			pulpotomy: hasPulpotomy ? { toothNumber: pulpotomyTooth } : undefined,
			fissureSealing: hasFissureSealing
				? { teethNumbers: parsedFissureTeeth.length > 0 ? parsedFissureTeeth : [16, 26, 36, 46] }
				: undefined,
			silvering: hasSilvering
				? { teethNumbers: parsedSilveringTeeth.length > 0 ? parsedSilveringTeeth : [51, 52, 61, 62] }
				: undefined,
			twinkyStar: hasTwinkyStar
				? { toothNumber: twinkyTooth, color: twinkyColor, patientAgeYears }
				: undefined,
			customNotes: customNotes.trim() || undefined,
		});
	}, [
		patientName,
		patientAgeYears,
		clinicName,
		doctorName,
		frankl,
		hasPulpotomy,
		pulpotomyTooth,
		hasFissureSealing,
		fissureTeeth,
		hasSilvering,
		silveringTeeth,
		hasTwinkyStar,
		twinkyTooth,
		twinkyColor,
		customNotes,
	]);

	const executePrint = (memoText: string) => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна для печати памятки", "error");
			return;
		}
		printWindow.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="UTF-8">
				<title>Памятка для родителей — ${patientName}</title>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.6; }
					pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; background: #f8fafc; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
					@media print { pre { border: none; background: transparent; padding: 0; } }
				</style>
			</head>
			<body>
				<pre>${memoText}</pre>
				<script>window.print(); window.close();</script>
			</body>
			</html>
		`);
		printWindow.document.close();
		showToast("Памятка для родителей отправлена на печать", "success");
	};

	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(generatedMemoText);
			showToast("Памятка для родителей скопирована в буфер обмена!", "success");
		} catch {
			showToast("Не удалось скопировать текст памятки", "error");
		}
	};

	const handlePrint = () => {
		executePrint(generatedMemoText);
	};

	// 1-Click Fast Procedure Presets & Immediate Print
	const handle1ClickPresetPrint = (procedure: "silvering" | "fissure" | "pulpotomy" | "twinkyStar") => {
		let text = "";
		if (procedure === "silvering") {
			setHasSilvering(true);
			text = generatePediatricParentRecommendations({
				patientName,
				patientAgeYears,
				clinicName,
				doctorName,
				franklRating: frankl,
				silvering: { teethNumbers: [51, 52, 61, 62] },
			});
		} else if (procedure === "fissure") {
			setHasFissureSealing(true);
			text = generatePediatricParentRecommendations({
				patientName,
				patientAgeYears,
				clinicName,
				doctorName,
				franklRating: frankl,
				fissureSealing: { teethNumbers: [16, 26, 36, 46] },
			});
		} else if (procedure === "pulpotomy") {
			setHasPulpotomy(true);
			text = generatePediatricParentRecommendations({
				patientName,
				patientAgeYears,
				clinicName,
				doctorName,
				franklRating: frankl,
				pulpotomy: { toothNumber: pulpotomyTooth || 54 },
			});
		} else if (procedure === "twinkyStar") {
			setHasTwinkyStar(true);
			text = generatePediatricParentRecommendations({
				patientName,
				patientAgeYears,
				clinicName,
				doctorName,
				franklRating: frankl,
				twinkyStar: { toothNumber: twinkyTooth || 54, color: twinkyColor },
			});
		}
		executePrint(text);
	};

	useEffect(() => {
		if (autoPrint && isOpen) {
			const timer = setTimeout(() => {
				executePrint(generatedMemoText);
			}, 350);
			return () => clearTimeout(timer);
		}
	}, [autoPrint, isOpen]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pediatric-parent-memo-title"
		>
			<div
				className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] rounded-3xl border border-[var(--odontogram-border,var(--line,#cbd5e1))] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-5 sm:px-8 border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] border border-[var(--teal-glow,rgba(20,184,166,0.25))] shrink-0 shadow-inner">
							<Heart className="w-6 h-6 text-rose-500" />
						</div>
						<div>
							<h2
								id="pediatric-parent-memo-title"
								className="text-lg sm:text-xl font-black tracking-tight text-[var(--odontogram-ink,var(--ink,#0f172a))]"
							>
								Памятка для родителей после приема
							</h2>
							<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium">
								Печать и отправка рекомендаций по уходу, обезболиванию и профилактике
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] transition-all cursor-pointer flex items-center justify-center"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
					{/* 1-Click Fast Presets & Print Bar */}
					<div className="p-3.5 sm:p-4 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Zap className="w-4 h-4 text-amber-500 shrink-0" />
							<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
								Печать памятки родителям в 1 клик:
							</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => handle1ClickPresetPrint("silvering")}
								className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
								title="1-клик печать памятки по серебрению (SDF)"
								data-testid="memo-quick-silvering-btn"
							>
								<Printer className="w-3.5 h-3.5 text-amber-600" />
								<span>Серебрение (SDF)</span>
							</button>
							<button
								type="button"
								onClick={() => handle1ClickPresetPrint("fissure")}
								className="min-h-[36px] px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-900 dark:text-teal-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
								title="1-клик печать памятки по герметизации фиссур"
								data-testid="memo-quick-fissure-btn"
							>
								<Printer className="w-3.5 h-3.5 text-teal-600" />
								<span>Герметизация</span>
							</button>
							<button
								type="button"
								onClick={() => handle1ClickPresetPrint("pulpotomy")}
								className="min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
								title="1-клик печать памятки по пульпотомии (контроль анестезии)"
								data-testid="memo-quick-pulpotomy-btn"
							>
								<Printer className="w-3.5 h-3.5 text-rose-600" />
								<span>Пульпотомия</span>
							</button>
							<button
								type="button"
								onClick={() => handle1ClickPresetPrint("twinkyStar")}
								className="min-h-[36px] px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-900 dark:text-indigo-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
								title="1-клик печать памятки по цветной пломбе Twinky Star"
								data-testid="memo-quick-twinky-btn"
							>
								<Sparkles className="w-3.5 h-3.5 text-indigo-600" />
								<span>Twinky Star</span>
							</button>
						</div>
					</div>

					{/* Procedure Checkboxes */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						<label
							className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
								hasPulpotomy
									? "border-rose-500 bg-rose-500/10 shadow-xs"
									: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]"
							}`}
						>
							<input
								type="checkbox"
								checked={hasPulpotomy}
								onChange={(e) => setHasPulpotomy(e.target.checked)}
								className="accent-rose-500 w-5 h-5 mt-0.5 rounded cursor-pointer shrink-0"
							/>
							<div className="space-y-1">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Пульпотомия (ампутация)
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Анестезия, прикус губы, нурофен
								</div>
							</div>
						</label>

						<label
							className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
								hasFissureSealing
									? "border-teal-500 bg-teal-500/10 shadow-xs"
									: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]"
							}`}
						>
							<input
								type="checkbox"
								checked={hasFissureSealing}
								onChange={(e) => setHasFissureSealing(e.target.checked)}
								className="accent-teal-500 w-5 h-5 mt-0.5 rounded cursor-pointer shrink-0"
							/>
							<div className="space-y-1">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Герметизация фиссур
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Диета 2 часа, контроль силанта
								</div>
							</div>
						</label>

						<label
							className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
								hasSilvering
									? "border-amber-500 bg-amber-500/10 shadow-xs"
									: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]"
							}`}
						>
							<input
								type="checkbox"
								checked={hasSilvering}
								onChange={(e) => setHasSilvering(e.target.checked)}
								className="accent-amber-500 w-5 h-5 mt-0.5 rounded cursor-pointer shrink-0"
							/>
							<div className="space-y-1">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Серебрение (SDF)
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Темное окрашивание, курс
								</div>
							</div>
						</label>

						<label
							className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
								hasTwinkyStar
									? "border-indigo-500 bg-indigo-500/10 shadow-xs"
									: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]"
							}`}
						>
							<input
								type="checkbox"
								checked={hasTwinkyStar}
								onChange={(e) => setHasTwinkyStar(e.target.checked)}
								className="accent-indigo-500 w-5 h-5 mt-0.5 rounded cursor-pointer shrink-0"
							/>
							<div className="space-y-1">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Цветная пломба Twinky
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Фтор-компомер, яркий цвет
								</div>
							</div>
						</label>
					</div>

					{/* Parameters Setup */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-xs sm:text-sm">
						{hasPulpotomy && (
							<div className="space-y-1.5">
								<label className="font-bold block text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Зуб пульпотомии (FDI):
								</label>
								<input
									type="number"
									value={pulpotomyTooth}
									onChange={(e) => setPulpotomyTooth(Number(e.target.value))}
									className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-sm font-bold font-mono"
								/>
							</div>
						)}

						{hasFissureSealing && (
							<div className="space-y-1.5">
								<label className="font-bold block text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Зубы герметизации:
								</label>
								<input
									type="text"
									value={fissureTeeth}
									onChange={(e) => setFissureTeeth(e.target.value)}
									className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-sm font-bold font-mono"
								/>
							</div>
						)}

						{hasSilvering && (
							<div className="space-y-1.5">
								<label className="font-bold block text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Зубы серебрения:
								</label>
								<input
									type="text"
									value={silveringTeeth}
									onChange={(e) => setSilveringTeeth(e.target.value)}
									className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-sm font-bold font-mono"
								/>
							</div>
						)}

						{hasTwinkyStar && (
							<div className="space-y-1.5">
								<label className="font-bold block text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Пломба Twinky (зуб #{twinkyTooth}):
								</label>
								<div className="flex items-center gap-1">
									<input
										type="number"
										value={twinkyTooth}
										onChange={(e) => setTwinkyTooth(Number(e.target.value))}
										className="w-20 min-h-[44px] px-2.5 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-sm font-bold font-mono"
									/>
									<select
										value={twinkyColor}
										onChange={(e) => setTwinkyColor(e.target.value as TwinkyStarColor)}
										className="flex-1 min-h-[44px] px-2 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-xs font-bold"
									>
										{(Object.keys(TWINKY_STAR_COLORS) as TwinkyStarColor[]).map((c) => (
											<option key={c} value={c}>
												{TWINKY_STAR_COLORS[c].emoji} {TWINKY_STAR_COLORS[c].labelRu}
											</option>
										))}
									</select>
								</div>
							</div>
						)}
					</div>

					{/* Live Memo Preview Box */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
								Текст памятки для печати / отправки в мессенджер
							</h4>
						</div>
						<pre className="w-full p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-xs sm:text-sm font-mono text-[var(--odontogram-ink,var(--ink,#0f172a))] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[320px]">
							{generatedMemoText}
						</pre>
					</div>
				</div>

				{/* Footer Controls */}
				<div className="flex flex-col sm:flex-row items-center justify-end gap-3 p-5 sm:px-8 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]">
					<button
						type="button"
						onClick={handleCopyText}
						className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-2xl border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
					>
						<Copy className="w-4 h-4" />
						<span>Копировать текст</span>
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
					>
						<Printer className="w-4 h-4" />
						<span>Распечатать памятку</span>
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
