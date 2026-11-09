/**
 * apps/web/src/components/documents/studio/ConsentSignersRow.tsx
 *
 * Блок электронной подписи на экране (Canvas) и реквизитов сторон (Мандаты 8e, 8n).
 * Включает сенсорный холст для стилуса/пальца и сведения об исполнителе.
 */

import React from "react";
import { Building2, PenTool, User } from "lucide-react";

export interface ConsentSignersRowProps {
	readonly isSignPadOpen: boolean;
	readonly onToggleSignPad: () => void;
	readonly hasSigned: boolean;
	readonly signedStatusText?: string;
	readonly onClearCanvas: () => void;
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly onStartDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
	readonly onDraw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
	readonly onStopDrawing: () => void;
	readonly clinicName: string;
	readonly clinicLicense: string;
	readonly doctorFullName: string;
	readonly toastNotice?: string | null;
	readonly toastType?: "success" | "error" | "info";
}

export const ConsentSignersRow: React.FC<ConsentSignersRowProps> = ({
	isSignPadOpen,
	onToggleSignPad,
	hasSigned,
	signedStatusText,
	onClearCanvas,
	canvasRef,
	onStartDrawing,
	onDraw,
	onStopDrawing,
	clinicName,
	clinicLicense,
	doctorFullName,
	toastNotice,
	toastType = "info",
}) => {
	const currentStatusLabel = signedStatusText || (hasSigned ? "✓ Подписано" : "Ожидает росписи");

	return (
		<div className="space-y-3">
			{/* Интерактивная подпись пальцем/стилусом на Canvas */}
			<div className="dente-signature-pad-box">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
						<PenTool size={14} className="text-[var(--teal,#0d9488)]" />
						Подпись на экране (Canvas)
					</span>
					<button
						type="button"
						onClick={onToggleSignPad}
						className="text-xs text-[var(--teal,#0d9488)] hover:underline font-medium cursor-pointer"
					>
						{isSignPadOpen ? "Скрыть" : "Открыть холст"}
					</button>
				</div>

				{!isSignPadOpen && (
					<div className="text-[11px] text-emerald-600 font-medium mt-1">
						{currentStatusLabel}
					</div>
				)}

				{isSignPadOpen && (
					<div>
						<canvas
							ref={canvasRef}
							width={320}
							height={90}
							className="dente-signature-canvas"
							onMouseDown={onStartDrawing}
							onMouseMove={onDraw}
							onMouseUp={onStopDrawing}
							onMouseLeave={onStopDrawing}
							onTouchStart={onStartDrawing}
							onTouchMove={onDraw}
							onTouchEnd={onStopDrawing}
						/>
						<div className="flex justify-between items-center mt-2">
							<button
								type="button"
								onClick={onClearCanvas}
								className="text-[11px] text-[var(--ink-muted,#64748b)] hover:text-red-500 cursor-pointer"
							>
								Очистить роспись
							</button>
							<span className="text-[11px] text-emerald-600 font-medium">
								{currentStatusLabel}
							</span>
						</div>
					</div>
				)}
			</div>

			{/* Реквизиты и статус врача */}
			<div className="text-xs text-[var(--ink-muted,#64748b)] space-y-1.5 pt-2 border-t border-[var(--line,#e2e8f0)]">
				<div className="font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Building2 size={13} className="text-[var(--teal,#0d9488)]" />
					{clinicName}
				</div>
				<div>Лицензия: {clinicLicense}</div>
				<div className="flex items-center gap-1.5 pt-1">
					<User size={13} />
					<span>Врач: {doctorFullName}</span>
				</div>
				{toastNotice && (
					<div
						className={`text-xs p-2 rounded-lg font-medium animate-pulse border ${
							toastType === "error"
								? "text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900"
								: toastType === "success"
									? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"
									: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900"
						}`}
					>
						{toastNotice}
					</div>
				)}
			</div>
		</div>
	);
};

ConsentSignersRow.displayName = "ConsentSignersRow";
