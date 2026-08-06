import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

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

			if (response.ok && data.ok) {
				setValidationResult({
					ok: true,
					formatted: data.formatted,
					message: "СНИЛС врача валиден и соответствует формату ЕГИСЗ (ФРМР).",
				});
				if (onValidSnils && data.formatted) {
					onValidSnils(data.formatted);
				}
			} else {
				setValidationResult({
					ok: false,
					message:
						data.message ||
						"СНИЛС врача не прошёл проверку формата или контрольного числа ЕГИСЗ.",
				});
			}
		} catch (err) {
			setValidationResult({
				ok: false,
				message: "Сбой сети при проверке СНИЛС в ЕГИСЗ.",
			});
		} finally {
			setIsValidating(false);
		}
	}

	return (
		<div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
			<div className="flex items-center justify-between">
				<label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
					Проверка СНИЛС врача (ЕГИСЗ / ФРМР)
				</label>
			</div>

			<div className="flex items-center gap-2">
				<input
					type="text"
					value={snils}
					onChange={(e) => setSnils(e.target.value)}
					placeholder="000-000-000 00"
					className="flex-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
				/>
				<button
					type="button"
					disabled={isValidating}
					onClick={handleValidate}
					className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 transition-colors"
				>
					{isValidating ? (
						<RefreshCw className="w-3.5 h-3.5 animate-spin" />
					) : (
						<CheckCircle2 className="w-3.5 h-3.5" />
					)}
					Проверить в ЕГИСЗ
				</button>
			</div>

			{validationResult ? (
				<div
					className={`flex items-start gap-1.5 text-xs p-2 rounded ${
						validationResult.ok
							? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
							: "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
					}`}
				>
					{validationResult.ok ? (
						<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
					) : (
						<AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
					)}
					<div>
						<p className="font-medium">{validationResult.message}</p>
						{validationResult.formatted ? (
							<p className="text-[11px] opacity-90 mt-0.5">
								Форматированный СНИЛС:{" "}
								<code className="font-mono bg-white/50 dark:bg-black/40 px-1 rounded">
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
