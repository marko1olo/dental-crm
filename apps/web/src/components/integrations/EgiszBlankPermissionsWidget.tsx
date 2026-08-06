import {
	AlertTriangle,
	Info,
	RefreshCcw,
	ShieldCheck,
	ShieldOff,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import {
	classifyFailedHttpStatus,
	type EgiszEndpointOutcome,
	type EgiszTone,
	resolveEgiszCatalogState,
} from "./egiszAvailability";

/**
 * СПРАВОЧНИК ПРАВИЛ ВЫГРУЗКИ ПОЛЕЙ БЛАНКОВ В ЕГИСЗ.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО, И ПОЧЕМУ ЭТО ХУЖЕ ОБЫЧНОЙ ОШИБКИ. Виджет звал
 * GET /api/integrations/egisz-blank-permissions, которого на сервере нет — ответ 404.
 * Тело читалось без проверки res.ok (`.then((res) => res.json())`), объект ошибки не
 * проходил `Array.isArray` и превращался в пустой список, а пустой список печатал
 * «Правила выгрузки бланков ЕГИСЗ не настроены». Администратора отправляли настраивать
 * раздел, которого сервер не отдаёт вообще: невыполнимая работа, поставленная уверенным
 * тоном. Отсутствующий раздел и пустой раздел — разные вещи, и теперь они не сливаются.
 * Второй дефект, не замеченный раньше: запрос уходил вообще без заголовков авторизации
 * (`fetch(url, { })`), то есть был бы отклонён и в случае существующего маршрута.
 *
 * Отсутствие маршрута зафиксировано как долг в
 * apps/api/src/tests/webCallsExistingRoutes.test.ts (KNOWN_MISSING). Виджет не удалён
 * сознательно: клиника обязана видеть, что ни одно поле бланка в ЕГИСЗ не уходило.
 * Ни маршрут, ни таблицу, ни модель согласия пациента этот файл не придумывает.
 */

interface EgiszPermissionItem {
	id: string;
	formCode: string;
	fieldName: string;
	isExportAllowed: boolean;
	patientOptOutRespect: boolean;
}

const TONE_STYLES: Record<
	EgiszTone,
	{ readonly headline: string; readonly icon: string }
> = {
	neutral: {
		headline: "text-slate-900 dark:text-white",
		icon: "text-slate-400 dark:text-slate-500",
	},
	info: { headline: "text-slate-900 dark:text-white", icon: "text-sky-500" },
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
 * Разбор ответа. Не массив — это «ответ не разобран», а не «правил нет»: подстановка
 * пустого списка на месте непонятного тела и была источником лжи. Строка без
 * обязательных полей отбрасывается, чтобы на экран не попало пустое место вместо
 * названия поля.
 */
function readBlankPermissions(
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
		});
	}
	// Тело было массивом, но ни одна строка не имеет нужных полей — это тоже
	// несовпадение версий, а не «правил не создано».
	if (rows.length === 0 && raw.length > 0) return { kind: "unreadable" };
	return { kind: "ok", data: rows };
}

export const EgiszBlankPermissionsWidget: React.FC = () => {
	const [outcome, setOutcome] = useState<EgiszEndpointOutcome<
		readonly EgiszPermissionItem[]
	> | null>(null);

	const load = useCallback(async () => {
		setOutcome(null);
		try {
			const res = await fetch("/api/integrations/egisz-blank-permissions", {
				headers: auth.denteClinicalReadHeaders(),
			});
			// res.ok проверяется ДО чтения тела. Чтение тела раньше проверки и
			// превращало ошибку в пустой список.
			if (!res.ok) {
				setOutcome(classifyFailedHttpStatus(res.status));
				return;
			}
			setOutcome(readBlankPermissions(await res.json()));
		} catch {
			setOutcome({ kind: "network" });
		}
	}, []);

	useEffect(() => {
		void load();
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
			className="p-4 rounded-xl shadow-sm border my-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
				<h3 className="m-0 font-semibold text-cyan-700 dark:text-cyan-400 break-words">
					Выгрузка полей бланков в ЕГИСЗ
				</h3>
				<span className="self-start sm:self-auto shrink-0 text-xs bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800 px-2 py-0.5 rounded font-medium">
					Правила ЕГИСЗ
				</span>
			</div>

			{/*
				Состояние раздела всегда написано словами на самом экране. Прежняя
				версия объясняла раздел только в атрибуте title, которого не видно.
			*/}
			<div className="flex items-start gap-3">
				<StateIcon
					size={20}
					className={`shrink-0 mt-0.5 ${tone.icon} ${isLoading ? "animate-spin" : ""}`}
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<p className={`m-0 text-sm font-medium break-words ${tone.headline}`}>
						{state.headline}
					</p>
					<p className="m-0 mt-1 text-xs text-slate-600 dark:text-slate-400 break-words">
						{state.detail}
					</p>
				</div>
			</div>

			{state.canRetryLoad && (
				<button
					type="button"
					onClick={() => void load()}
					disabled={isLoading}
					className="mt-3 flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
				>
					<RefreshCcw size={14} aria-hidden="true" />
					Проверить снова
				</button>
			)}

			{rows.length > 0 && (
				<div className="space-y-3 mt-3">
					{rows.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div className="min-w-0">
								<div className="text-sm font-bold text-slate-900 dark:text-slate-200 break-words">
									{item.formCode} —{" "}
									<span className="text-cyan-700 dark:text-cyan-300 font-semibold">
										{item.fieldName}
									</span>
								</div>
								<div className="text-xs text-slate-600 dark:text-slate-400 mt-1 break-words">
									Отказ пациента от выгрузки:{" "}
									{item.patientOptOutRespect ? "учитывается" : "не учитывается"}
								</div>
							</div>
							<div className="flex items-center gap-2 text-xs shrink-0">
								{item.isExportAllowed ? (
									<span className="bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800 px-2.5 py-1 rounded">
										Выгрузка разрешена
									</span>
								) : (
									<span className="bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-2.5 py-1 rounded">
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
