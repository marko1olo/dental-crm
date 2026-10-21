import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

interface DoctorSnilsValidationWidgetProps {
	initialSnils?: string;
	onValidSnils?: (formattedSnils: string) => void;
}

export function DoctorSnilsValidationWidget({
	initialSnils = "",
	onValidSnils,
}: DoctorSnilsValidationWidgetProps) {
	const [snils, setSnils] = useState(initialSnils);
	const [isValidating, setIsValidating] = useState(false);
	const [validationResult, setValidationResult] = useState<{
		ok: boolean;
		formatted?: string;
		message?: string;
	} | null>(null);
	/*
	 * Clinical read headers for EGISZ SNILS check.
	 * BYLO: tolko Content-Type + x-dente-staff-token. Route closed by
	 * requireClinicalReadAccess — without x-dente-admin-secret customer gets 403
	 * and the widget always shows "SNILS failed" while local unguarded env is green.
	 * auth from useAppLogicContext (session secret), not AppHelpers bare helpers.
	 */
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	async function handleValidate() {
		if (!snils.trim()) {
			setValidationResult({
				ok: false,
				message: "Введите СНИЛС врача для проверки.",
			});
			return;
		}

		setIsValidating(true);
		setValidationResult(null);

		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders({
							"Content-Type": "application/json",
						})
					: { "Content-Type": "application/json" };
			const response = await fetch(
				"/api/clinical/egisz/validate-doctor-snils",
				{
					method: "POST",
					headers,
					body: JSON.stringify({ snils }),
				},
			);

			const data = await response.json();
			const formattedSnils = data.formatted || data.snilsFormatted;

			if (response.ok && data.ok) {
				setValidationResult({
					ok: true,
					formatted: formattedSnils,
					message: "СНИЛС врача валиден и подтверждён в реестре медицинских работников (ФРМР).",
				});
				if (onValidSnils && formattedSnils) {
					onValidSnils(formattedSnils);
				}
			} else {
				setValidationResult({
					ok: false,
					message:
						data.message ||
						"СНИЛС не прошёл проверку контрольного числа ФРМР. Сохранение профиля разрешено, но для интеграции с ЕГИСЗ потребуется уточнить номер.",
				});
			}
		} catch (_err) {
			showToast(
				actionFailureToast(
					"Ошибка проверки СНИЛС",
					(_err as { status?: number })?.status ?? null,
				),
				"error",
			);
			setValidationResult({
				ok: false,
				message: "Сервис проверки временно недоступен. Сохранение профиля врача не блокируется.",
			});
		} finally {
			setIsValidating(false);
		}
	}

	return (
		<div className="rounded-xl border border-[var(--line)] p-3 bg-[var(--paper-soft)] space-y-2">
			<div className="flex items-center justify-between">
				<label
					htmlFor="doctor-snils-input"
					className="text-xs font-semibold text-[var(--ink)]"
				>
					СНИЛС врача (реестр медработников ФРМР)
				</label>
				<span className="text-[11px] text-[var(--muted)]">
					Опционально · сохранение доступно всегда
				</span>
			</div>

			<div className="flex items-center gap-2">
				<input
					id="doctor-snils-input"
					type="text"
					value={snils}
					onChange={(e) => setSnils(e.target.value)}
					placeholder="000-000-000 00"
					className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-colors"
				/>
				<button
					type="button"
					disabled={isValidating}
					onClick={handleValidate}
					className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[32px] rounded-lg bg-[var(--teal)] hover:opacity-90 text-[var(--on-teal)] font-medium disabled:opacity-50 transition-all cursor-pointer shadow-xs"
				>
					{isValidating ? (
						<RefreshCw className="w-3.5 h-3.5 animate-spin" />
					) : (
						<CheckCircle2 className="w-3.5 h-3.5" />
					)}
					Проверить СНИЛС
				</button>
			</div>

			{validationResult ? (
				<div
					className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${
						validationResult.ok
							? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
							: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
					}`}
				>
					{validationResult.ok ? (
						<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
					) : (
						<AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					)}
					<div className="min-w-0 flex-1">
						<p className="font-medium m-0 leading-snug">{validationResult.message}</p>
						{validationResult.formatted ? (
							<p className="text-[11px] opacity-90 mt-1 m-0">
								Форматированный СНИЛС:{" "}
								<code className="font-mono bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)] text-[var(--ink)]">
									{validationResult.formatted}
								</code>
							</p>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
