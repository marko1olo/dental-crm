/**
 * TreatmentPlanAcceptanceFooter.tsx — Блок фиксации и акцепта плана лечения пациентом
 * (Wave 19 / Chairside Digital Consent & Acceptance).
 *
 * Интерактивный акцепт у кресла:
 * - Цифровая подпись пациента на сенсорном планшете (Canvas / Stylus / Finger)
 * - Галочка информированного согласия с рисками и этапами
 * - Быстрая печать Приложения №1 к договору по ПП РФ № 736
 * - Сенсорные области >= 44x44px по Apple HIG
 */

import React, { useRef, useState, useEffect } from "react";
import {
	CheckCircle,
	Printer,
	PenTool,
	RotateCcw,
	ShieldAlert,
	FileText,
	Check,
} from "lucide-react";
import type { TreatmentPlanTier } from "./treatmentPlanPresenterTypes";

export interface TreatmentPlanAcceptanceFooterProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly isChoiceConfirmed: boolean;
	readonly onConfirmPatientChoice: (tier: TreatmentPlanTier) => void;
	readonly onPrintAppendix: () => void;
	readonly onApproveAndSign?: (tier: TreatmentPlanTier) => void;
	readonly patientChoiceBtnText?: string;
	readonly choiceConfirmedBtnText?: string;
}

export const TreatmentPlanAcceptanceFooter: React.FC<TreatmentPlanAcceptanceFooterProps> = ({
	selectedTier,
	isChoiceConfirmed,
	onConfirmPatientChoice,
	onPrintAppendix,
	onApproveAndSign,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
}) => {
	const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
	const [risksAccepted, setRisksAccepted] = useState<boolean>(true);
	const [hasSigned, setHasSigned] = useState<boolean>(false);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDrawingRef = useRef<boolean>(false);

	// Очистка подписи
	const handleClearSignature = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasSigned(false);
	};

	// Обработчики рисования на Canvas (мышь и тач пальцем)
	const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		isDrawingRef.current = true;
		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;

		ctx.beginPath();
		ctx.moveTo(clientX - rect.left, clientY - rect.top);
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.strokeStyle = "var(--ink, #0f172a)";
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDrawingRef.current) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
		const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;

		ctx.lineTo(clientX - rect.left, clientY - rect.top);
		ctx.stroke();
		setHasSigned(true);
	};

	const stopDrawing = () => {
		isDrawingRef.current = false;
	};

	const handleFinalAccept = () => {
		onConfirmPatientChoice(selectedTier);
		if (onApproveAndSign) {
			onApproveAndSign(selectedTier);
		}
		setShowSignaturePad(false);
	};

	return (
		<footer
			className="treatment-acceptance-footer sticky bottom-0 z-30 p-3 sm:p-4 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg"
			data-testid="treatment-plan-acceptance-footer"
		>
			<div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
				{/* Левая часть: информация о сумме и выбранном плане */}
				<div className="flex items-center gap-3 w-full sm:w-auto">
					<div className="text-left">
						<span className="text-[11px] text-[var(--muted)] block">Выбранный вариант:</span>
						<span className="text-sm font-bold text-[var(--ink)]">
							{selectedTier.title} ({selectedTier.badge})
						</span>
					</div>
					<div className="h-6 w-px bg-[var(--line)] hidden sm:block" />
					<div className="text-left">
						<span className="text-[11px] text-[var(--muted)] block">Сумма к оплате:</span>
						<span className="text-base sm:text-lg font-black text-[var(--teal)] font-mono">
							{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* Правая часть: кнопки действий */}
				<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
					{/* Кнопка распечатки договора */}
					<button
						type="button"
						onClick={onPrintAppendix}
						className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer transition-all active:scale-98"
						data-testid="presenter-print-appendix-btn"
					>
						<Printer size={16} />
						<span>Печать формы</span>
					</button>

					{/* Переключатель цифровой подписи на планшете */}
					<button
						type="button"
						onClick={() => setShowSignaturePad((prev) => !prev)}
						className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer transition-all active:scale-98"
						data-testid="toggle-signature-pad-btn"
					>
						<PenTool size={16} />
						<span>{hasSigned ? "Подписано пациентом" : "Подпись на планшете"}</span>
					</button>

					{/* Главная кнопка фиксации выбора (Primary CTA) */}
					<button
						type="button"
						onClick={handleFinalAccept}
						className={`min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-sm ${
							isChoiceConfirmed
								? "bg-emerald-600 hover:bg-emerald-700 text-white"
								: "bg-[var(--teal)] hover:bg-[var(--teal-strong,var(--teal))] text-white"
						}`}
						data-testid="confirm-patient-plan-btn"
					>
						{isChoiceConfirmed ? <Check size={18} /> : <CheckCircle size={18} />}
						<span>
							{isChoiceConfirmed
								? (choiceConfirmedBtnText || "Выбор утвержден")
								: (patientChoiceBtnText || `Пациент выбрал ${selectedTier.badge}`)}
						</span>
					</button>
				</div>
			</div>

			{/* Всплывающая панель электронной подписи на сенсорном планшете */}
			{showSignaturePad && (
				<div className="mt-3 pt-3 border-t border-[var(--line-subtle)] max-w-xl mx-auto flex flex-col gap-2.5 animate-in fade-in-50 duration-150">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<PenTool size={14} className="text-[var(--teal)]" />
							Электронная подпись пациента (пальцем или стилусом на экране):
						</span>
						<button
							type="button"
							onClick={handleClearSignature}
							className="text-[11px] text-[var(--muted)] hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
						>
							<RotateCcw size={12} />
							Очистить
						</button>
					</div>

					<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
						<canvas
							ref={canvasRef}
							width={540}
							height={120}
							className="w-full h-[100px] touch-none cursor-crosshair bg-white dark:bg-slate-900"
							onMouseDown={startDrawing}
							onMouseMove={draw}
							onMouseUp={stopDrawing}
							onMouseLeave={stopDrawing}
							onTouchStart={startDrawing}
							onTouchMove={draw}
							onTouchEnd={stopDrawing}
						/>
					</div>

					<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={risksAccepted}
								onChange={(e) => setRisksAccepted(e.target.checked)}
								className="rounded border-[var(--line)] text-[var(--teal)]"
							/>
							<span>С планом, рисками и стоимостью ознакомлен</span>
						</label>
						<span className="italic">ст. 20 № 323-ФЗ</span>
					</div>
				</div>
			)}
		</footer>
	);
};
