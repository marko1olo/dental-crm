import { Delete, Lock, LogOut, UserCheck } from "lucide-react";
import { useState } from "react";
import {
	actionFailureToast,
	NO_RESPONSE_CAUSE,
	panelStateText,
} from "../../lib/panelStateText";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	resolveStaffUnlockListState,
	resolveStaffUnlockPhase,
	STAFF_UNLOCK_LIST_SUBJECT,
} from "./staffUnlockState";

interface StaffPinPadProps {
	/**
	 * Список сотрудников КАК ПРИШЁЛ, без подстановок.
	 *
	 * Тип `unknown`, а не `any[]`, и это главное в этом интерфейсе. Раньше здесь
	 * стояло `any[]`, а `App.tsx` дописывал `?? []`, чтобы тип сошёлся, — и тем
	 * самым превращал «список не прочитан» в «список прочитан и пуст». Экран
	 * сообщал «в клинике нет ни одного действующего сотрудника» при трёх
	 * действующих сотрудниках в базе, и войти в программу было нельзя вообще.
	 * Отсутствие списка обязано доехать сюда как отсутствие.
	 */
	staffMembers: unknown;
	/** Сводка клиники ещё едет: список отсутствует закономерно, это не отказ. */
	staffListLoading: boolean;
	/**
	 * Код ответа, по которому не удалось прочитать список; `null` — до сервера не
	 * дошли вовсе. Нужен, чтобы причина отказа называлась словами из общего
	 * словаря, а не выдумывалась здесь.
	 */
	staffListStatus: number | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onUnlockSuccess: (user: any) => void;
	onClinicLogout: () => void;
	/** Перечитать данные клиники: единственный способ повторить, кроме перезахода. */
	onRetryStaffList: () => void;
}

