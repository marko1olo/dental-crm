import type { Dashboard } from "@dental/shared";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { DoctorCalendarSyncHeader } from "./calendarSync/DoctorCalendarSyncHeader";
import { DoctorCalendarSyncLinks } from "./calendarSync/DoctorCalendarSyncLinks";
import { DoctorCalendarSyncTokenRotation } from "./calendarSync/DoctorCalendarSyncTokenRotation";
import { useDoctorCalendarSync } from "./calendarSync/useDoctorCalendarSync";

export interface DoctorCalendarSyncModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly dashboard?: Dashboard | null;
	readonly initialDoctorId?: string | null;
}

export const DoctorCalendarSyncModal: React.FC<
	DoctorCalendarSyncModalProps
> = ({ isOpen, onClose, dashboard, initialDoctorId }) => {
	const staffDoctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) =>
				s.active &&
				(s.role === "doctor" ||
					s.role === "owner" ||
					s.role === "administrator"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
		initialDoctorId || staffDoctors[0]?.id || "",
	);

	useEffect(() => {
		if (initialDoctorId) {
			setSelectedDoctorId(initialDoctorId);
		} else if (staffDoctors[0]?.id && !selectedDoctorId) {
			setSelectedDoctorId(staffDoctors[0].id);
		}
	}, [initialDoctorId, staffDoctors, selectedDoctorId]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const {
		feedData,
		isLoading,
		isRotating,
		copiedKey,
		errorMessage,
		handleCopy,
		handleRotateToken,
	} = useDoctorCalendarSync(isOpen, selectedDoctorId);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
			data-testid="doctor-calendar-sync-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="calendar-sync-modal-title"
		>
			<div className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150">
				<DoctorCalendarSyncHeader onClose={onClose} />
				<div className="p-4 sm:p-6 overflow-y-auto space-y-5">
					{staffDoctors.length > 1 && (
						<div>
							<label
								htmlFor="calendar-doctor-select"
								className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2"
							>
								Выберите врача
							</label>
							<select
								id="calendar-doctor-select"
								value={selectedDoctorId}
								onChange={(e) => setSelectedDoctorId(e.target.value)}
								className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
							>
								{staffDoctors.map((doc) => (
									<option key={doc.id} value={doc.id}>
										{doc.fullName || "Врач"} (
										{doc.role === "owner" ? "Руководитель" : "Врач"})
									</option>
								))}
							</select>
						</div>
					)}
					<div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
						<ShieldCheck
							className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
							aria-hidden="true"
						/>
						<div className="text-xs leading-relaxed">
							<span className="font-bold">
								Защита персональных данных:
							</span>{" "}
							во внешние календари передаются исключительно инициалы пациента,
							номер медицинской карты и кабинет. Диагнозы и конфиденциальные
							примечания не экспортируются.
						</div>
					</div>
					{isLoading && (
						<div className="py-8 flex flex-col items-center justify-center gap-3 text-[var(--muted,#64748b)]">
							<RefreshCw className="w-6 h-6 animate-spin text-[var(--teal,var(--brand-primary))]" />
							<span className="text-xs font-medium">
								Генерация защищенной персональной ссылки...
							</span>
						</div>
					)}
					{errorMessage && !isLoading && (
						<div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
							<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
							<div>{errorMessage}</div>
						</div>
					)}
					{feedData && !isLoading && (
						<>
							<DoctorCalendarSyncLinks
								feedData={feedData}
								copiedKey={copiedKey}
								onCopy={handleCopy}
							/>
							<DoctorCalendarSyncTokenRotation
								isRotating={isRotating}
								onRotateToken={handleRotateToken}
							/>
						</>
					)}
				</div>
				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
