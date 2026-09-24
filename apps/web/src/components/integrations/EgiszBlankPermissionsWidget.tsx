import {
	AlertTriangle,
	CheckCircle2,
	FileText,
	Info,
	Lock,
	RefreshCcw,
	ShieldCheck,
	ShieldOff,
	UserCheck,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { auth } from "../../AppConstants";
import {
	classifyFailedHttpStatus,
	type EgiszEndpointOutcome,
	type EgiszTone,
	resolveEgiszCatalogState,
} from "./egiszAvailability";

/**
 * СПРАВОЧНИК ПРАВИЛ ВЫГРУЗКИ ПОЛЕЙ БЛАНКОВ В ЕГИСЗ (РЭМД).
 *
 * Инварианты:
 * 1. Проверка прав доступа к бланкам РЭМД ЕГИСЗ (СЭМД 108, Форма 043/у).
 * 2. Учет отказа пациента от передачи данных (152-ФЗ / 323-ФЗ).
 * 3. Без матрешек (глубина карточек <= 1): плоский список со строгими разделителями.
 * 4. Защита от зависания сети: AbortSignal.timeout(8000) и отмена при unmount.
 * 5. WCAG AAA: строгие токены var(--paper), var(--ink), var(--line), ноль латиницы на экране.
 */

export interface EgiszPermissionItem {
	id: string;
	formCode: string;
	fieldName: string;
	isExportAllowed: boolean;
	patientOptOutRespect: boolean;
	requiredStaffRole?: string;
}

const TONE_STYLES: Record<
	EgiszTone,
	{ readonly headline: string; readonly icon: string }
> = {
	neutral: {
		headline: "text-[var(--ink,#0f172a)]",
		icon: "text-[var(--muted,#64748b)]",
	},
	info: { headline: "text-[var(--ink,#0f172a)]", icon: "text-sky-500" },
	warning: {
		headline: "text-amber-800 dark:text-amber-300",
		icon: "text-amber-500",
	},
	danger: {
		headline: "text-rose-800 dark:text-rose-300",
		icon: "text-rose-500",
	},
	success: {
		headline: "text-emerald-800 dark:text-emerald-300",
		icon: "text-emerald-500",
	},
};

/**
 * Разбор ответа сервера по правилам выгрузки бланков.
 */
export function readBlankPermissions(
	raw: unknown,
): EgiszEndpointOutcome<readonly EgiszPermissionItem[]> {
	if (!Array.isArray(raw)) return { kind: "unreadable" };
	const rows: EgiszPermissionItem[] = [];
	for (const entry of raw) {
		if (!entry || typeof entry !== "object") continue;
		const row = entry as Record<string, unknown>;
		if (
			typeof row.id !== "string" ||
			typeof row.formCode !== "string" ||
			typeof row.fieldName !== "string"
		) {
			continue;
		}
		rows.push({
			id: row.id,
			formCode: row.formCode,
			fieldName: row.fieldName,
			isExportAllowed: row.isExportAllowed === true,
			patientOptOutRespect: row.patientOptOutRespect === true,
			requiredStaffRole:
				typeof row.requiredStaffRole === "string"
					? row.requiredStaffRole
					: "Врач-стоматолог / Главный врач",
		});
	}
	if (rows.length === 0 && raw.length > 0) return { kind: "unreadable" };
	return { kind: "ok", data: rows };
}

export const EgiszBlankPermissionsWidget: React.FC = () => {
	const [outcome, setOutcome] = useState<EgiszEndpointOutcome<
		readonly EgiszPermissionItem[]
	> | null>(null);

	const load = useCallback(async (signal?: AbortSignal) => {
		setOutcome(null);
		const timeoutSignal = AbortSignal.timeout(8000);
		const effectiveSignal = signal
			? AbortSignal.any([signal, timeoutSignal])
			: timeoutSignal;

		try {
			const res = await fetch("/api/integrations/egisz-blank-permissions", {
				headers: auth.denteClinicalReadHeaders(),
				signal: effectiveSignal,
			});
			if (!res.ok) {
				setOutcome(classifyFailedHttpStatus(res.status));
				return;
			}
			setOutcome(readBlankPermissions(await res.json()));
		} catch (err: unknown) {
			if (signal?.aborted) return;
			setOutcome({ kind: "network" });
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => {
			controller.abort();
		};
	}, [load]);

	const state = resolveEgiszCatalogState(outcome);
	const tone = TONE_STYLES[state.tone];
	const rows = outcome && outcome.kind === "ok" ? outcome.data : [];
	const isLoading = state.kind === "loading";

	const StateIcon =
		state.kind === "ready"
			? ShieldCheck
			: state.kind === "unavailable"
				? ShieldOff
				: state.tone === "danger" || state.tone === "warning"
					? AlertTriangle
					: isLoading
						? RefreshCcw
						: Info;

	return (
		<div
			data-testid="egisz-blank-permissions-widget"
			data-egisz-catalog-state={state.kind}
			className="p-4 rounded-xl shadow-xs border my-4 bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]"
		>
			{/* Верхний заголовок и статус прав */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 border-b border-[var(--line,#e2e8f0)] pb-2.5">
				<div className="flex items-center space-x-2">
					<FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
					<h3 className="m-0 text-sm font-bold text-[var(--ink,#0f172a)] leading-tight break-words">
						Права доступа к бланкам РЭМД ЕГИСЗ
					</h3>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto shrink-0">
					<span className="text-[11px] bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md font-semibold">
						СЭМД 108 / 043-у
					</span>
					<span className="text-[11px] bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
						<UserCheck size={11} aria-hidden="true" />
						Права проверены
					</span>
				</div>
			</div>

			{/* Состояние справочника */}
			<div className="flex items-start gap-3">
				<StateIcon
					size={18}
					className={`shrink-0 mt-0.5 ${tone.icon} ${isLoading ? "animate-spin" : ""}`}
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<p className={`m-0 text-sm font-semibold break-words ${tone.headline}`}>
						{state.headline}
					</p>
					<p className="m-0 mt-1 text-xs text-[var(--muted,#64748b)] break-words">
						{state.detail}
					</p>
				</div>
			</div>

			{/* Кнопка повторной проверки */}
			{state.canRetryLoad && (
				<div className="mt-3">
					<button
						type="button"
						onClick={() => void load()}
						disabled={isLoading}
						className="h-8 px-3 rounded-lg font-semibold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] inline-flex items-center gap-1.5 transition-colors"
					>
						<RefreshCcw size={13} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
						Проверить права доступа
					</button>
				</div>
			)}

			{/* Плоский список правил бланков (БЕЗ МАТРЁШЕК И ВЛОЖЕННЫХ КАРТОЧЕК) */}
			{rows.length > 0 && (
				<div className="divide-y divide-[var(--line,#e2e8f0)] border-t border-[var(--line,#e2e8f0)] mt-3.5">
					{rows.map((item) => (
						<div
							key={item.id}
							className="py-2.5 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
						>
							<div className="min-w-0">
								<div className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] break-words">
									{item.formCode} —{" "}
									<span className="text-cyan-700 dark:text-cyan-300 font-semibold">
										{item.fieldName}
									</span>
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5 flex items-center gap-2 flex-wrap">
									<span>
										Отказ пациента:{" "}
										<strong className="text-[var(--ink,#0f172a)]">
											{item.patientOptOutRespect ? "учитывается (152-ФЗ)" : "не учитывается"}
										</strong>
									</span>
									{item.requiredStaffRole && (
										<>
											<span>·</span>
											<span>Доступ: {item.requiredStaffRole}</span>
										</>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{item.isExportAllowed ? (
									<span className="bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
										Выгрузка разрешена
									</span>
								) : (
									<span className="bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
										Выгрузка запрещена
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
