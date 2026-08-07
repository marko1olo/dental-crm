import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { useAppLogic } from "../useAppLogic";

export interface OnboardingWizardProps {
  appLogic: ReturnType<typeof useAppLogic>;
  onboardingRoleChoices: any[];
}

export function OnboardingWizard({ appLogic, onboardingRoleChoices }: OnboardingWizardProps) {
  const [resetting, setResetting] = useState(false);
  const {
    onboardingStep,
    currentOnboardingIndex,
    onboardingSteps,
    error,
    setError,
    continueOnboardingInDraftMode,
    loadDashboard,
    moveOnboardingTo,
    clinicProfileDraft,
    updateClinicProfileDraft,
    selectedWorkspaceRole,
    setSelectedWorkspaceRole,
    staffRoleLabels,
    newStaffName,
    setNewStaffName,
    newChairName,
    setNewChairName,
    addStaffMember,
    addChair,
    previousOnboardingStep,
    nextOnboardingStep
  } = appLogic;

  return (
			<main className="app-shell onboarding-fullscreen">
				<section
					className="workspace onboarding-only-workspace"
					id="workspace-content"
				>
					<section
						className="onboarding-shell onboarding-wizard"
						aria-label="Первичная настройка клиники"
					>
						{/* Onboarding Header */}
						<div className="onboarding-head">
							<div>
								<p className="eyebrow">Первый запуск</p>
								<h2>Быстрая настройка CRM Dente</h2>
							</div>
						</div>

						{/*
              ОТКАЗ ВНУТРИ МАСТЕРА ВИДЕН ЗДЕСЬ, А НЕ В РАБОЧЕЙ ОБЛАСТИ.

              Полоса отказа в этом файле одна, и стоит она ниже — внутри рабочей
              области (ищите `<section className="app-notice"` после этой ветки).
              Мастер уходит из App.tsx досрочным return, то есть до неё дело не
              доходит. А отказывать внутри мастера есть чему: moveOnboardingTo на
              шаг «Готово» не пускает, пока нет врача с правом подписи ЭМК,
              кресла и ассистента (useAppLogic.tsx:3107 и :3325);
              saveClinicProfileIfDirty не пускает при незаполненных полях;
              addStaffMember и addChair сообщают об отказе сервера. Все они зовут
              setError — и все их сообщения пропадали в никуда, а кнопка при этом
              выглядела не сломанной, а мёртвой.

              Ровно тот класс дефекта, из-за которого удалили семишаговый мастер:
              запрос отказывает, а экран об отказе молчит.
            */}
						{error ? (
							<section
								className="app-notice"
								role="alert"
								aria-live="assertive"
							>
								<AlertTriangle aria-hidden="true" />
								<p>{error}</p>
								<button
									className="secondary-button"
									type="button"
									onClick={() => setError(null)}
								>
									Понятно
								</button>
							</section>
						) : null}

						{/* Step list if not intro */}
						{onboardingStep !== "intro" ? (
							<ol
								className="wizard-step-list"
								aria-label={`Шаг ${currentOnboardingIndex + 1} из ${onboardingSteps.length}`}
							>
								{onboardingSteps.map((step, index) => (
									<li
										className="wizard-step"
										key={step.id}
										data-active={step.id === onboardingStep}
										aria-current={
											step.id === onboardingStep ? "step" : undefined
										}
									>
										<span className="wizard-step-index">Шаг {index + 1}</span>
										<strong className="wizard-step-title">{step.title}</strong>
										<span className="wizard-step-detail">{step.detail}</span>
									</li>
								))}
							</ol>
						) : null}

						{/*
              ШАГ «РЕЖИМ ЗАПУСКА» — ЕДИНСТВЕННЫЙ ВЫХОД НОВОЙ КЛИНИКИ В ПРОГРАММУ.

              ЧТО БЫЛО СЛОМАНО. Новая клиника всегда попадает именно на этот шаг:
              AppHelpers.tsx:4325 принудительно ставит onboardingStep в "intro",
              пока настройка не закрыта, а кнопки «Назад» и «Дальше» на этом шаге
              не отрисовываются вовсе. То есть эти две карточки — все выходы,
              какие есть.

              Правая карточка, «Начать с чистого листа», не делала НИЧЕГО: её
              обработчик звал только loadDashboard({}), который читает
              /api/dashboard и больше ничего (useAppLogic.tsx:2732 — ни закрытия
              настройки, ни смены шага). Экран после нажатия не менялся. Клиника,
              отказавшаяся от демонстрационных данных, оставалась на первом
              экране навсегда: единственный работающий выход — левая карточка,
              то есть ровно то, от чего она отказалась.

              ЧТО ТЕПЕРЬ ДЕЛАЕТ КАЖДАЯ КАРТОЧКА. Левая уводит в рабочее место
              черновым входом (useAppLogic.tsx:3273) — это и есть «работать
              можно, настройку закончите позже»: он сохраняет черновик профиля
              клиники, пишет закрытие настройки и в браузер, и на сервер, и
              оставляет отметку «настройка не закончена» (её показывает
              App.tsx:3550). Правая НЕ закрывает мастер, а переводит на второй
              шаг: у шага «Режим запуска» кнопки «Дальше» нет по построению, и
              без этого перехода остальные четыре шага мастера были недостижимы
              вообще.

              ПОЧЕМУ ЧЕРНОВОЙ ВХОД, А НЕ dismissOnboarding. У строгого завершения
              (useAppLogic.tsx:3225) первым стоит assertOnboardingReadyForFinish:
              он требует врача с правом подписи ЭМК, кресло, ассистента, часовой
              пояс. Ничего из этого пять шагов не спрашивают, так что на новой
              клинике он отказал бы всегда — и отказ этот был бы НЕВИДИМ, потому
              что setError рисуется ниже, уже в рабочей области. Строгое
              завершение остаётся у полного мастера настройки в разделе
              «Клиника», где спрашивают всё нужное.

              ТЕКСТ КАРТОЧЕК ИСПРАВЛЕН ПО ФАКТУ. Обещания «запустить систему с
              готовыми демонстрационными данными» и «полностью пустая база
              данных» не выполнял никто: маршрута, который засеивает или чистит
              базу по нажатию этих карточек, в дереве нет — обе звали один и тот
              же loadDashboard. Обещание, которого система не держит, дороже
              отсутствующего: по «полностью пустой базе» клиника начнёт вносить
              настоящих пациентов рядом с тестовыми.
            */}
						{onboardingStep === "intro" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Режим запуска приложения</h3>
									<p>
										Выберите, с чего начать. Настройку клиники можно закончить
										позже в разделе «Настройки» — приём, расписание и картотека
										работают и без неё.
									</p>
								</div>

								<div className="wizard-mode-grid">
									<button
										className="wizard-mode-card wizard-mode-card--demo"
										type="button"
										onClick={async () => {
											setResetting(true);
											await continueOnboardingInDraftMode();
											await loadDashboard({});
											setResetting(false);
										}}
										disabled={resetting}
									>
										<span className="wizard-mode-icon" aria-hidden="true">
											🚀
										</span>
										<strong className="wizard-mode-title">
											Сначала осмотреться
										</strong>
										<span className="wizard-mode-note">
											Открыть рабочее место с тем, что уже есть в базе клиники,
											и пройтись по разделам. Ничего не удаляется и не
											досоздаётся.
										</span>
									</button>

									<button
										className="wizard-mode-card wizard-mode-card--clean"
										type="button"
										onClick={() => void moveOnboardingTo("clinic")}
										disabled={resetting}
									>
										<span className="wizard-mode-icon" aria-hidden="true">
											✨
										</span>
										<strong className="wizard-mode-title">
											Настроить клинику сейчас
										</strong>
										<span className="wizard-mode-note">
											Название и телефон клиники, первый специалист и кресло —
											по шагам. Выйти в рабочее место можно на любом шаге.
										</span>
									</button>
								</div>
							</div>
						) : null}

						{/* Clinic step */}
						{onboardingStep === "clinic" ? (
							<div className="onboarding-panel">
								<div>
									<h3>О клинике</h3>
									<p>
										Название и телефон понадобятся для генерации договоров и
										медицинских карт.
									</p>
								</div>
								<div className="wizard-field-list">
									<div className="wizard-field">
										<label htmlFor="onboarding-clinic-name">
											Название клиники
										</label>
										<input
											id="onboarding-clinic-name"
											value={clinicProfileDraft.clinicName}
											onChange={(event) =>
												updateClinicProfileDraft(
													"clinicName",
													event.target.value,
												)
											}
											placeholder="Стоматология..."
										/>
									</div>
									<div className="wizard-field">
										<label htmlFor="onboarding-clinic-phone">
											Телефон для связи
										</label>
										<input
											id="onboarding-clinic-phone"
											type="tel"
											inputMode="tel"
											autoComplete="tel"
											value={clinicProfileDraft.phone}
											onChange={(event) =>
												updateClinicProfileDraft("phone", event.target.value)
											}
											placeholder="89..."
										/>
									</div>
								</div>
							</div>
						) : null}

						{/* Team step */}
						{onboardingStep === "team" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Ваша роль и данные</h3>
									<p>
										Укажите свою рабочую роль в клинике и личные данные для
										настройки интерфейса.
									</p>
								</div>
								<div className="wizard-field-list">
									<div className="wizard-field">
										<span id="onboarding-role-label">Ваша рабочая роль</span>
										<fieldset
											className="wizard-role-row"
											aria-labelledby="onboarding-role-label"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											{onboardingRoleChoices.map((role) => (
												<button
													className={`wizard-role-chip${selectedWorkspaceRole === role ? " active" : ""}`}
													key={role}
													type="button"
													aria-pressed={selectedWorkspaceRole === role}
													onClick={() => setSelectedWorkspaceRole(role)}
												>
													{staffRoleLabels[role]}
												</button>
											))}
										</fieldset>
									</div>
									<div className="wizard-field">
										<label htmlFor="onboarding-staff-name">
											{selectedWorkspaceRole === "owner"
												? "ФИО владельца клиники"
												: selectedWorkspaceRole === "doctor"
													? "ФИО врача"
													: selectedWorkspaceRole === "administrator"
														? "ФИО администратора"
														: selectedWorkspaceRole === "assistant"
															? "ФИО ассистента"
															: "ФИО сотрудника"}
										</label>
										<input
											id="onboarding-staff-name"
											autoComplete="name"
											value={newStaffName}
											onChange={(event) => setNewStaffName(event.target.value)}
											placeholder="Иванов Иван Иванович"
										/>
									</div>
									{(selectedWorkspaceRole === "doctor" ||
										selectedWorkspaceRole === "assistant") && (
										<div className="wizard-field">
											<label htmlFor="onboarding-chair-name">
												Название кабинета/кресла
											</label>
											<input
												id="onboarding-chair-name"
												value={newChairName}
												onChange={(event) =>
													setNewChairName(event.target.value)
												}
												placeholder="Кабинет терапевта"
											/>
										</div>
									)}
								</div>
							</div>
						) : null}

						{/* Done step */}
						{onboardingStep === "done" ? (
							<div className="onboarding-panel">
								<div>
									<h3>Все готово к запуску!</h3>
									<p>
										Проверьте параметры перед открытием рабочей смены. Вы
										сможете изменить любые настройки позже.
									</p>
								</div>
								<div className="wizard-summary-grid">
									<div>
										<span className="wizard-summary-label">
											Название клиники
										</span>
										<strong className="wizard-summary-value">
											{clinicProfileDraft.clinicName || "Новая стоматология"}
										</strong>
									</div>
									<div>
										<span className="wizard-summary-label">
											Ваша рабочая роль
										</span>
										<strong className="wizard-summary-value">
											{staffRoleLabels[selectedWorkspaceRole]}
										</strong>
									</div>
									<div>
										<span className="wizard-summary-label">
											Первый специалист
										</span>
										<strong className="wizard-summary-value">
											{newStaffName || "Администратор"}
										</strong>
									</div>
									{(selectedWorkspaceRole === "doctor" ||
										selectedWorkspaceRole === "assistant") && (
										<div>
											<span className="wizard-summary-label">
												Кабинет / кресло
											</span>
											<strong className="wizard-summary-value">
												{newChairName || "Кабинет №1"}
											</strong>
										</div>
									)}
								</div>
							</div>
						) : null}

						{/* Actions Footer */}
						<div className="onboarding-actions">
							{onboardingStep !== "intro" && previousOnboardingStep ? (
								<button
									className="secondary-button"
									type="button"
									onClick={() =>
										void moveOnboardingTo(previousOnboardingStep.id)
									}
								>
									Назад
								</button>
							) : null}
							{onboardingStep !== "intro" && nextOnboardingStep ? (
								<button
									className="primary-button"
									type="button"
									onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}
								>
									Дальше
								</button>
							) : null}
							{/*
                «НАЧАТЬ РАБОТУ» ЗВАЛО ФУНКЦИЮ, КОТОРОЙ В ДЕРЕВЕ НЕТ.

                Здесь стояло handleFinishOnboarding(newStaffName, newChairName).
                Такого имени нет ни в useAppLogic, ни в двух его подмешанных
                модулях (useTelegramSettings, useAuthLogic), ни в settingsStore,
                ни в одном другом файле репозитория — оно приходило из
                деструктуризации appLogicValue и равнялось undefined. То есть
                последняя кнопка первичной настройки роняла TypeError, ничего не
                сохраняла и мастер не закрывала. Тип не поймал этого, потому что
                useAppLogic объявлена как `useAppLogic(): any` — любое имя из
                такого объекта проходит проверку.

                ЧТО СТАЛО. Кнопка выполняет то, что перечислено в сводке шага
                «Готово», и ровно теми обработчиками, которыми это делает
                достижимый мастер настройки: addStaffMember заводит первого
                специалиста (useAppLogic.tsx:7533, POST /api/settings/staff),
                addChair — кресло (:7588, POST /api/settings/chairs), после чего
                черновой вход открывает рабочее место. Роль берётся ту, которую
                человек выбрал на шаге «Команда»: все пять значений входят в
                staffRoleSchema, то есть сервер их принимает.

                Оба обработчика сами сообщают о своём отказе через setError, а он
                теперь виден внутри мастера (полоса выше). Порядок именно такой:
                сначала завести людей и кресло, потом входить — иначе отказ
                сервера уехал бы за пределы экрана вместе с мастером.
              */}
							{onboardingStep === "done" ? (
								<button
									className="primary-button"
									type="button"
									disabled={resetting}
									onClick={async () => {
										setResetting(true);
										if (newStaffName.trim())
											await addStaffMember(selectedWorkspaceRole);
										if (
											(selectedWorkspaceRole === "doctor" ||
												selectedWorkspaceRole === "assistant") &&
											newChairName.trim()
										) {
											await addChair();
										}
										await continueOnboardingInDraftMode();
										setResetting(false);
									}}
								>
									Начать работу
								</button>
							) : null}
						</div>
					</section>
				</section>
			</main>
  );
}