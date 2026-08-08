import { motion } from "framer-motion";
import { Activity, Box, CheckCircle2, ScanLine, XCircle } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "./components/GlobalToast";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { actionFailureToast, requestFailureCause } from "./lib/panelStateText";
import { logger } from "./utils/logger";
import "./ScannerView.css";

/**
 * Запись журнала стерилизации в том виде, в каком её отдаёт сервер.
 *
 * Раньше журнал лежал в `any[]`, и разметка читала `log.autoclaveId || "ОСНОВНОЙ"`:
 * лоток, обработанный в резервном автоклаве, в журнале выглядел бы как основной,
 * если бы поле не пришло. В журнале стерилизации это не косметика — по нему
 * отвечают на вопрос, каким аппаратом обработан инструмент.
 *
 * Поля повторяют колонки sterilization_logs (apps/api/src/db/schema.ts:1704) и
 * ответ GET /api/sterilization/logs, который возвращает строки таблицы целиком.
 */
type SterilizationLog = {
	id: string;
	barcode: string;
	autoclaveId: string | null;
	status: "passed" | "failed";
	timestamp: string;
};

function isSterilizationLog(value: unknown): value is SterilizationLog {
	if (!value || typeof value !== "object") return false;
	const row = value as Record<string, unknown>;
	return typeof row.id === "string" && typeof row.barcode === "string";
}

function formatLogTime(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "время не указано";
	return parsed.toLocaleString("ru-RU");
}

/**
 * Отказ доступа человеческими словами, с различением двух разных отказов.
 *
 * Все три адреса журнала закрыты guard-ом requireResolvedStaffOrAdminOrganizationId
 * (apps/api/src/accessGuard.ts:115): ему недостаточно токена кабинета, нужен вход
 * сотрудника. Проверено запросом к живому серверу: с одним токеном кабинета адрес
 * отвечает 401 StaffAuthRequired, с обоими — 200. Это два разных действия
 * пользователя, поэтому «нет доступа» здесь не годится: сказать надо, что войти
 * нужно именно сотрудником по PIN, иначе он будет перезаходить в кабинет по кругу.
 */
async function accessFailureMessage(
	response: Response,
	prefix: string,
): Promise<string> {
	let code = "";
	let serverMessage = "";
	try {
		const payload = (await response.json()) as {
			error?: unknown;
			message?: unknown;
		};
		if (typeof payload.error === "string") code = payload.error;
		if (typeof payload.message === "string")
			serverMessage = payload.message.trim();
	} catch {
		// Тело не разобралось — останется код ответа.
	}
	/*
	 * StaffAuthRequired — отдельное действие оператора (PIN смены), не «нет
	 * доступа к кабинету». Код важнее общего message: guard отдаёт короткий
	 * error-code, а человеку нужен именно сценарий входа сотрудника.
	 */
	if (code === "StaffAuthRequired") {
		return `${prefix}: журнал ведётся от имени сотрудника. Войдите по PIN в разделе смены — записи в журнале подписываются именно им.`;
	}
	/*
	 * MESSAGE-FIRST GAMEPLAY.
	 *
	 * API sterilization scan уже отдаёт 400 ValidationError с русской строкой
	 * («Проверьте данные стерилизации: barcode, autoclaveId и status.» —
	 * routes/sterilization.ts). Раньше читался только payload.error, и на 400
	 * оператор видел status-only requestFailureCause — серверный текст выбрасывался.
	 * Кириллическое message с сервера показываем как есть (как convert/booking
	 * и workspace profile): это и есть ответ «что исправить на экране».
	 */
	if (
		serverMessage &&
		serverMessage !== "Internal Server Error" &&
		/[А-Яа-яЁё]/.test(serverMessage)
	) {
		return serverMessage;
	}
	if (response.status === 401 || response.status === 403) {
		return `${prefix}: нет доступа. Войдите в кабинет клиники заново.`;
	}
	/*
	 * БЫЛО: «сервер ответил кодом 500». Номер ответа не говорит человеку ни что
	 * случилось, ни что делать; он нужен поддержке и остаётся в консоли.
	 * Формулировки причин общие с остальными панелями — lib/panelStateText.ts.
	 */
	logger.error(`[ScannerView] ${response.url} ответил ${response.status}`);
	return `${prefix}: ${requestFailureCause(response.status)}.`;
}

