/**
 * ИИ-черновик заметки приёма из диктовки / транскрипта.
 *
 * БЫЛО: POST /api/ai/visit-note-draft уже собирал SOAP-поля (complaint,
 * anamnesis, objectiveStatus, diagnosis, treatmentPlan + quality) из
 * transcript + specialty (rule fallback + optional neural), но **zero web
 * callers** — врач диктовал в микрофон дневника, а структурированный черновик
 * заметки приёма нигде не появлялся.
 *
 * ТЕПЕРЬ: на экране приёма панель принимает transcript (ручной ввод или
 * подстановка), specialty, patientId; дергает visit-note-draft с clinical
 * read headers; показывает поля и даёт «Вставить в заметку приёма» через
 * onApply callback (VisitView прокидывает в setVisitNoteDraft / store).
 *
 * Самодостаточная: auth из useAppLogicContext, минимум props.
 */

import type React from "react";
import { useCallback, useState } from "react";
import { operatorReadableErrorDetail } from "./AppHelpers";
import { showToast } from "./components/GlobalToast";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { actionFailureToast, requestFailureCause } from "./lib/panelStateText";
import { logger } from "./utils/logger";

const SPECIALTIES = [
	{ value: "universal", label: "Универсальная" },
	{ value: "therapist", label: "Терапевт" },
	{ value: "orthopedist", label: "Ортопед" },
	{ value: "surgeon", label: "Хирург" },
	{ value: "orthodontist", label: "Ортодонт" },
	{ value: "periodontist", label: "Пародонтолог" },
	{ value: "hygienist", label: "Гигиенист" },
	{ value: "pediatric", label: "Детский" },
	{ value: "implantologist", label: "Имплантолог" },
	{ value: "radiologist", label: "Рентгенолог" },
] as const;

type Specialty = (typeof SPECIALTIES)[number]["value"];

export type VisitNoteDraftResult = {
	complaint: string | null;
	anamnesis: string | null;
	objectiveStatus: string | null;
	diagnosis: string | null;
	treatmentPlan: string | null;
	quality?:
		| {
				level?: string;
				confidence?: number;
				specialty?: string;
				detectedToothCodes?: string[];
				signals?: string[];
				missing?: string[];
		  }
		| undefined;
	warnings?: string[] | undefined;
};

export type VisitNoteDraftPanelProps = {
	patientId?: string | null;
	/** Предзаполнить transcript (например из диктовки визита). */
	initialTranscript?: string | null;
	/** Куда вставить результат — VisitView прокидывает в поля заметки. */
	onApply?: (draft: VisitNoteDraftResult) => void;
};

