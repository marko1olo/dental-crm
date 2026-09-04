import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Check,
	Copy,
	FileText,
	Heart,
	Info,
	Printer,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import {
	type FranklRating,
	type PediatricSilveringOptions,
	type PediatricFissureSealingOptions,
	type PediatricPulpotomyOptions,
	generatePediatricParentRecommendations,
	calculatePediatricSilveringProtocol,
	calculatePediatricFissureSealingProtocol,
	calculatePediatricPulpotomyProtocol,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
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
	onApplyFrankl?: ((rating: FranklRating, note?: string) => void) | undefined;
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
	onApplyFrankl,
}) => {
	const [frankl, setFrankl] = useState<FranklRating>(initialFrankl);
	const [hasAnesthesia, setHasAnesthesia] = useState<boolean>(true);
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

		const baseText = generatePediatricParentRecommendations({
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
			customNotes: customNotes.trim() || undefined,
		});

		if (!hasAnesthesia) {
			return baseText;
		}

		const anesthesiaSection = [
			"",
			"───────────────────────────────────────────────────────────────",
			"⚠️ ВНИМАНИЕ РОДИТЕЛЯМ: ПАМЯТКА ПОСЛЕ МЕСТНОЙ АНЕСТЕЗИИ:",
			"• Онемение губы, щеки и языка сохраняется в течение 2–3 часов после лечения.",
			"• КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: давать ребенку прикусывать, жевать или тереть онемевшую губу!",
			"  Из-за отсутствия болевой чувствительности ребенок может сильно травмировать мягкие ткани",
			"  вплоть до глубокого изъязвления и обширного отека.",
			"• ПИТАНИЕ: не кормить ребенка твердой и горячей пищей до полного восстановления чувствительности.",
			"  Разрешено только теплое питье через трубочку, бульон или мягкий йогурт.",
			"• ОБЕЗБОЛИВАНИЕ: при возникновении ноющего дискомфорта после отхода заморозки дайте детский",
			"  обезболивающий препарат (Ибупрофен / Парацетамол) строго по весу ребенка.",
			"• ГИГИЕНА МОЛОЧНЫХ ЗУБОВ: чистить зубы 2 раза в день. До 8–9 лет родители ОБЯЗАТЕЛЬНО",
			"  дочищают зубы ребенку сами мягкой щеткой с возрастной фторидной пастой (1000–1450 ppm).",
		].join("\n");

		return `${baseText}\n${anesthesiaSection}`;
	}, [
		patientName,
		patientAgeYears,
		clinicName,
		doctorName,
		frankl,
		hasAnesthesia,
		hasPulpotomy,
		pulpotomyTooth,
		hasFissureSealing,
		fissureTeeth,
		hasSilvering,
		silveringTeeth,
		customNotes,
	]);

	const handleOneClickPositiveBehavior = () => {
		setFrankl(4);
		const noteText = "⚡ Поведение ребенка на приеме абсолютно позитивное (Frankl 4/4), психологическая адаптация успешна, лечение выполнено в полном объеме без удержания. Ребенок спокоен, доброжелателен, страха перед стоматологом нет.";
		setCustomNotes(noteText);
		setHasAnesthesia(true);
		onApplyFrankl?.(4, noteText);
		showToast("⚡ 1-клик: Поведение Frankl 4/4 и успешная адаптация применены!", "success");
	};

	const handleOneClickAnesthesiaMemo = () => {
		setHasAnesthesia(true);
		showToast("⚡ Памятка по анестезии, защите губы и гигиене сформирована!", "success");
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
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна в браузере для печати памятки", "error");
			return;
		}
		printWindow.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="UTF-8">
				<title>Памятка для родителей — ${patientName}</title>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.6; max-width: 800px; margin: 0 auto; }
					.header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
					.title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
					.clinic { font-size: 13px; color: #0d9488; font-weight: 700; margin-top: 2px; }
					.meta { font-size: 13px; color: #475569; margin-bottom: 16px; line-height: 1.5; }
					.alert-box { background: #fff1f2; border: 2px solid #f43f5e; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; }
					.alert-title { font-weight: 800; color: #e11d48; font-size: 14px; margin-bottom: 6px; text-transform: uppercase; }
					.alert-text { font-size: 13px; color: #9f1239; margin: 0; line-height: 1.5; }
					pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
					@media print { body { padding: 0; } pre { background: transparent; border: 1px solid #cbd5e1; } }
				</style>
			</head>
			<body>
				<div class="header">
					<div>
						<div class="title">Памятка для родителей после приема</div>
						<div class="clinic">${clinicName}</div>
					</div>
					<div style="text-align: right; font-size: 12px; color: #64748b;">
						${new Date().toLocaleDateString("ru-RU")}
					</div>
				</div>
				<div class="meta">
					<strong>Пациент:</strong> ${patientName}, ${patientAgeYears} лет &bull; <strong>Врач:</strong> ${doctorName}
				</div>
				${hasAnesthesia ? `
					<div class="alert-box">
						<div class="alert-title">⚠️ ВНИМАНИЕ: МЕСТНАЯ АНЕСТЕЗИЯ (НЕ КУСАТЬ ГУБУ!)</div>
						<div class="alert-text">
							Губа, щека и язык онемели на 2–3 часа. <strong>Категорически запретите ребенку прикусывать, жевать или тереть онемевшую губу!</strong><br/>
							Не кормите ребенка твердой и горячей пищей до полного восстановления чувствительности. Разрешено теплое питье через трубочку.<br/>
							При дискомфорте после отхода анестезии: детский Нурофен/Парацетамол строго по весу.
						</div>
					</div>
				` : ""}
				<pre>${generatedMemoText}</pre>
				<script>window.print(); window.close();</script>
			</body>
			</html>
		`);
		printWindow.document.close();
	};

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

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
							title="Мгновенная печать памятки без блокирующих вопросов (1 клик)"
						>
							<Printer className="w-4 h-4" />
							<span className="hidden sm:inline">⚡ 1-клик Печать</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] transition-all cursor-pointer flex items-center justify-center"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
					{/* ⚡ 1-Клик Экспресс-Пресеты (Мандат 8e: 0 лишних кликов) */}
					<div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 space-y-3 shadow-xs">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-2">
								<Zap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
									⚡ Экспресс-заполнение в 1 клик (Стандарт детского приема)
								</span>
							</div>
							<span className="text-[11px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium">
								Печать и адаптация без блокирующих вопросов
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<button
								type="button"
								onClick={handleOneClickPositiveBehavior}
								className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 font-bold text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.99] select-none ${
									frankl === 4
										? "bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
										: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] hover:bg-emerald-500/10 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))]"
								}`}
								title="Поведение ребенка позитивное (Frankl 4/4), адаптация успешна, лечение без удержания"
							>
								<span className="flex items-center gap-2 text-left truncate">
									<Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
									<span className="truncate">⚡ 1-клик: Поведение позитивное (Frankl 4/4), адаптация успешна, лечение без удержания</span>
								</span>
								{frankl === 4 ? (
									<span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
										<Check className="w-3.5 h-3.5 text-emerald-600" />
										4/4
									</span>
								) : (
									<span className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))] shrink-0">Выбрать</span>
								)}
							</button>

							<button
								type="button"
								onClick={handleOneClickAnesthesiaMemo}
								className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 font-bold text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.99] select-none ${
									hasAnesthesia
										? "bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs"
										: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] hover:bg-amber-500/10 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))]"
								}`}
								title="Включить памятку родителям после анестезии: не кусать губу, щадящая диета, гигиена молочных зубов"
							>
								<span className="flex items-center gap-2 text-left truncate">
									<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
									<span className="truncate">⚡ 1-клик: Памятка родителям (после анестезии, не кусать губу, гигиена)</span>
								</span>
								{hasAnesthesia && (
									<span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300 shrink-0 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">
										<Check className="w-3.5 h-3.5 text-amber-600" />
										Вкл
									</span>
								)}
							</button>
						</div>
					</div>

					{/* Психологический статус ребенка (Шкала Франкла 1..4) */}
					<div className="space-y-2 p-3.5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))]">
						<div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">
							<span className="flex items-center gap-1.5">
								<Heart className="w-4 h-4 text-rose-500 shrink-0" />
								<span>Шкала поведения Франкла (Frankl Scale):</span>
							</span>
							<span className="font-extrabold text-teal-700 dark:text-teal-300">
								{getFranklDefinition(frankl).nameRu} ({frankl}/4) {getFranklDefinition(frankl).emoji}
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{([1, 2, 3, 4] as const).map((r) => {
								const def = FRANKL_SCALE_DEFINITIONS[r];
								const isSel = frankl === r;
								return (
									<button
										key={r}
										type="button"
										onClick={() => {
											setFrankl(r);
											onApplyFrankl?.(r);
										}}
										className={`min-h-[44px] px-3 py-2 rounded-xl border-2 flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm cursor-pointer transition-all ${
											isSel
												? "ring-2 shadow-xs scale-[1.01]"
												: "opacity-80 hover:opacity-100 bg-[var(--odontogram-paper,var(--paper,#ffffff))]"
										}`}
										style={{
											backgroundColor: isSel ? def.badgeBg : undefined,
											borderColor: isSel ? def.badgeColor : "var(--odontogram-border-subtle,var(--line,#e2e8f0))",
											color: isSel ? def.badgeColor : "var(--odontogram-ink,var(--ink,#0f172a))",
										}}
										title={def.descriptionRu}
									>
										<span>{def.emoji}</span>
										<span>{def.labelRu}</span>
										{isSel && <Check className="w-3.5 h-3.5 ml-1" />}
									</button>
								);
							})}
						</div>
					</div>

					{/* Procedure Checkboxes */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						<label
							className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
								hasAnesthesia
									? "border-amber-500 bg-amber-500/10 shadow-xs"
									: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]"
							}`}
						>
							<input
								type="checkbox"
								checked={hasAnesthesia}
								onChange={(e) => setHasAnesthesia(e.target.checked)}
								className="accent-amber-500 w-5 h-5 mt-0.5 rounded cursor-pointer shrink-0"
							/>
							<div className="space-y-0.5">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Анестезия (не кусать губу!)
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Онемение 2–3 ч, запрет на прикусывание губы
								</div>
							</div>
						</label>

						<label
							className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
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
							<div className="space-y-0.5">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Пульпотомия (ампутация)
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Памятка по уходу за зубом и обезболиванию
								</div>
							</div>
						</label>

						<label
							className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
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
							<div className="space-y-0.5">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Герметизация фиссур
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Рекомендации по диете и контролю силанта
								</div>
							</div>
						</label>

						<label
							className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
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
							<div className="space-y-0.5">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Серебрение зубов (SDF)
								</div>
								<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Предупреждение о темном окрашивании
								</div>
							</div>
						</label>
					</div>

					{/* Parameters Setup */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-xs sm:text-sm">
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
					</div>

					{/* Custom Notes / Врачебный комментарий */}
					<div className="space-y-1.5">
						<label className="text-xs sm:text-sm font-bold block text-[var(--odontogram-ink,var(--ink,#0f172a))]">
							Клинические примечания и статус адаптации (1-клик / ручной ввод):
						</label>
						<textarea
							rows={2}
							value={customNotes}
							onChange={(e) => setCustomNotes(e.target.value)}
							placeholder="Например: Адаптация успешна, лечение без удержания. Ребенок спокоен."
							className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-xs sm:text-sm font-medium"
						/>
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
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-5 sm:px-8 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]">
					<div className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium hidden sm:block">
						Мандат 8e: печать памятки доступна в 1 клик в любой момент приема
					</div>

					<div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleCopyText}
							className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
						>
							<Copy className="w-4 h-4" />
							<span>Копировать</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
							title="Печать памятки родителям (анестезия, не кусать губу, гигиена молочных зубов)"
						>
							<Printer className="w-4 h-4" />
							<span>⚡ 1-клик Печать памятки родителям</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