export function ScannerView() {
	const { auth } = useAppLogicContext();
	const [barcode, setBarcode] = useState("");
	const [autoclaveId, setAutoclaveId] = useState("");
	/*
	 * РЕЗУЛЬТАТ ОБРАБОТКИ НЕ ПОДСТАВЛЕН ЗАРАНЕЕ.
	 *
	 * Здесь стояло `useState("passed")`, то есть поле «Результат» при открытии
	 * экрана уже утверждало «Обработан». Рабочий цикл его не касается вообще:
	 * фокус ставится на штрих-код (эффект ниже), физический сканер печатает код
	 * и жмёт Enter, форма уходит. Значит клиника могла записать в журнал
	 * стерилизации всю партию лотков как обработанные, ни разу не подтвердив
	 * это своей рукой — а именно этим журналом она отчитывается перед проверкой
	 * и по нему решают, можно ли брать инструмент.
	 *
	 * Пустое значение — не выбранное. Отправка без выбора не даёт: сервер ждёт
	 * z.enum(["passed","failed"]) (apps/api/src/routes/sterilization.ts:9-14) и
	 * на пустой строке ответил бы разбором схемы, а не человеческим текстом.
	 * Выбранный результат сохраняется для следующего лотка — партию обрабатывают
	 * подряд, и он всё время виден в поле над штрих-кодом.
	 */
	const [status, setStatus] = useState<"" | "passed" | "failed">("");
	const [isScanning, setIsScanning] = useState(false);
	const [logs, setLogs] = useState<SterilizationLog[]>([]);
	const [isLoadingLogs, setIsLoadingLogs] = useState(true);
	/*
	 * Текст ошибки загрузки журнала. Без него единственной реакцией на недоступный
	 * сервер был logger.error, а на экране оставалось «Журнал пуст. Начните
	 * сканирование» — то же самое, что видит клиника в свой первый день. Пустой
	 * журнал стерилизации и незагруженный журнал стерилизации — разные вещи: по
	 * первому отвечают проверяющему, по второму зовут админа.
	 */
	const [loadError, setLoadError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const loadLogs = useCallback(async () => {
		setIsLoadingLogs(true);
		try {
			const res = await fetch("/api/sterilization/logs", {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!res.ok) {
				setLoadError(
					await accessFailureMessage(res, "Журнал стерилизации не показан"),
				);
				return;
			}
			const data: unknown = await res.json();
			setLogs(Array.isArray(data) ? data.filter(isSterilizationLog) : []);
			setLoadError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error(error);
			setLoadError(
				/*
				 * БЫЛО: «нет связи с сервером. Список ниже неполный.» Два изъяна.
				 * Первый: следующего шага нет вовсе, тогда как соседняя ветка того же
				 * загрузчика (accessFailureMessage) действие называет всегда — в одной
				 * функции получилось два языка ошибок. Второй: «неполный» неверно: при
				 * отказе `logs` остаётся тем, что было, а при первой загрузке он пуст,
				 * то есть ниже не часть журнала, а ничего.
				 */
				`Журнал стерилизации не загружен: ${requestFailureCause(null)}. Прежние записи не показаны — отчитываться перед проверкой по этому экрану нельзя, пока журнал не прочитан.`,
			);
		} finally {
			setIsLoadingLogs(false);
		}
	}, [auth]);

	useEffect(() => {
		// Поле под фокусом сразу: физический сканер печатает штрих-код как клавиатура.
		inputRef.current?.focus();
		void loadLogs();
	}, [loadLogs]);

	/*
	 * СПИСОК АВТОКЛАВОВ БЕРЁТСЯ ИЗ ЖУРНАЛА, А НЕ ИЗ ЗАШИТЫХ ТРЁХ НАЗВАНИЙ.
	 *
	 * Здесь стоял <select> с «ОСНОВНОЙ», «РЕЗЕРВНЫЙ» и «MELAtronic 23». Ни одна
	 * клиника не обязана иметь именно такой парк: у кого-то один автоклав с другим
	 * именем, у кого-то четыре. Справочника автоклавов в базе нет — колонка
	 * autoclave_id это свободный текст, поэтому единственный честный источник
	 * подсказок это те аппараты, которые в журнале уже встречались. Название
	 * вводится текстом, встречавшиеся подставляются из datalist, а последний
	 * использованный подставляется в поле сам: подряд обрабатывают в одном аппарате.
	 */
	const knownAutoclaves = useMemo(() => {
		const seen: string[] = [];
		for (const log of logs) {
			const name = log.autoclaveId?.trim();
			if (name && !seen.includes(name)) seen.push(name);
		}
		return seen;
	}, [logs]);

	useEffect(() => {
		if (autoclaveId.trim()) return;
		const lastUsed = knownAutoclaves[0];
		if (lastUsed) setAutoclaveId(lastUsed);
	}, [knownAutoclaves, autoclaveId]);

	const handleScan = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isScanning) return;
		if (!barcode.trim()) return;
		/*
		 * Сервер требует непустой autoclaveId (zod min(1)) и на пустом отвечает 400
		 * с разбором схемы. Проверяем здесь, чтобы сказать это словами, а не кодом.
		 */
		if (!autoclaveId.trim()) {
			showToast(
				"Укажите автоклав: без названия аппарата запись в журнал не имеет смысла",
				"error",
			);
			return;
		}
		if (!status) {
			showToast(
				"Выберите результат: лоток прошёл обработку или забракован. Журнал стерилизации отвечает именно на этот вопрос, поэтому заранее он не заполнен",
				"error",
			);
			return;
		}

		setIsScanning(true);

		try {
			const res = await fetch("/api/sterilization/scan", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					barcode: barcode.trim(),
					autoclaveId: autoclaveId.trim(),
					status,
				}),
			});

			if (!res.ok) {
				/*
				 * БЫЛО: «Ошибка валидации лотка» на любой отказ, включая отсутствие
				 * входа сотрудника и недоступный сервер. Лоток при этом ни при чём.
				 */
				showToast(
					await accessFailureMessage(res, "Запись в журнал не создана"),
					"error",
				);
				return;
			}

			showToast(
				status === "passed"
					? `Лоток ${barcode.trim()} записан как обработанный`
					: `Лоток ${barcode.trim()} записан как брак — инструмент использовать нельзя`,
				status === "passed" ? "success" : "warning",
			);
			setBarcode("");
			void loadLogs();
		} catch (error) {
			logger.error(error);
			showToast("Нет связи с сервером: запись в журнал не создана", "error");
		} finally {
			setIsScanning(false);
			inputRef.current?.focus();
		}
	};

	return (
		<motion.div
			className="scanner-view-container glass-panel"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div className="scanner-header">
				<ScanLine size={32} color="var(--teal)" />
				<h1 className="scanner-title">Стерилизация инструментов</h1>
			</div>

			<div className="scanner-card">
				{/* Луч сканера: анимация показывает, что запрос ушёл. */}
				<div className={`scanner-laser ${isScanning ? "active" : ""}`} />

				<form onSubmit={handleScan} className="scanner-form">
					<p className="scanner-hint">
						Наведите сканер на штрих-код лотка с инструментами или введите код
						вручную. Запись попадёт в журнал автоклава — по нему отчитываются
						перед проверкой.
					</p>

					<div className="scanner-select-group">
						<label className="scanner-field">
							<span className="scanner-field-label">Автоклав</span>
							<input
								type="text"
								list="scanner-known-autoclaves"
								value={autoclaveId}
								onChange={(e) => setAutoclaveId(e.target.value)}
								placeholder="Название аппарата, например MELAtronic 23"
								className="scanner-select"
							/>
							<datalist id="scanner-known-autoclaves">
								{knownAutoclaves.map((name) => (
									<option key={name} value={name} />
								))}
							</datalist>
						</label>

						<label className="scanner-field">
							<span className="scanner-field-label">Результат</span>
							<select
								value={status}
								onChange={(e) =>
									setStatus(e.target.value as "" | "passed" | "failed")
								}
								className="scanner-select"
							>
								{/*
									Пустой вариант остаётся в списке: без него браузер показал бы
									первый вариант «Обработан», хотя выбора ещё не было, — та же
									ложь на экране, только без значения в состоянии.
								*/}
								<option value="">Не выбрано</option>
								<option value="passed">Обработан</option>
								<option value="failed">Брак</option>
							</select>
						</label>
					</div>

					<input
						ref={inputRef}
						type="text"
						value={barcode}
						onChange={(e) => setBarcode(e.target.value)}
						placeholder="Штрих-код лотка, например TRAY-1049"
						aria-label="Штрих-код лотка"
						className="scanner-input"
					/>
					<button
						type="submit"
						disabled={isScanning || !barcode.trim()}
						className="scanner-btn"
					>
						{isScanning ? "Записываем..." : "Записать лоток в журнал"}
					</button>
				</form>
			</div>

			<div className="scanner-log-section">
				<h3 className="scanner-log-title">
					<Activity size={20} color="var(--teal)" /> Журнал стерилизации
				</h3>

				{loadError ? (
					<div className="scanner-load-error" role="alert">
						<p>{loadError}</p>
						<button
							type="button"
							className="secondary-button"
							onClick={() => void loadLogs()}
						>
							Повторить
						</button>
					</div>
				) : null}

				{isLoadingLogs && logs.length === 0 ? (
					<div className="scanner-empty" aria-busy="true">
						<p>Загружаем журнал...</p>
					</div>
				) : logs.length > 0 ? (
					<div className="scanner-grid">
						<div className="scanner-grid-header">
							<div>Штрих-код</div>
							<div>Автоклав</div>
							<div>Статус</div>
							<div className="scanner-cell-right">Время</div>
						</div>
						{logs.map((log) => (
							<div className="scanner-log-row" key={log.id}>
								<div className="log-barcode">{log.barcode}</div>
								<div className="log-autoclave">
									<Box size={16} />{" "}
									{/*
										БЫЛО: `log.autoclaveId || "ОСНОВНОЙ"` — отсутствие названия
										аппарата в журнале выдавалось за конкретный аппарат.
									*/}
									{log.autoclaveId?.trim() || "аппарат не указан"}
								</div>
								<div>
									{log.status === "passed" ? (
										<span className="badge-success">
											<CheckCircle2 size={16} /> Обработан
										</span>
									) : (
										<span className="badge-error">
											<XCircle size={16} /> Брак
										</span>
									)}
								</div>
								<div className="log-time">{formatLogTime(log.timestamp)}</div>
							</div>
						))}
					</div>
				) : loadError ? null : (
					<div className="scanner-empty">
						<p>
							В журнале пока нет записей. Отсканируйте первый лоток — запись
							появится здесь и останется как подтверждение обработки.
						</p>
					</div>
				)}
			</div>
		</motion.div>
	);
}