export function StaffPinPad({
	staffMembers,
	staffListLoading,
	staffListStatus,
	onUnlockSuccess,
	onClinicLogout,
	onRetryStaffList,
}: StaffPinPadProps) {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [selectedUser, setSelectedUser] = useState<any>(null);
	const [pin, setPin] = useState("");
	const [errorShake, setErrorShake] = useState(false);
	const [loading, setLoading] = useState(false);
	/*
	 * Текст отказа держим на экране, а не только во всплывающем уведомлении.
	 * Тост живёт 4 секунды и уезжает, а сотрудник у стойки в этот момент смотрит
	 * на цифры, а не в угол экрана: единственным следом отказа оставалась тряска
	 * поля и стёртый PIN, то есть «PIN неверен» и «сервер не ответил» выглядели
	 * одинаково. Теперь причина остаётся рядом с клавиатурой до следующей попытки.
	 */
	const [errorText, setErrorText] = useState<string | null>(null);

	/*
	 * Три состояния списка вместо двух, и решение о них живёт НЕ в разметке.
	 *
	 * БЫЛО: `Array.isArray(staffMembers) ? staffMembers.filter(m => m?.active ?? true) : []`
	 * плюс ветка `activeStaff.length === 0` ниже. Правило было размазано по двум
	 * местам, проверить его было нечем, и `?? []` в App.tsx сводил оба состояния в
	 * одно. Теперь правило — функция без React, и её охраняет
	 * tests/staffUnlockListState.test.ts.
	 */
	const listState = resolveStaffUnlockListState(staffMembers);
	const listPhase = resolveStaffUnlockPhase({
		isLoading: staffListLoading,
		list: listState,
	});
	const activeStaff = listState.phase === "ready" ? listState.activeStaff : [];

	/** Один отказ — одна причина: и в уведомлении, и на экране, и в стёртом PIN. */
	const failUnlock = (message: string) => {
		showToast(message, "error");
		setErrorText(message);
		setErrorShake(true);
		setPin("");
		setTimeout(() => setErrorShake(false), 500);
	};

	const handleKeyPress = (num: string) => {
		if (loading || pin.length >= 4) return;
		// Новый набор — прежняя причина отказа больше не описывает то, что на экране.
		if (errorText) setErrorText(null);
		const newPin = pin + num;
		setPin(newPin);

		if (newPin.length === 4) {
			submitPin(newPin);
		}
	};

	const handleBackspace = () => {
		if (loading) return;
		setPin(pin.slice(0, -1));
	};

	const submitPin = async (completedPin: string) => {
		if (!selectedUser) return;
		setLoading(true);
		setErrorShake(false);
		setErrorText(null);

		try {
			const clinicToken = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY);
			const response = await fetch("/api/auth/staff/unlock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify({
					userId: selectedUser.id,
					pinCode: completedPin,
				}),
			});

			/*
			 * БЫЛО: `const data = await response.json()` без всякой защиты, до проверки
			 * response.ok. Сервер отвечает JSON только пока он вообще жив: страница
			 * ошибки прокси, перезапуск API, пустое тело 500 — всё это не JSON, парсер
			 * бросал SyntaxError, и в catch попадала его английская строка вида
			 * «Unexpected token '<' ... is not valid JSON». Именно её сотрудник и видел
			 * в красном уведомлении: ни что случилось, ни что делать.
			 *
			 * Поэтому тело читаем текстом и разбираем сами: провал разбора — это отказ
			 * сервера, а не неверный PIN, и говорится он разными словами.
			 */
			const rawBody = await response.text();
			let payload: {
				message?: unknown;
				staffToken?: unknown;
				user?: { fullName?: unknown };
			} | null = null;
			if (rawBody) {
				try {
					payload = JSON.parse(rawBody);
				} catch {
					// Диагностика — разработчику в консоль, человеку — человеческий текст ниже.
					logger.error(
						"[StaffPinPad] ответ сервера не JSON",
						response.status,
						rawBody.slice(0, 200),
					);
				}
			}

			if (!response.ok) {
				/*
				 * Сервер уже говорит по-русски и по делу: «Неверный PIN-код.» (401),
				 * «Сначала выполните вход в кабинет клиники.» (401 ClinicAuthRequired),
				 * «Необходимо указать сотрудника и ввести PIN-код.» (400)
				 * — apps/api/src/routes/auth.ts:174-211. Его формулировку и показываем,
				 * но только если она действительно по-русски: обработчика ненайденного
				 * адреса у API нет, и на несовпадение версий Fastify отвечает своим
				 * английским «Route POST:/api/auth/staff/unlock not found». Ровно такую же
				 * проверку делает сам сервер, прежде чем показать человеку текст
				 * исключения (apps/api/src/server.ts:226-233).
				 * Своя причина нужна там, где сервер ничего внятного не прислал: тогда
				 * берём общий разбор кода ответа, тот же что у остальных панелей.
				 */
				const rawMessage =
					typeof payload?.message === "string" ? payload.message.trim() : "";
				const serverMessage = /[А-Яа-яЁё]/.test(rawMessage) ? rawMessage : "";
				failUnlock(
					serverMessage ||
						actionFailureToast("Смена не открыта", response.status),
				);
				return;
			}

			/*
			 * Успешный код ответа ещё не значит, что в теле есть ключ смены. Раньше
			 * `data.staffToken` брался слепо: при ответе без него в localStorage
			 * попадало "undefined", а `data.user.fullName` бросал TypeError, и снова
			 * английский текст выдавался за неверный PIN.
			 */
			const staffToken =
				typeof payload?.staffToken === "string"
					? payload.staffToken.trim()
					: "";
			const unlockedUser =
				payload?.user && typeof payload.user === "object" ? payload.user : null;
			if (!staffToken || !unlockedUser) {
				failUnlock(
					"Смена не открыта: сервер принял PIN, но не выдал ключ смены. Обновите страницу и повторите, а если повторится — сообщите администратору.",
				);
				return;
			}

			try {
				safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, staffToken);
			} catch (storageError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(storageError as { status?: number })?.status ?? null,
					),
					"error",
				);
				/*
				 * Запись в localStorage запрещена (приватный режим, переполненное
				 * хранилище). PIN при этом верен, и говорить «нет связи» было бы ложью.
				 */
				logger.error(storageError);
				failUnlock(
					"PIN верный, но браузер не дал сохранить ключ смены. Отключите приватный режим или освободите место в браузере и повторите.",
				);
				return;
			}

			const greetingName =
				typeof unlockedUser.fullName === "string" &&
				unlockedUser.fullName.trim()
					? unlockedUser.fullName.trim()
					: typeof selectedUser.fullName === "string" &&
							selectedUser.fullName.trim()
						? selectedUser.fullName.trim()
						: "коллега";
			showToast(`Добро пожаловать, ${greetingName}!`, "success");
			onUnlockSuccess(unlockedUser);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			/*
			 * Сюда попадает только обрыв до ответа: fetch бросает TypeError, когда
			 * сервера нет на месте или сеть пропала. Это не «Неверный PIN-код», как
			 * было написано раньше, и повторный набор тут не поможет.
			 */
			logger.error(err);
			failUnlock(`Смена не открыта: ${NO_RESPONSE_CAUSE}.`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-overlay">
			<div className="auth-glow auth-glow--left"></div>
			<div className="auth-glow auth-glow--right"></div>

			<div className="auth-modal auth-modal--wide animate-fade-in-up">
				{/* Left Side: Staff Selector */}
				<div className="auth-modal-left">
					<div className="auth-header">
						<h3 className="auth-title">Сотрудники клиники</h3>
						<p className="auth-subtitle">
							Выберите свой профиль для разблокировки смены
						</p>
					</div>

					<div className="auth-staff-grid">
						{/*
              ЧЕТЫРЕ СОСТОЯНИЯ, А НЕ ДВА.

              БЫЛО: «Список сотрудников загружается или пуст» — два разных
              состояния одной строкой. Потом это разделили на «не пришёл с
              сервера» и «сотрудников нет», но первая ветка была НЕДОСТИЖИМА:
              App.tsx подставлял `?? []`, и любой непрочитанный список приходил
              сюда пустым массивом. Экран советовал заводить кадры клинике, у
              которой в базе трое действующих сотрудников, и войти в программу
              было нельзя.

              Текст отказа берётся из общего словаря панелей и рисуется общим
              компонентом: второй язык ошибок на экране входа путал бы сильнее
              самого отказа. Кнопка «Выйти из аккаунта клиники» ниже остаётся
              видимой во всех состояниях — при отказе это второй путь наружу,
              кроме повтора.
            */}
						{listPhase === "loading" ? (
							<div
								className="p-4 text-center rounded-xl border border-dashed text-xs text-slate-400 bg-slate-800/40 col-span-full"
								role="status"
								aria-live="polite"
							>
								{
									panelStateText(STAFF_UNLOCK_LIST_SUBJECT, {
										phase: "loading",
									}).title
								}
							</div>
						) : listPhase === "failed" ? (
							<PanelLoadFailure
								subject={STAFF_UNLOCK_LIST_SUBJECT}
								status={staffListStatus}
								onRetry={onRetryStaffList}
								className="col-span-full"
							/>
						) : listPhase === "empty" ? (
							<div className="p-4 text-center rounded-xl border border-dashed text-xs text-slate-400 bg-slate-800/40 col-span-full">
								{
									panelStateText(STAFF_UNLOCK_LIST_SUBJECT, { phase: "empty" })
										.title
								}
								.{" "}
								{
									panelStateText(STAFF_UNLOCK_LIST_SUBJECT, { phase: "empty" })
										.hint
								}
							</div>
						) : (
							(activeStaff ?? []).map((staff) => {
								const isSelected = selectedUser?.id === staff?.id;
								const fullName =
									typeof staff?.fullName === "string" ? staff.fullName : "";
								const initials = fullName
									? (fullName ?? "")
											.split(" ")
											.filter(Boolean)
											.map((part) => part?.[0] ?? "")
											.join("")
											.slice(0, 2)
									: "??";
								return (
									<button
										key={staff?.id}
										type="button"
										className={`auth-staff-card ${isSelected ? "active" : ""}`}
										onClick={() => {
											setSelectedUser(staff);
											setPin("");
											// Отказ относился к прежнему сотруднику — не переносим его на нового.
											setErrorText(null);
										}}
									>
										<div className="auth-staff-avatar bg-indigo-600">
											{initials}
										</div>
										<div className="auth-staff-info">
											{/*
                        Имя и роль приводятся к строке здесь, а не берутся как есть.
                        Список приходит с сервера, и запись со странным значением в
                        этих полях должна показаться странной записью, а не уронить
                        отрисовку всего экрана входа.
                      */}
											<div className="auth-staff-name">
												{fullName || "Без имени"}
											</div>
											<div className="auth-staff-role">
												{typeof staff?.role === "string" ? staff.role : ""}
											</div>
										</div>
									</button>
								);
							})
						)}
					</div>

					<div className="auth-footer-actions">
						<button
							type="button"
							className="auth-link-btn auth-link-btn--muted"
							onClick={onClinicLogout}
						>
							<LogOut size={14} /> Выйти из аккаунта клиники
						</button>
					</div>
				</div>

				{/* Right Side: PIN Entry */}
				<div className="auth-modal-right">
					<div className="auth-pin-header">
						<div className="auth-pin-icon">
							{selectedUser ? <UserCheck size={24} /> : <Lock size={24} />}
						</div>
						<h4>
							{selectedUser
								? (selectedUser?.fullName ?? "")
								: "Выберите профиль"}
						</h4>
						<div className="auth-pin-target" aria-live="polite">
							{/* Проверка PIN идёт на сервере и занимает время (там намеренная
                  задержка на неверный PIN). Без этой строки экран замирал молча. */}
							{loading
								? "Проверяем PIN..."
								: selectedUser
									? "Введите PIN-код"
									: "Нажмите на сотрудника слева"}
						</div>
					</div>

					{/* Dots */}
					<div className={`auth-pin-dots ${errorShake ? "animate-shake" : ""}`}>
						{[0, 1, 2, 3].map((slot) => (
							<div
								key={`pin-dot-slot-${slot}`}
								className={`auth-pin-dot ${pin.length > slot ? "filled" : ""}`}
							/>
						))}
					</div>

					{/*
            Причина отказа на экране, а не только в уехавшем уведомлении.
            Цвета берутся из объявленных семантических токенов (--bad-bg/--bad-fg
            в styles/dente-redesign.css, объявлены для всех трёх тем): своих
            имён вроде --dente-red-10 в этом проекте не существует, а
            неизвестное имя браузер молча отбрасывает и текст теряет цвет.
          */}
					{errorText ? (
						<div
							role="alert"
							style={{
								background: "var(--bad-bg)",
								color: "var(--bad-fg)",
								borderRadius: "8px",
								padding: "8px 12px",
								marginBottom: "16px",
								maxWidth: "260px",
								fontSize: "12px",
								lineHeight: 1.4,
								textAlign: "center",
							}}
						>
							{errorText}
						</div>
					) : null}

					{/* Numpad */}
					<div className="auth-pin-grid">
						{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
							<button
								key={num}
								type="button"
								className="auth-pin-btn"
								disabled={!selectedUser || loading}
								onClick={() => handleKeyPress(num)}
							>
								{num}
							</button>
						))}
						<button
							type="button"
							className="auth-pin-btn auth-pin-btn--secondary"
							disabled={!selectedUser || loading}
							onClick={() => setSelectedUser(null)}
						>
							Сброс
						</button>
						<button
							key="0"
							type="button"
							className="auth-pin-btn"
							disabled={!selectedUser || loading}
							onClick={() => handleKeyPress("0")}
						>
							0
						</button>
						<button
							type="button"
							className="auth-pin-btn auth-pin-btn--danger"
							disabled={!selectedUser || loading || pin.length === 0}
							onClick={handleBackspace}
						>
							<Delete size={20} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
