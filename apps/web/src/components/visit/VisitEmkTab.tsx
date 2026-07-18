import React from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { CompletedServicesChecklist } from "./CompletedServicesChecklist";
import { VisitFlowProgress } from "./VisitFlowProgress";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { visitDraftQualityLabels, visitDraftSignalLabel, visitDraftMissingFieldLabel, visitSaveReceiptText } from "../../AppHelpers";
import { specialtyLabels } from "../../workspaceUiLabels";

export function VisitEmkTab() {
	const appLogic = useAppLogicContext();
	const {
		activeEmkTab,
		setActiveEmkTab,
		visitNoteForm,
		updateVisitNoteField,
		draft: rawDraft,
		isVisitNoteDirty,
		pendingVisitSaveCount,
		lastVisitSaveReceipt,
		dashboard,
		flushPendingVisitSaves,
		isPendingVisitSyncing,
		acceptDraftToVisit,
		visitNoteReadyToAccept,
		isDraftAccepting,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		visitFlowResult,
		visitNoteFieldDefinitions,
		visitNoteAcceptMissingSteps
	} = appLogic;

	// Note: draft is aliased from visitDraft in appLogic
	const draft = appLogic.visitDraft;

		const emkTabs = [
		{ id: "all", label: "Все поля" },
		{ id: "complaint", label: "Жалобы" },
		{ id: "anamnesis", label: "Анамнез" },
		{ id: "objectiveStatus", label: "Объективно" },
		{ id: "diagnosis", label: "Диагноз" },
		{ id: "treatmentPlan", label: "Лечение" },
	];

		const visibleFields =
		activeEmkTab === "all"
			? visitNoteFieldDefinitions
			: visitNoteFieldDefinitions.filter((f) => f.key === activeEmkTab);

	return (
				<section
						className="visit-note-panel"
						aria-label="Черновик электронной медицинской карты"
					>
						<div className="visit-note-head">
							<div>
								<p className="eyebrow">ЭМК после диктовки</p>
								<h3>
									{draft
										? "Проверьте черновик"
										: isVisitNoteDirty
											? "Проверьте правки"
											: "Структура приема"}
								</h3>
							</div>
							<span className={draft || isVisitNoteDirty ? "ready" : ""}>
								{visitNoteStatusLabel}
							</span>
						</div>
						{visitFlowResult && <VisitFlowProgress result={visitFlowResult} />}

						{/* Красивые вкладки (EMK Tabs) для уменьшения перегруженности */}
						<div className="emk-tabs-container" role="tablist">
							{emkTabs.map((tab) => {
								const isFilled =
									tab.id !== "all" &&
									String(visitNoteForm[tab.id] ?? "").trim().length > 0;
								return (
									<button
										key={tab.id}
										type="button"
										role="tab"
										aria-selected={activeEmkTab === tab.id}
										className={`emk-tab-button ${activeEmkTab === tab.id ? "active" : ""}`}
										onClick={() => setActiveEmkTab(tab.id)}
									>
										{tab.label}
										{isFilled && (
											<span className="emk-tab-dot" title="Заполнено" />
										)}
									</button>
								);
							})}
						</div>

						<div
							className={`visit-fields ${activeEmkTab !== "all" ? "single-tab-mode" : ""}`}
						>
							{visibleFields.map((field) => {
								const QUICK_CHIPS: Record<string, string[]> = {
									complaint: [
										"Жалоб нет",
										"Ноющие боли",
										"Острая боль",
										"Боль при накусывании",
										"Реакция на холод/горячее",
										"Застревание пищи",
										"Эстетический дефект",
										"Проф. осмотр",
									],
									anamnesis: [
										"Ранее лечен по поводу неосложненного кариеса",
										"Травма зуба",
										"Хрон. заболевания отрицает",
										"Аллергоанамнез не отягощен",
										"Аллергия на лидокаин",
									],
									objectiveStatus: [
										"Зондирование безболезненно",
										"Перкуссия безболезненна",
										"Слизистая оболочка бледно-розового цвета",
										"Глубокая кариозная полость",
										"Сообщается с полостью зуба",
									],
									diagnosis: [
										"K02.1 Кариес дентина",
										"K04.0 Острый пульпит",
										"K04.5 Хронический апикальный периодонтит",
										"K05.0 Острый гингивит",
										"K08.1 Потеря зубов",
									],
									treatmentPlan: [
										"Анестезия аппликационная",
										"Анестезия инфильтрационная",
										"Коффердам",
										"Мех/Мед обработка",
										"Реставрация композитом светового отверждения",
										"Шлифовка, полировка",
										"Удаление зуба",
									],
								};
								const chips = QUICK_CHIPS[field.key] || [];
								return (
									<div
										key={field.key}
										className="emk-field-container"
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "0.4rem",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												width: "100%",
											}}
										>
											<strong style={{ fontSize: "0.85rem", color: "#475569" }}>
												{field.label}
											</strong>
											<SmartMicrophoneButton
												context="visit"
												sterileMode={false}
												onResult={(text) => {
													const curr = visitNoteForm[field.key] || "";
													const sep =
														curr.length > 0 && !curr.endsWith(" ") ? " " : "";
													updateVisitNoteField(field.key, curr + sep + text);
												}}
												style={{ padding: "2px" }}
											/>
										</div>
										{chips.length > 0 && (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "0.3rem",
												}}
											>
												{chips.map((chip) => (
													<button
														key={chip}
														type="button"
														onClick={() => {
															const curr = visitNoteForm[field.key] || "";
															const sep =
																curr.length > 0 && !curr.endsWith(" ")
																	? ", "
																	: "";
															updateVisitNoteField(
																field.key,
																curr + sep + chip,
															);
														}}
														className="quick-chip"
													>
														+ {chip}
													</button>
												))}
											</div>
										)}
										<textarea
											value={visitNoteForm[field.key]}
											onChange={(event) =>
												updateVisitNoteField(field.key, event.target.value)
											}
											className="emk-textarea"
											
											
										/>
									</div>
								);
							})}
							<CompletedServicesChecklist />
						</div>

						{draft?.quality ? (
							<div
								className={`visit-draft-quality quality-${draft.quality.level}`}
							>
								<div>
									<strong>
										{visitDraftQualityLabels[draft.quality.level]}
									</strong>
									<span>
										{Math.round(draft.quality.confidence * 100)}% ·{" "}
										{specialtyLabels[draft.quality.specialty]}
									</span>
								</div>
								<p>{draft.quality.nextAction}</p>
								<div className="visit-draft-signal-row">
									{draft.quality.detectedToothCodes
										.slice(0, 6)
										.map((toothCode) => (
											<span key={`tooth-${toothCode}`}>FDI {toothCode}</span>
										))}
									{draft.quality.signals.slice(0, 7).map((signal) => (
										<span key={signal}>{visitDraftSignalLabel(signal)}</span>
									))}
									{draft.quality.missingCriticalFields
										.slice(0, 5)
										.map((field) => (
											<small key={field}>
												проверить: {visitDraftMissingFieldLabel(field)}
											</small>
										))}
								</div>
							</div>
						) : null}

						<div className="ai-draft">
							<ShieldCheck aria-hidden="true" />
							<p>
								{draft
									? draft.warnings.join(" ")
									: isVisitNoteDirty
										? "Правки будут сохранены в ЭМК. Подпись приема остается отдельным действием."
										: pendingVisitSaveCount
											? "Локальное сохранение есть. Серверная синхронизация ожидает подключения или повторной попытки."
											: lastVisitSaveReceipt
												? visitSaveReceiptText(lastVisitSaveReceipt)
												: dashboard.activeVisit?.doctorSummary}
							</p>
							{pendingVisitSaveCount ? (
								<button
									className="secondary-button"
									type="button"
									onClick={() => void flushPendingVisitSaves({ silent: false })}
									disabled={isPendingVisitSyncing}
								>
									{isPendingVisitSyncing ? "Синхронизирую" : "Синхронизировать"}
								</button>
							) : null}
							{draft || isVisitNoteDirty ? (
								<button
									className="primary-button"
									type="button"
									onClick={acceptDraftToVisit}
									disabled={!visitNoteReadyToAccept || isDraftAccepting}
									aria-describedby={
										!visitNoteReadyToAccept ? "visit-note-missing" : undefined
									}
								>
									<Check aria-hidden="true" /> {visitNoteActionLabel}
								</button>
							) : null}
							{(draft || isVisitNoteDirty) && !visitNoteReadyToAccept ? (
								<div
									className="visit-note-missing"
									id="visit-note-missing"
									role="status"
									aria-live="polite"
									style={{
										marginTop: "1rem",
										background: "var(--amber-50)",
										padding: "1rem",
										borderRadius: "8px",
										border: "1px solid var(--amber-200)",
									}}
								>
									<strong
										style={{
											display: "block",
											marginBottom: "0.5rem",
											color: "var(--amber-900)",
										}}
									>
										Чтобы сохранить запись приема, осталось:
									</strong>
									<ul
										style={{
											margin: 0,
											paddingLeft: "1.5rem",
											color: "var(--amber-800)",
										}}
									>
										{visitNoteAcceptMissingSteps.map((step) => (
											<li key={step}>{step}</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					</section>
	);
}