function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	const t = raw.trim();
	if (!t) return null;
	try {
		const p: unknown = JSON.parse(t);
		return typeof p === "object" && p !== null && !Array.isArray(p)
			? (p as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function fieldText(v: unknown): string {
	return typeof v === "string" ? v : "";
}

export const VisitNoteDraftPanel: React.FC<VisitNoteDraftPanelProps> = ({
	patientId,
	initialTranscript = "",
	onApply,
}) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [transcript, setTranscript] = useState(initialTranscript ?? "");
	const [specialty, setSpecialty] = useState<Specialty>("universal");
	const [busy, setBusy] = useState(false);
	const [draft, setDraft] = useState<VisitNoteDraftResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const runDraft = useCallback(async () => {
		const pid = (patientId ?? "").trim();
		if (!pid) {
			showToast(
				"Сначала выберите пациента на приёме — без него черновик заметки не собрать.",
				"error",
				10000,
			);
			return;
		}
		const text = transcript.trim();
		if (text.length < 8) {
			showToast(
				"Введите или продиктуйте текст приёма (не короче 8 символов) — по нему соберётся черновик SOAP.",
				"error",
				10000,
			);
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? {
							...auth.denteClinicalReadHeaders(),
							"Content-Type": "application/json",
						}
					: { "Content-Type": "application/json" };
			const res = await fetch("/api/ai/visit-note-draft", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: pid,
					transcript: text,
					specialty,
					source: "typed",
				}),
			});
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			if (!res.ok) {
				logger.error(`[visit-note-draft] ${res.status} ${raw.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(
					typeof json?.message === "string" ? json.message : null,
				);
				const msg =
					detail ??
					(res.status === 400
						? "Черновик не собран: проверьте текст диктовки и специальность."
						: res.status === 404
							? "Пациент не найден в клинике — обновите карточку и повторите."
							: actionFailureToast(
									"Черновик заметки приёма не собран",
									res.status,
								));
				setError(msg);
				showToast(msg, "error", 12000);
				setDraft(null);
				return;
			}
			const next: VisitNoteDraftResult = {
				complaint: fieldText(json?.complaint) || null,
				anamnesis: fieldText(json?.anamnesis) || null,
				objectiveStatus: fieldText(json?.objectiveStatus) || null,
				diagnosis: fieldText(json?.diagnosis) || null,
				treatmentPlan: fieldText(json?.treatmentPlan) || null,
			};
			if (json?.quality && typeof json.quality === "object") {
				next.quality = json.quality as NonNullable<
					VisitNoteDraftResult["quality"]
				>;
			}
			if (Array.isArray(json?.warnings)) {
				next.warnings = ((json?.warnings ?? []) as unknown[]).filter(
					(w): w is string => typeof w === "string",
				);
			}
			setDraft(next);
			showToast(
				"Черновик заметки приёма собран. Проверьте поля перед вставкой.",
				"success",
				8000,
			);
		} catch (e) {
			logger.error("[visit-note-draft] request failed", e);
			const msg = `Черновик не собран: ${requestFailureCause(null)}. Текст диктовки остался на экране.`;
			setError(msg);
			showToast(msg, "error", 12000);
		} finally {
			setBusy(false);
		}
	}, [auth, patientId, specialty, transcript]);

	const applyDraft = useCallback(() => {
		if (!draft) return;
		if (onApply) {
			onApply(draft);
			showToast(
				"Поля заметки приёма заполнены из ИИ-черновика. Проверьте перед сохранением.",
				"success",
				9000,
			);
			return;
		}
		// Fallback: copy combined text
		const block = [
			draft.complaint && `Жалоба: ${draft.complaint}`,
			draft.anamnesis && `Анамнез: ${draft.anamnesis}`,
			draft.objectiveStatus && `Объективно: ${draft.objectiveStatus}`,
			draft.diagnosis && `Диагноз: ${draft.diagnosis}`,
			draft.treatmentPlan && `План: ${draft.treatmentPlan}`,
		]
			.filter(Boolean)
			.join("\n");
		if (
			block &&
			typeof navigator !== "undefined" &&
			navigator.clipboard?.writeText
		) {
			void navigator.clipboard.writeText(block).then(
				() => showToast("Черновик скопирован в буфер обмена.", "success"),
				() =>
					showToast(
						"Не удалось скопировать — выделите текст вручную.",
						"error",
					),
			);
		}
	}, [draft, onApply]);

	const qualityLabel =
		draft?.quality?.level === "ready"
			? "Готов к проверке"
			: draft?.quality?.level === "review"
				? "Нужна проверка врача"
				: draft?.quality?.level === "needs_more_dictation"
					? "Мало данных — дополните диктовку"
					: null;

	return (
		<section
			className="rounded-2xl border border-line bg-paper-soft p-4 shadow-sm"
			data-testid="visit-note-draft-panel"
			aria-label="ИИ-черновик заметки приёма"
		>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
				<div>
					<h3 className="text-sm font-bold text-ink tracking-wide">
						ИИ · Черновик заметки из диктовки
					</h3>
					<p className="text-xs text-muted mt-0.5">
						Разложит жалобу, анамнез, статус, диагноз и план. Врач всегда
						проверяет перед сохранением.
					</p>
				</div>
				{qualityLabel && (
					<span className="text-[11px] px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shrink-0">
						{qualityLabel}
						{typeof draft?.quality?.confidence === "number"
							? ` · ${Math.round(draft.quality.confidence * 100)}%`
							: ""}
					</span>
				)}
			</div>

			{!patientId ? (
				<p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl px-3 py-2">
					Выберите пациента на приёме — без карточки сервер не соберёт черновик.
				</p>
			) : (
				<>
					<label className="block text-xs text-muted mb-1.5">
						Текст диктовки / транскрипт
						<textarea
							data-testid="visit-note-draft-transcript"
							value={transcript}
							onChange={(e) => setTranscript(e.target.value)}
							rows={4}
							placeholder="Со слов: боль на холод в 16, глубокий кариес, анестезия, пломба…"
							className="mt-1 w-full bg-paper border border-line rounded-xl p-3 text-sm text-ink focus:ring-1 focus:ring-teal-500/50 outline-none resize-y min-h-[96px]"
						/>
					</label>
					<div className="flex flex-col sm:flex-row gap-2 sm:items-end mt-2">
						<label className="text-xs text-muted flex-1">
							Специальность
							<select
								data-testid="visit-note-draft-specialty"
								value={specialty}
								onChange={(e) => setSpecialty(e.target.value as Specialty)}
								className="mt-1 w-full bg-paper border border-line rounded-xl px-3 py-2 text-sm text-ink outline-none focus:ring-1 focus:ring-teal-500/50 min-h-[44px]"
							>
								{SPECIALTIES.map((s) => (
									<option key={s.value} value={s.value}>
										{s.label}
									</option>
								))}
							</select>
						</label>
						<button
							type="button"
							data-testid="visit-note-draft-run"
							disabled={busy}
							onClick={() => void runDraft()}
							className="px-4 py-2 text-sm font-medium rounded-xl bg-teal-600 hover:bg-teal-500 text-white border border-teal-400/40 disabled:opacity-50 min-h-[44px] inline-flex items-center justify-center"
						>
							{busy ? "Собираю черновик…" : "Собрать черновик"}
						</button>
					</div>
				</>
			)}

			{error && (
				<p className="mt-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl px-3 py-2">
					{error}
				</p>
			)}

			{draft && (
				<div className="mt-4 space-y-2" data-testid="visit-note-draft-result">
					{(
						[
							["Жалоба", draft.complaint],
							["Анамнез", draft.anamnesis],
							["Объективно", draft.objectiveStatus],
							["Диагноз", draft.diagnosis],
							["План лечения", draft.treatmentPlan],
						] as const
					).map(([label, value]) => (
						<div
							key={label}
							className="rounded-xl border border-line bg-paper px-3 py-2"
						>
							<div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">
								{label}
							</div>
							<div className="text-sm text-ink whitespace-pre-wrap">
								{value?.trim() ? value : "—"}
							</div>
						</div>
					))}
					{draft.quality?.detectedToothCodes &&
						(draft.quality.detectedToothCodes ?? []).length > 0 && (
							<p className="text-xs text-muted">
								Зубы:{" "}
								<span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
									{(draft.quality.detectedToothCodes ?? []).join(", ")}
								</span>
							</p>
						)}
					{draft.warnings && (draft.warnings ?? []).length > 0 && (
						<ul className="text-xs text-amber-800 dark:text-amber-200 list-disc pl-4 space-y-0.5">
							{(draft.warnings ?? []).map((w) => (
								<li key={w}>{w}</li>
							))}
						</ul>
					)}
					<div className="flex flex-wrap gap-2 pt-1">
						<button
							type="button"
							data-testid="visit-note-draft-apply"
							onClick={applyDraft}
							className="px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 min-h-[44px] inline-flex items-center justify-center"
						>
							{onApply ? "Вставить в заметку приёма" : "Скопировать"}
						</button>
					</div>
				</div>
			)}
		</section>
	);
};

export default VisitNoteDraftPanel;
