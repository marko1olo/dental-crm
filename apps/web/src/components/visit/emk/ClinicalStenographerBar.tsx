/**
 * @file apps/web/src/components/visit/emk/ClinicalStenographerBar.tsx
 * @description Compact clinical stenographer chips & sterile chairside voice toolbar.
 * 1-row Apple HIG (macOS & iOS) / Dente design tokens, 0 horizontal clipping,
 * 1-click insertion + keyboard shortcut guide + live sterile hands-free dictation.
 */

import React, { useState } from "react";
import {
	Check,
	Loader2,
	Mic,
	MicOff,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import type { ClinicalSnippet, ClinicalFormFieldTarget } from "@dental/shared";

export interface ClinicalStenographerBarProps {
	readonly snippets: readonly ClinicalSnippet[];
	readonly onSelectSnippet: (snippet: ClinicalSnippet) => void;
	readonly className?: string;
	readonly activeKey?: string | null;
	// Sterile Voice Dictation Props (Mandates 8e, 8n)
	readonly isListening?: boolean;
	readonly isProcessing?: boolean;
	readonly interimSpeechText?: string;
	readonly onToggleVoice?: () => void;
	readonly onApplyInterim?: () => void;
	readonly onCancelVoice?: () => void;
	readonly enableVoice?: boolean;
	readonly targetField?: ClinicalFormFieldTarget;
}

export function ClinicalStenographerBar({
	snippets,
	onSelectSnippet,
	className = "",
	activeKey,
	isListening = false,
	isProcessing = false,
	interimSpeechText = "",
	onToggleVoice,
	onApplyInterim,
	onCancelVoice,
	enableVoice = true,
	targetField = "all",
}: ClinicalStenographerBarProps) {
	const [showMobileVoiceSheet, setShowMobileVoiceSheet] = useState(false);

	// ACTIVE RECORDING MODE (Desktop macOS HIG 32-36px single row pulse bar + Mobile iOS HIG 24px Bottom Sheet)
	if (isListening) {
		return (
			<>
				{/* Desktop macOS HIG: 32-36px single row pulse bar */}
				<div
					role="region"
					aria-label="Голосовая диктовка у кресла"
					className={`w-full min-h-[32px] sm:h-[36px] px-2.5 py-1 rounded-lg border border-[var(--teal,var(--brand-primary))] bg-[var(--teal-soft,rgba(13,148,136,0.1))] hidden sm:flex items-center justify-between gap-2 transition-all shadow-xs animate-in fade-in duration-200 select-none ${className}`}
					data-testid="clinical-stenographer-recording-bar"
				>
					{/* Left: Animated Pulse Dot & Mic Status */}
					<div className="flex items-center gap-2 min-w-0">
						<div className="relative flex items-center justify-center shrink-0 w-3.5 h-3.5">
							<span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
						</div>
						<span className="text-[11px] font-bold text-[var(--teal,var(--brand-primary))] uppercase tracking-wider shrink-0">
							Диктовка:
						</span>
						<span
							className="text-xs font-semibold text-[var(--ink)] truncate max-w-[260px] sm:max-w-[460px] italic"
							title={interimSpeechText || "Говорите у кресла (номера зубов, диагнозы, протокол)..."}
						>
							{interimSpeechText ? `«${interimSpeechText}»` : "Слушаю врача у кресла..."}
						</span>
					</div>

					{/* Right: Quick Commit & Cancel Actions */}
					<div className="flex items-center gap-1.5 shrink-0">
						{interimSpeechText && onApplyInterim && (
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									onApplyInterim();
								}}
								className="inline-flex items-center gap-1 px-2.5 py-0.5 h-7 min-h-[28px] rounded-md bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,#0f766e)] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer select-none"
								title="Применить распознанный текст в дневник"
								data-testid="btn-steno-apply-speech"
							>
								<Check size={13} className="shrink-0" />
								<span>✓ Применить в дневник</span>
							</button>
						)}

						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								if (onCancelVoice) onCancelVoice();
								else if (onToggleVoice) onToggleVoice();
							}}
							className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--paper-soft)] hover:bg-[var(--bad-bg,rgba(239,68,68,0.1))] text-[var(--muted)] hover:text-[var(--bad-fg,#ef4444)] border border-[var(--line-subtle)] transition-colors cursor-pointer select-none"
							title="Остановить запись"
							aria-label="Остановить голосовую запись"
							data-testid="btn-steno-stop-speech"
						>
							<X size={14} className="shrink-0" />
						</button>
					</div>
				</div>

				{/* Mobile iOS HIG: Dedicated Bottom Sheet Drawer in Natural Thumb Zone */}
				<div
					role="dialog"
					aria-label="Мобильная голосовая диктовка у кресла"
					className="sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] bg-[var(--paper-strong)] border-t border-[var(--line)] shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3 animate-in slide-in-from-bottom duration-250 backdrop-blur-xl"
					data-testid="clinical-stenographer-mobile-sheet"
				>
					{/* Tactile Drag Handle 36x5px */}
					<div className="w-9 h-1 rounded-full bg-[var(--line-strong)] mx-auto opacity-70" />

					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<div className="relative flex items-center justify-center shrink-0 w-4 h-4">
								<span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
								<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
							</div>
							<span className="text-xs font-bold text-[var(--teal,var(--brand-primary))] uppercase tracking-wider">
								Стенографист у кресла
							</span>
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								if (onCancelVoice) onCancelVoice();
								else if (onToggleVoice) onToggleVoice();
							}}
							className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--bad-fg,#ef4444)] border border-[var(--line-subtle)]"
							aria-label="Закрыть голосовую шторку"
						>
							<X size={16} />
						</button>
					</div>

					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] min-h-[52px] flex items-center">
						<p className="text-sm font-medium text-[var(--ink)] italic line-clamp-3 leading-relaxed">
							{interimSpeechText ? `«${interimSpeechText}»` : "Говорите формулу зуба, диагноз или протокол лечения..."}
						</p>
					</div>

					{/* Natural Thumb Zone Action Buttons (Min Height >= 48px) */}
					<div className="flex items-center gap-2 pt-1">
						{interimSpeechText && onApplyInterim && (
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									onApplyInterim();
								}}
								className="flex-1 min-h-[48px] px-4 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,#0f766e)] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
								data-testid="btn-steno-apply-speech-mobile"
							>
								<Check size={18} />
								<span>✓ Применить в дневник</span>
							</button>
						)}
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								if (onCancelVoice) onCancelVoice();
								else if (onToggleVoice) onToggleVoice();
							}}
							className={`${interimSpeechText ? "w-12" : "flex-1"} min-h-[48px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] flex items-center justify-center font-bold text-sm`}
							aria-label="Остановить"
						>
							{interimSpeechText ? <X size={20} /> : <span>Завершить</span>}
						</button>
					</div>
				</div>
			</>
		);
	}

	// NORMAL STANDBY MODE (1-row Chips + Microphone Trigger)
	return (
		<div
			role="toolbar"
			aria-label="Быстрые стенограммы и голосовой ввод"
			className={`dente-filter-chips items-center gap-1.5 py-1 max-w-full overflow-x-auto no-scrollbar flex-nowrap ${className}`}
			data-testid="clinical-stenographer-bar"
		>
			{/* 1-Click Chairside Sterile Microphone Button */}
			{enableVoice && onToggleVoice && (
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						onToggleVoice();
					}}
					disabled={isProcessing}
					className="inline-flex items-center gap-1 px-2 py-0.5 h-7 min-h-[28px] rounded-md bg-[var(--teal-soft,rgba(13,148,136,0.1))] hover:bg-[var(--teal-surface,#ccfbf1)] border border-[var(--teal,var(--brand-primary))] text-[var(--teal,var(--brand-primary))] text-[11px] font-bold shrink-0 transition-all select-none cursor-pointer"
					title="Голосовой ввод у кресла в перчатках (Hands-Free FDI / СтАР)"
					aria-label="Начать голосовую диктовку"
					data-testid="btn-steno-mic-trigger"
				>
					{isProcessing ? (
						<Loader2 size={13} className="animate-spin text-[var(--teal)] shrink-0" />
					) : (
						<Mic size={13} className="text-[var(--teal)] shrink-0" />
					)}
					<span>Диктовать</span>
				</button>
			)}

			{/* Keyboard Shortcut Indicator */}
			<div
				className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-[var(--teal,var(--brand-primary))] shrink-0 select-none bg-[var(--paper-soft)] border border-[var(--line-subtle)]"
				title="Вводите короткую аббревиатуру и нажимайте Tab или Пробел для мгновенного развёртывания"
			>
				<Zap size={11} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
				<span className="hidden sm:inline">Стенограф:</span>
				<span className="text-[10px] text-[var(--muted)] font-mono font-normal">Tab/Space</span>
			</div>

			{/* Canonical Clinical Snippets Chips */}
			{snippets && snippets.length > 0 && snippets.map((snippet) => {
				const isSelected = activeKey === snippet.key;
				return (
					<button
						key={snippet.key}
						type="button"
						onClick={(e) => {
							e.preventDefault();
							onSelectSnippet(snippet);
						}}
						data-testid={`btn-steno-chip-${snippet.key}`}
						title={`Аббревиатура «${snippet.key}»: ${snippet.label}\n\n${snippet.text}`}
						className={`dente-filter-chip shrink-0 h-7 min-h-[28px] px-2 text-xs transition-all ${
							isSelected ? "active" : ""
						}`}
					>
						<span className="font-mono font-bold text-[var(--teal,var(--brand-primary))] text-[11px]">
							{snippet.key}
						</span>
						<span className="text-[11px] text-[var(--ink)] max-w-[140px] truncate">
							{snippet.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
