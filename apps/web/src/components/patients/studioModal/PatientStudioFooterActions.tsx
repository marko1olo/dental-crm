/**
 * PatientStudioFooterActions.tsx — Нижняя панель подтверждения и действий студии.
 *
 * МАНДАТЫ:
 * - Мандат 8am (Единый дизайн-код): ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран!
 * - Мандат 8e (Автономия врача и администратора): кнопка сохранения НИКОГДА не блокируется (disabled={false}).
 * - Apple HIG: плавающая нижняя панель (Floating Bottom Bar) со стеклянным размытием, min-h-[44px].
 * - Мандат 8b (Sweet Spot: 70–120 строк).
 */

import React from "react";
import { Check, Calendar } from "lucide-react";
import type { PatientCatalogItem } from "../patientCatalogData";

export interface PatientStudioFooterActionsProps {
	readonly mode: "view" | "create";
	readonly currentPatient?: PatientCatalogItem;
	readonly onSave: () => void;
	readonly onNewAppointment?: (patientId: string) => void;
}

export const PatientStudioFooterActions: React.FC<PatientStudioFooterActionsProps> = React.memo(
	function PatientStudioFooterActions({
		mode,
		currentPatient,
		onSave,
		onNewAppointment,
	}) {
		return (
			<footer className="patient-studio-footer px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper-strong)]/90 backdrop-blur-md flex items-center justify-between gap-3">
				{/* Левая подсказка */}
				<div className="text-xs text-[var(--muted)] truncate hidden sm:block">
					{mode === "create"
						? "✓ Экспресс-регистрация без бюрократии"
						: `Лечащий врач: ${currentPatient?.doctorName || "Не назначен"}`}
				</div>

				{/* Правый блок действий */}
				<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
					{mode === "view" && onNewAppointment && currentPatient && (
						<button
							type="button"
							onClick={() => onNewAppointment(currentPatient.id)}
							className="h-11 sm:h-9 px-3.5 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition-colors min-h-[44px] sm:min-h-0 flex items-center gap-1.5"
						>
							<Calendar size={14} className="text-[var(--muted)]" />
							<span>Записать на приём</span>
						</button>
					)}

					{/* РОВНО ОДНА Primary CTA кнопка #0d9488 — ВСЕГДА кликабельна (Мандат 8e, 8am) */}
					<button
						type="button"
						onClick={onSave}
						disabled={false}
						className="h-11 sm:h-9 px-5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-hover)] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial"
						data-testid="patient-studio-primary-cta"
					>
						<Check size={16} />
						<span>{mode === "create" ? "Зарегистрировать пациента" : "Сохранить данные пациента"}</span>
					</button>
				</div>
			</footer>
		);
	},
);
