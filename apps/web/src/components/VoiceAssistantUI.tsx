import { CheckCircle2, HelpCircle, Mic, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { DictationHints } from "../DictationHints";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import {
	VOICE_METER_BARS,
	voiceGlowRadiusPx,
	voiceMeterHeights,
} from "./workspaceActions/voiceMeter";
import {
	revealWorkspaceActions,
	WorkspaceActionsSlot,
} from "./workspaceActions/WorkspaceActions";
import {
	type WorkspaceActionHelpTab,
	workspaceActionsLabels,
	workspaceVoiceCommands,
	workspaceVoiceVisitNote,
} from "./workspaceActions/workspaceActionsLabels";

interface VoiceAssistantUIProps {
	onNavigate?: (view: any) => void;
	onSearchQuery?: (query: string) => void;
	onDateChange?: (date: string) => void;
}

const HELP_TABS: readonly WorkspaceActionHelpTab[] = ["nav", "search", "visit"];

export function VoiceAssistantUI({
	onNavigate,
	onSearchQuery,
	onDateChange,
}: VoiceAssistantUIProps) {
	const {
		isListening,
		transcript,
		volume,
		startListening,
		stopListening,
		lastAction,
	} = useVoiceAssistant("general", {
		onNavigate,
		onSearchQuery,
		onDateChange,
	});

	const [showTutorial, setShowTutorial] = useState(false);
	const [activeTab, setActiveTab] = useState<WorkspaceActionHelpTab>("nav");
	const [visibleAction, setVisibleAction] = useState<any>(null);

	// Interaction mode refs
	const clickTimeRef = useRef<number>(0);
	const isHoldingRef = useRef<boolean>(false);
	const isToggleModeRef = useRef<boolean>(false);

	// Determine hint type based on route
	let hintType: "schedule" | "patient" | "visit" | "prices" | "payment" =
		"schedule";
	if (typeof window !== "undefined") {
		const hash = window.location.hash;
		if (hash.includes("visit") || hash.includes("imaging")) hintType = "visit";
		else if (hash.includes("patients")) hintType = "patient";
		else if (hash.includes("finance")) hintType = "payment";
		else if (hash.includes("settings")) hintType = "prices";
	}

	// Handle action chip auto-dismissal
	useEffect(() => {
		if (lastAction) {
			setVisibleAction(lastAction);
			const timer = setTimeout(() => {
				setVisibleAction(null);
			}, 4000);
			return () => clearTimeout(timer);
		}
	}, [lastAction]);

	// Click-to-Toggle and Push-to-Talk Handlers
	const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		if (isListening) {
			if (isToggleModeRef.current) {
				stopListening();
				isToggleModeRef.current = false;
			}
			return;
		}

		clickTimeRef.current = Date.now();
		isHoldingRef.current = true;
		isToggleModeRef.current = false;
		startListening();
	};

	const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		if (!isListening) return;

		isHoldingRef.current = false;
		const duration = Date.now() - clickTimeRef.current;
		if (duration < 300) {
			// Quick tap/click: enter toggle mode (keep listening)
			isToggleModeRef.current = true;
		} else {
			// Long press release: stop listening
			stopListening();
			isToggleModeRef.current = false;
		}
	};

	const handleLeave = () => {
		if (isListening && !isToggleModeRef.current && isHoldingRef.current) {
			stopListening();
			isHoldingRef.current = false;
		}
	};

	const activeCommands = workspaceVoiceCommands[activeTab];
	const hasNotice = showTutorial || isListening || Boolean(visibleAction);

	/* Накладка открылась — группу видно. Группа стоит в потоке страницы (в
     топбаре или в панели над нижней навигацией), а не плавает над ней, поэтому
     на прокрученной странице она может быть выше видимой области. Тогда
     нажатие «Справка» не показало бы НИЧЕГО. Один вызов на открытие; причина и
     замер — в `revealWorkspaceActions`. */
	useEffect(() => {
		if (hasNotice) revealWorkspaceActions();
	}, [hasNotice]);

	/* Кнопки справки и голоса больше не плавают над страницей.
     Раньше здесь был `position: fixed` остров в правом нижнем углу; затем —
     плавающий док с попыткой «уступать» контенту через долю перекрытия
     мишени. Порог уступки арифметически недостижим (накрытая доля равна
     `ширина панели / ширина мишени`, у главной кнопки «Запись» 364x44 максимум
     0.4615), поэтому механизм удалён целиком вместе с подъёмом, выборкой помех
     и резервом пустого низа. Обоснование и замеры —
     `workspaceActions/workspaceActionsPlacement.ts`.

     Теперь действия живут в существующей фурнитуре: на широком экране — в
     строке действий топбара одной группой, на узком — в панели над нижней
     навигацией. Владелец группы (`workspaceActions/WorkspaceActions.tsx`)
     задаёт место, порядок слотов и слой. Здесь остаётся только содержимое. */
	return (
		<>
			{hasNotice && (
				<WorkspaceActionsSlot slot="notice">
					{showTutorial && (
						<div className="dnt-actions__panel">
							<div className="dnt-actions__panel-head">
								<div>
									<h3 className="dnt-actions__panel-title">
										{workspaceActionsLabels.help.heading}
									</h3>
									<p className="dnt-actions__panel-subtitle">
										{workspaceActionsLabels.help.subheading}
									</p>
								</div>
								<button
									type="button"
									onClick={() => setShowTutorial(false)}
									className="dnt-actions__panel-close"
									aria-label={workspaceActionsLabels.help.close}
									title={workspaceActionsLabels.help.close}
								>
									<X aria-hidden="true" />
								</button>
							</div>

							<div className="dnt-actions__tabs" role="tablist">
								{HELP_TABS.map((tab) => (
									<button
										key={tab}
										type="button"
										role="tab"
										aria-selected={activeTab === tab}
										onClick={() => setActiveTab(tab)}
										className={`dnt-actions__tab${activeTab === tab ? " dnt-actions__tab--active" : ""}`}
									>
										{workspaceActionsLabels.tabs[tab]}
									</button>
								))}
							</div>

							<p className="dnt-actions__hint">{activeCommands.intro}</p>
							<div className="dnt-actions__cmd-list">
								{activeCommands.items.map((item) => (
									<div key={item.command} className="dnt-actions__cmd">
										<div className="dnt-actions__cmd-title">{item.command}</div>
										<div className="dnt-actions__cmd-detail">{item.detail}</div>
									</div>
								))}
							</div>
							{activeTab === "visit" && (
								<p className="dnt-actions__note">{workspaceVoiceVisitNote}</p>
							)}
						</div>
					)}

					{isListening && (
						<div className="dnt-actions__transcript">
							<div className="dnt-actions__side-hints">
								<DictationHints isVisible={true} type={hintType} />
							</div>
							<div className="dnt-actions__transcript-card">
								<div className="dnt-actions__transcript-head">
									<span
										className="dnt-actions__rec-dot"
										aria-hidden="true"
									></span>
									<span className="dnt-actions__rec-label">
										{workspaceActionsLabels.voice.listeningTitle}
									</span>
									{isToggleModeRef.current && (
										<span className="dnt-actions__rec-mode">
											{workspaceActionsLabels.voice.lockedMode}
										</span>
									)}
								</div>

								<div
									className="dnt-actions__transcript-text"
									aria-live="polite"
								>
									{transcript ||
										workspaceActionsLabels.voice.listeningPlaceholder}
								</div>

								{/* Полоски — детерминированная функция измеренного уровня, не Math.random(). */}
								<div className="dnt-actions__meter" aria-hidden="true">
									{voiceMeterHeights(volume, VOICE_METER_BARS)
										.map((height, barPos) => ({
											barId: `bar-meter-${barPos}`,
											height,
										}))
										.map(({ barId, height }) => (
											<div
												key={barId}
												className="dnt-actions__meter-bar"
												style={{ height: `${height}%` }}
											></div>
										))}
								</div>
							</div>
						</div>
					)}

					{visibleAction && !isListening && (
						<div className="dnt-actions__action" role="status">
							<CheckCircle2
								className="dnt-actions__action-icon"
								aria-hidden="true"
							/>
							<div>
								<div className="dnt-actions__action-title">
									{workspaceActionsLabels.voice.actionDone}
								</div>
								<div className="dnt-actions__action-detail">
									{visibleAction.payload?.nav?.feedbackText ||
										visibleAction.payload?.text ||
										workspaceActionsLabels.voice.actionFallback}
								</div>
							</div>
						</div>
					)}
				</WorkspaceActionsSlot>
			)}

			{/* ПОДПИСЬ ВИДНА, А НЕ СПРЯТАНА В `title`. Раньше это были круглые кнопки
          без текста: на телефоне у них не было смысла вообще, потому что
          всплывающей подсказки там нет. Рядом с пятью подписанными пунктами
          навигации кнопка без подписи — потеря ясности. */}
			<WorkspaceActionsSlot slot="voice">
				<button
					type="button"
					onMouseDown={handleStart}
					onMouseUp={handleEnd}
					onMouseLeave={handleLeave}
					onTouchStart={handleStart}
					onTouchEnd={handleEnd}
					aria-pressed={isListening}
					className="dnt-actions__control dnt-actions__control--primary"
					style={{
						/* Свечение — единственная динамическая величина: радиус растёт от
               измеренного уровня. Цвет берётся из токена темы. */
						boxShadow: isListening
							? `0 0 ${voiceGlowRadiusPx(volume)}px var(--teal-glow)`
							: undefined,
					}}
					title={
						isListening
							? workspaceActionsLabels.voice.listening
							: workspaceActionsLabels.voice.idle
					}
				>
					<Mic className="dnt-actions__control-icon" aria-hidden="true" />
					<span className="dnt-actions__control-text">
						<span className="dnt-actions__control-label">
							{workspaceActionsLabels.voice.label}
						</span>
						<span className="dnt-actions__control-hint">
							{workspaceActionsLabels.voice.hint}
						</span>
					</span>
				</button>
			</WorkspaceActionsSlot>

			<WorkspaceActionsSlot slot="help">
				<button
					type="button"
					onClick={() => setShowTutorial((prev) => !prev)}
					aria-expanded={showTutorial}
					className="dnt-actions__control"
					title={workspaceActionsLabels.help.title}
				>
					<HelpCircle
						className="dnt-actions__control-icon"
						aria-hidden="true"
					/>
					<span className="dnt-actions__control-text">
						<span className="dnt-actions__control-label">
							{workspaceActionsLabels.help.label}
						</span>
						<span className="dnt-actions__control-hint">
							{workspaceActionsLabels.help.hint}
						</span>
					</span>
				</button>
			</WorkspaceActionsSlot>
		</>
	);
}
