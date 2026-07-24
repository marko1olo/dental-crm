import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Save, Smile, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

interface OrthoData {
	currentAligner: number;
	totalAligners: number;
	startDate: string;
}

const getTodayString = (): string => {
	const parts = new Date().toISOString().split("T");
	return parts[0] || "";
};

function parseLegacyOrthoNotes(notesText: string | null | undefined): {
	cleanNotes: string;
	legacyOrtho: OrthoData | null;
} {
	const text = notesText || "";
	const separator = "\n\n===ORTHO===\n";
	const parts = text.split(separator);

	if (parts.length < 2) {
		return { cleanNotes: text, legacyOrtho: null };
	}

	try {
		const orthoData = JSON.parse(parts[1] || "{}");
		return {
			cleanNotes: parts[0] || "",
			legacyOrtho: {
				currentAligner: Number(orthoData.current) || 1,
				totalAligners: Number(orthoData.total) || 40,
				startDate: orthoData.start || getTodayString(),
			},
		};
	} catch (e) {
		return { cleanNotes: text, legacyOrtho: null };
	}
}

export function OrthodonticProgressWidget({
	patientId,
}: {
	patientId: string;
}) {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	if (!patient) return null;

	// Backwards compatibility migration logic:
	// If the new structured DB field is missing, fallback to parsing legacy notes.
	const orthoFromProfile = patient.administrativeProfile?.orthodonticProgress;
	const { cleanNotes, legacyOrtho } = parseLegacyOrthoNotes(patient.notes);

	const ortho: OrthoData | null = orthoFromProfile || legacyOrtho || null;

	// Form states
	const [formCurrent, setFormCurrent] = useState(ortho?.currentAligner ?? 1);
	const [formTotal, setFormTotal] = useState(ortho?.totalAligners ?? 40);
	const [formStart, setFormStart] = useState(
		ortho?.startDate ?? getTodayString(),
	);

	// Reset form states if patient changes or edits are cancelled
	const handleStartEdit = () => {
		setFormCurrent(ortho?.currentAligner ?? 1);
		setFormTotal(ortho?.totalAligners ?? 40);
		setFormStart(ortho?.startDate ?? getTodayString());
		setIsEditing(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (formCurrent < 1 || formTotal < 1 || formCurrent > formTotal) {
			showToast("Некорректные значения капп", "error");
			return;
		}

		setSaving(true);
		try {
			const updatedOrtho: OrthoData = {
				currentAligner: formCurrent,
				totalAligners: formTotal,
				startDate: formStart,
			};

			const adminProfile = patient.administrativeProfile || {};

			// Migrate: First, update administrative profile with proper structured data
			const resAdmin = await fetch(
				`/api/patients/${patientId}/administrative-profile`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...adminProfile,
						orthodonticProgress: updatedOrtho,
					}),
				},
			);

			if (!resAdmin.ok)
				throw new Error("Failed to save patient administrative profile");

			// Migrate: Clean up the legacy stringified JSON from notes if it exists
			if (legacyOrtho) {
				await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						notes: cleanNotes,
					}),
				});
			}

			showToast("Ортодонтический этап обновлен", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			showToast("Не удалось сохранить изменения", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleResetWidget = async () => {
		if (
			!confirm(
				"Вы действительно хотите удалить ортодонтический трекер для этого пациента?",
			)
		) {
			return;
		}
		setSaving(true);
		try {
			const adminProfile = patient.administrativeProfile || {};

			const resAdmin = await fetch(
				`/api/patients/${patientId}/administrative-profile`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...adminProfile,
						orthodonticProgress: null,
					}),
				},
			);

			if (!resAdmin.ok)
				throw new Error("Failed to clear patient administrative profile");

			if (legacyOrtho) {
				await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						notes: cleanNotes,
					}),
				});
			}

			showToast("Трекер ортодонтии удален", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			showToast("Не удалось сбросить трекер", "error");
		} finally {
			setSaving(false);
		}
	};

	// Derived metrics
	const hasActiveTracker = ortho !== null;
	const currentAligner = ortho?.currentAligner ?? 1;
	const totalAligners = ortho?.totalAligners ?? 40;
	const weeksRemaining = Math.max(0, totalAligners - currentAligner);
	const progressPercent = Math.round((currentAligner / totalAligners) * 100);

	const formatDate = (dateStr: string) => {
		try {
			const [y, m, d] = dateStr.split("-");
			if (!y || !m || !d) return dateStr;
			return `${d}.${m}.${y}`;
		} catch {
			return dateStr;
		}
	};

	return (
		<motion.div
			data-testid="orthodontic-progress-widget"
			className="ortho-progress-widget bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mt-4 shadow-sm"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
		>
			<AnimatePresence mode="wait">
				{isEditing ? (
					<motion.form
						key="edit"
						onSubmit={handleSave}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 10 }}
						style={{ display: "flex", flexDirection: "column", gap: "12px" }}
					>
						<div className="flex justify-between items-center mb-2">
							<span className="text-sm font-semibold text-slate-900 dark:text-white">
								Настройка трекера (глубокий JSONB)
							</span>
							<button
								type="button"
								onClick={() => setIsEditing(false)}
								className="bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0"
							>
								<X size={18} />
							</button>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<label className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
								Текущая каппа
								<input
									type="number"
									min={1}
									max={formTotal}
									value={formCurrent}
									onChange={(e) =>
										setFormCurrent(Math.max(1, Number(e.target.value)))
									}
									className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none"
								/>
							</label>
							<label className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
								Всего капп
								<input
									type="number"
									min={1}
									value={formTotal}
									onChange={(e) =>
										setFormTotal(Math.max(1, Number(e.target.value)))
									}
									className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none"
								/>
							</label>
						</div>

						<label className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
							Дата начала
							<input
								type="date"
								value={formStart}
								onChange={(e) => setFormStart(e.target.value)}
								className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm w-full outline-none"
							/>
						</label>

						<div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
							<button
								type="submit"
								disabled={saving}
								className="primary-button"
								style={{
									flex: 1,
									background: "var(--teal)",
									color: "white",
									borderRadius: "8px",
									padding: "10px",
									border: "none",
									fontWeight: 600,
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									gap: "8px",
									cursor: "pointer",
								}}
							>
								{saving ? (
									"Сохранение..."
								) : (
									<>
										<Save size={16} /> Сохранить
									</>
								)}
							</button>
							{hasActiveTracker && (
								<button
									type="button"
									disabled={saving}
									onClick={handleResetWidget}
									style={{
										background: "rgba(239, 68, 68, 0.1)",
										color: "var(--red)",
										borderRadius: "8px",
										padding: "10px 16px",
										border: "1px solid rgba(239, 68, 68, 0.2)",
										fontWeight: 600,
										cursor: "pointer",
										transition: "all 0.2s",
									}}
								>
									Удалить
								</button>
							)}
						</div>
					</motion.form>
				) : (
					<motion.div
						key="view"
						initial={{ opacity: 0, x: 10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -10 }}
					>
						{!hasActiveTracker ? (
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "12px",
									padding: "16px 0",
								}}
							>
								<div
									style={{
										width: 48,
										height: 48,
										borderRadius: "50%",
										background: "var(--paper-soft)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--muted)",
										border: "1px solid var(--line)",
									}}
								>
									<Smile size={24} />
								</div>
								<p
									style={{
										margin: 0,
										fontSize: "14px",
										color: "var(--muted)",
										textAlign: "center",
									}}
								>
									Ортодонтическое лечение не запущено.
								</p>
								<button
									onClick={handleStartEdit}
									style={{
										marginTop: "8px",
										background: "transparent",
										border: "1px solid var(--teal)",
										color: "var(--teal)",
										padding: "8px 16px",
										borderRadius: "8px",
										fontSize: "13px",
										fontWeight: 600,
										cursor: "pointer",
										transition: "all 0.2s ease",
									}}
								>
									Добавить орто-трекер (JSONB)
								</button>
							</div>
						) : (
							<div className="flex flex-col gap-4">
								<div className="flex justify-between items-start">
									<div className="flex items-center gap-2.5">
										<div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400">
											<Smile size={20} />
										</div>
										<div>
											<h4 className="m-0 text-sm font-semibold text-slate-900 dark:text-white">
												Элайнеры
											</h4>
											<span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
												<Calendar size={12} /> с {formatDate(ortho.startDate)}
											</span>
										</div>
									</div>
									<button
										onClick={handleStartEdit}
										className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
									>
										Изменить
									</button>
								</div>

								<div className="flex flex-col gap-2">
									<div className="flex justify-between items-end">
										<span className="text-3xl font-bold text-slate-900 dark:text-white leading-none">
											{currentAligner}{" "}
											<span className="text-base font-medium text-slate-500 dark:text-slate-400">
												/ {totalAligners}
											</span>
										</span>
										<span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
											{progressPercent}%
										</span>
									</div>

									<div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
										<motion.div
											initial={{ width: 0 }}
											animate={{ width: `${progressPercent}%` }}
											transition={{ duration: 1, ease: "easeOut" }}
											className="h-full bg-teal-500 rounded-full"
										/>
									</div>
								</div>

								{weeksRemaining > 0 ? (
									<p className="m-0 text-xs text-slate-500 dark:text-slate-400">
										Осталось примерно{" "}
										<strong className="text-slate-900 dark:text-white">
											{weeksRemaining}
										</strong>{" "}
										капп до завершения этапа.
									</p>
								) : (
									<p className="m-0 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
										🎉 Все каппы пройдены! Запланируйте контрольный осмотр.
									</p>
								)}
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
