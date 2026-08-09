import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Save, Smile, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural";
import { logger } from "../../utils/logger";
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

/*
 * БЫЛО: виджет слал orthodonticProgress объектом { currentAligner, totalAligners,
 * startDate }, а shared Zod — z.string().max(500). PUT всегда 400; toast честно
 * говорил «не сохранён», но трекер капп в карточке не работал никогда.
 * Схему на structured object не трогаем (partial admin form шлёт ту же строку).
 * СТАЛО: на проводе — JSON-строка; при чтении принимаем string | legacy object.
 */
function serializeOrthoProgress(data: OrthoData): string {
	return JSON.stringify({
		currentAligner: data.currentAligner,
		totalAligners: data.totalAligners,
		startDate: data.startDate,
	});
}

function parseOrthoProgress(raw: unknown): OrthoData | null {
	if (raw == null || raw === "") return null;
	let obj: unknown = raw;
	if (typeof raw === "string") {
		try {
			obj = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (!obj || typeof obj !== "object") return null;
	const rec = obj as Record<string, unknown>;
	const currentAligner = Number(rec.currentAligner ?? rec.current);
	const totalAligners = Number(rec.totalAligners ?? rec.total);
	const startDate =
		typeof rec.startDate === "string"
			? rec.startDate
			: typeof rec.start === "string"
				? rec.start
				: "";
	if (!Number.isFinite(currentAligner) || currentAligner < 1) return null;
	if (!Number.isFinite(totalAligners) || totalAligners < 1) return null;
	return {
		currentAligner: Math.floor(currentAligner),
		totalAligners: Math.floor(totalAligners),
		startDate: startDate || getTodayString(),
	};
}

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
	} catch (_e) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(_e as { status?: number })?.status ?? null,
			),
			"error",
		);
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

	const patient = (dashboard?.patients ?? []).find(
		(p: { id?: string }) => p?.id === patientId,
	);

	// Если новое структурированное поле не заполнено, читаем старую запись,
	// которую раньше складывали в конец заметок.
	const orthoFromProfile = parseOrthoProgress(
		patient?.administrativeProfile?.orthodonticProgress,
	);
	const { cleanNotes, legacyOrtho } = parseLegacyOrthoNotes(patient?.notes);

	const ortho: OrthoData | null = orthoFromProfile || legacyOrtho || null;

	// Поля формы
	const [formCurrent, setFormCurrent] = useState(ortho?.currentAligner ?? 1);
	const [formTotal, setFormTotal] = useState(ortho?.totalAligners ?? 40);
	const [formStart, setFormStart] = useState(
		ortho?.startDate ?? getTodayString(),
	);

	/*
	 * БЫЛО: номера капп и дата начала брались из пациента ОДИН раз, при первом
	 * появлении виджета — `useState(ortho?.currentAligner ?? 1)` — и дальше не
	 * пересчитывались никогда. Виджет не размонтируется при переключении карточки
	 * (PatientOverviewTab рендерит его без key), а сброс стоял только в
	 * handleStartEdit, то есть при нажатии «Изменить».
	 *
	 * Что видел врач: открыл настройку трекера у пациента с 12-й каппой из 40,
	 * не закрыл, переключился на другого пациента — и в его карточке стоит форма
	 * с числами 12 и 40 от первого. «Сохранить» записывало эти числа в
	 * administrative-profile ВТОРОГО пациента: чужой этап лечения, по которому
	 * потом считают, когда менять каппу и когда снимать элайнеры.
	 *
	 * Сброс в фазе рендера: `ortho` здесь уже относится к новому пациенту, потому
	 * что поиск идёт по актуальному patientId.
	 */
	const [prevPatientId, setPrevPatientId] = useState(patientId);
	if (patientId !== prevPatientId) {
		setPrevPatientId(patientId);
		setIsEditing(false);
		setFormCurrent(ortho?.currentAligner ?? 1);
		setFormTotal(ortho?.totalAligners ?? 40);
		setFormStart(ortho?.startDate ?? getTodayString());
	}

	/*
	 * БЫЛО: этот выход стоял ВЫШЕ трёх useState. Пока пациент находился в
	 * dashboard, компонент вызывал шесть хуков, а на первом же рендере, где его
	 * там нет (обновление списка пациентов, выбор пациента, ещё не попавшего в
	 * dashboard), — только три. React такое считает ошибкой и роняет всё дерево:
	 * «Rendered fewer hooks than expected», то есть у врача гаснет вся карточка
	 * пациента, а не один виджет. Проверка обязана стоять после всех хуков.
	 */
	if (!patient) return null;

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
						/*
						 * БЫЛО: orthodonticProgress: updatedOrtho (object) → Zod string → 400.
						 * СТАЛО: JSON-строка ≤500 символов, парсится обратно parseOrthoProgress.
						 */
						orthodonticProgress: serializeOrthoProgress(updatedOrtho),
					}),
				},
			);

			if (!resAdmin.ok) {
				showToast(
					`${actionFailureToast("Отсчёт капп не сохранён", resAdmin.status)} Пока запишите этап лечения в заметку к пациенту.`,
					"error",
				);
				return;
			}

			// Убираем старую техническую запись из заметок, если она там была.
			// БЫЛО: ответ на этот запрос не проверялся вовсе, и при его отказе врач
			// всё равно видел зелёное «обновлено», хотя в заметках пациента остался
			// хвост со служебными данными — он виден в поле заметок карточки.
			if (legacyOrtho) {
				const resNotes = await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						notes: cleanNotes,
					}),
				});
				if (!resNotes.ok) {
					showToast(
						"Этап лечения сохранён, но старая служебная запись в заметках не удалена — она осталась видна в поле заметок. Повторите сохранение позже.",
						"warning",
					);
					setIsEditing(false);
					await loadDashboard();
					return;
				}
			}

			showToast("Ортодонтический этап обновлен", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			// Сюда попадают только обрывы связи: отказы сервера разобраны выше.
			logger.error("[OrthodonticProgressWidget save]", err);
			showToast(
				`${actionFailureToast("Отсчёт капп не сохранён", null)} Пока запишите этап лечения в заметку к пациенту.`,
				"error",
			);
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

			// Тот же отказ, что и при сохранении, и так же бесполезно повторять.
			if (!resAdmin.ok) {
				showToast(
					`${actionFailureToast("Отсчёт капп не убран", resAdmin.status)} Каппы остались в карточке.`,
					"error",
				);
				return;
			}

			// Тот же непроверенный ответ, что и при сохранении: «удалено» показывалось
			// даже когда служебный хвост остался в заметках.
			if (legacyOrtho) {
				const resNotes = await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						notes: cleanNotes,
					}),
				});
				if (!resNotes.ok) {
					showToast(
						"Отслеживание капп убрано, но старая служебная запись в заметках не удалена — она осталась видна в поле заметок. Повторите позже.",
						"warning",
					);
					setIsEditing(false);
					await loadDashboard();
					return;
				}
			}

			showToast("Трекер ортодонтии удален", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			logger.error("[OrthodonticProgressWidget reset]", err);
			showToast(
				`${actionFailureToast("Отсчёт капп не убран", null)} Каппы остались в карточке.`,
				"error",
			);
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
			if (typeof dateStr !== "string" || !dateStr) return dateStr || "";
			const [y, m, d] = (dateStr ?? "").split("-");
			if (!y || !m || !d) return dateStr;
			return `${d}.${m}.${y}`;
		} catch {
			return dateStr || "";
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
								{/* БЫЛО: «Настройка трекера (глубокий JSONB)». JSONB — название типа
								    столбца в базе данных; на экране врача оно не значит ничего. */}
								Сколько капп пройдено
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
								/*
									ГЛАВНАЯ КНОПКА ВИДЖЕТА БЫЛА ХОЛОДНОЙ В ТЁПЛОЙ НОЧНОЙ ТЕМЕ.

									БЫЛО: `bg-teal-600 hover:bg-teal-700 text-white`. Палитра
									Tailwind в проекте не переопределена — файла tailwind.config.*
									в дереве нет вовсе, `@theme` в листах стилей тоже нет, — значит
									teal-600 это стоковый холодный oklch(60% 0.118 184.704)
									одинаково в светлой, тёмной и ночной. Токен --teal при этом
									#0d9488 в светлой, #2dd4bf в тёмной и ТЁПЛЫЙ #e0a458 в ночной:
									её включают в вечернюю смену, чтобы экран не бил синим.

									ПОЧЕМУ --teal-dark, А НЕ --teal. Пара «фон --teal-dark + текст
									--on-teal» проходит норму во всех трёх темах, а пара с --teal в
									светлой даёт 3.74:1 при норме 4.5:1 — то же решение и по той же
									причине, что у кнопки ящика листа ожидания (ffdad856a).
									Наведение — яркостью, а не вторым цветом: brightness двигает фон
									и текст вместе и контраст не теряет. transition-all вместо
									transition-colors потому, что brightness это фильтр, а не цвет.
								*/
								className="flex-1 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] rounded-lg p-2.5 font-semibold text-xs flex justify-center items-center gap-2 border-0 cursor-pointer transition-all"
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
									className="px-4 py-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
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
								<div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
									<Smile size={24} />
								</div>
								<p className="m-0 text-sm text-slate-500 dark:text-slate-400 text-center">
									Лечение каппами пока не начато.
								</p>
								<button
									type="button"
									onClick={handleStartEdit}
									/* Вариант dark: здесь не спасал: он честно переведён на data-theme и
									   в ночной теме срабатывает, но dark:text-teal-400 — это тоже
									   стоковый холодный цвет, а не --teal. Токены меняются по теме сами,
									   поэтому второй вариант больше не нужен. */
									className="mt-2 bg-transparent border border-[var(--teal-ring)] text-[var(--teal-dark)] px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-[var(--teal-surface)] transition-colors"
								>
									{/* БЫЛО: «Добавить орто-трекер (JSONB)» — на кнопке, которую жмёт
									    врач, стояло название типа данных в базе. */}
									Начать отсчёт капп
								</button>
							</div>
						) : (
							<div className="flex flex-col gap-4">
								<div className="flex justify-between items-start">
									<div className="flex items-center gap-2.5">
										<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
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
										type="button"
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
										<span className="text-xs font-semibold text-[var(--teal-dark)]">
											{progressPercent}%
										</span>
									</div>

									<div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
										<motion.div
											initial={{ width: 0 }}
											animate={{ width: `${progressPercent}%` }}
											transition={{ duration: 1, ease: "easeOut" }}
											className="h-full bg-[var(--teal)] rounded-full"
										/>
									</div>
								</div>

								{weeksRemaining > 0 ? (
									<p className="m-0 text-xs text-slate-500 dark:text-slate-400">
										{/* БЫЛО: «Осталось примерно 1 капп до завершения этапа» —
										    число подставлялось к неизменяемому слову. Согласование
										    берём из общей countLabel, а не считаем на месте. */}
										Осталось примерно{" "}
										<strong className="text-slate-900 dark:text-white">
											{countLabel(weeksRemaining, "каппа", "каппы", "капп")}
										</strong>{" "}
										до конца этапа.
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
