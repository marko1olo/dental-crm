import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	AlertTriangle,
	Bell,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	HeartPulse,
	Info,
	PhoneCall,
	Play,
	Pause,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	X,
} from "lucide-react";
import {
	triggerHaptic,
	playClinicalAudioFeedback,
	initMobilePushNotifications,
	isNativePlatform,
} from "../../native/mobileBridge";
import { showToast } from "../GlobalToast";
import "./PostOpCareTimelineWidget.css";

export type SurgeryType =
	| "simple_extraction"
	| "complex_wisdom_extraction"
	| "dental_implantation"
	| "sinus_lifting";

export interface PostOpCareTimelineWidgetProps {
	readonly surgeryType?: SurgeryType;
	readonly surgeryDate?: string; // YYYY-MM-DD
	readonly patientName?: string;
	readonly emergencyPhone?: string;
	readonly clinicName?: string;
	readonly toothFdiCodes?: string[];
	readonly onEmergencyCallRequested?: (reason: string) => void;
	readonly onSutureRemovalBooked?: () => void;
}

interface TimelineStage {
	readonly id: string;
	readonly dayRangeLabel: string;
	readonly title: string;
	readonly focus: string;
	readonly rules: string[];
	readonly prohibited: string[];
	readonly medications: {
		readonly name: string;
		readonly dosage: string;
		readonly purpose: string;
	}[];
}

const SURGERY_METADATA: Record<
	SurgeryType,
	{ readonly label: string; readonly defaultDays: number; readonly sutureRemovalDay: number }
> = {
	simple_extraction: {
		label: "Простое удаление зуба",
		defaultDays: 5,
		sutureRemovalDay: 7,
	},
	complex_wisdom_extraction: {
		label: "Атипичное удаление зуба мудрости (FDI 38/48)",
		defaultDays: 10,
		sutureRemovalDay: 8,
	},
	dental_implantation: {
		label: "Дентальная имплантация",
		defaultDays: 14,
		sutureRemovalDay: 10,
	},
	sinus_lifting: {
		label: "Синус-лифтинг и костная пластика",
		defaultDays: 14,
		sutureRemovalDay: 12,
	},
};

export const PostOpCareTimelineWidget: React.FC<PostOpCareTimelineWidgetProps> = ({
	surgeryType = "complex_wisdom_extraction",
	surgeryDate,
	patientName = "Пациент",
	emergencyPhone = "+7 (800) 555-35-35",
	clinicName = "DENTE Клиника",
	toothFdiCodes = ["48"],
	onEmergencyCallRequested,
	onSutureRemovalBooked,
}) => {
	const [activeSurgery, setActiveSurgery] = useState<SurgeryType>(surgeryType);
	const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
	const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
	const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
	const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
	const [sosSymptom, setSosSymptom] = useState<string>("bleeding");

	// 15-Minute Cold Compress Countdown Timer
	const COMPRESS_TIME_SEC = 15 * 60;
	const [compressSecondsLeft, setCompressSecondsLeft] = useState<number>(COMPRESS_TIME_SEC);
	const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

	useEffect(() => {
		let timer: ReturnType<typeof setInterval> | null = null;
		if (isTimerRunning && compressSecondsLeft > 0) {
			timer = setInterval(() => {
				setCompressSecondsLeft((prev) => {
					if (prev <= 1) {
						setIsTimerRunning(false);
						triggerHaptic("success");
						playClinicalAudioFeedback("save_success");
						showToast("15 минут компресса завершены. Сделайте перерыв 20 минут!", "success");
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	}, [isTimerRunning, compressSecondsLeft]);

	const toggleTimer = () => {
		if (compressSecondsLeft === 0) {
			setCompressSecondsLeft(COMPRESS_TIME_SEC);
		}
		setIsTimerRunning((prev) => !prev);
		triggerHaptic("light");
	};

	const resetTimer = () => {
		setIsTimerRunning(false);
		setCompressSecondsLeft(COMPRESS_TIME_SEC);
		triggerHaptic("light");
	};

	const formatTimer = (sec: number) => {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	// Clinical Timeline Data Engine
	const stages: TimelineStage[] = useMemo(() => {
		return [
			{
				id: "stage_day_1",
				dayRangeLabel: "День 1 (0–24 ч)",
				title: "Гемостаз и купирование первичного отека",
				focus: "Формирование кровяного сгустка и снижение воспалительного ответа",
				rules: [
					"Холод на область щеки: 15 мин компресс / 20 мин перерыв (3–4 цикла)",
					"Щадящий домашний покой, изголовье кровати приподнято во время сна",
					"Принимать мягкую негорячую пищу на противоположной стороне",
				],
				prohibited: [
					"Категорически НЕ полоскать рот (риск вымывания сгустка и альвеолита)",
					"НЕ пить через трубочку и не сплевывать активно слюну",
					"НЕ принимать горячую ванну, баню, сауну и исключить спорт",
					"НЕ трогать лунку и швы языком, пальцами или зубочистками",
				],
				medications: [
					{
						name: "Нимесулид (Найз/Нимесил) 100 мг",
						dosage: "1 таб. / пакетик после еды при боли (не более 2 раз в сутки)",
						purpose: "Купирование боли и воспаления",
					},
					{
						name: "Супрастин / Лоратадин 10 мг",
						dosage: "1 таб. на ночь",
						purpose: "Уменьшение реактивного отека тканей",
					},
				],
			},
			{
				id: "stage_day_2_3",
				dayRangeLabel: "День 2–3 (24–72 ч)",
				title: "Антисептическая защита и спад пика отека",
				focus: "Контроль пика постоперационного отека (максимум на 3-й день) и дезинфекция полости рта",
				rules: [
					"Антисептические ротовые ванночки с Хлоргексидином 0.05% или Мирамистином",
					"Методика ванночки: набрать в рот 15 мл, подержать 1–2 мин БЕЗ активного полоскания, сплюнуть",
					"Чистить зубы мягкой щеткой, аккуратно обходя область наложенных швов",
					"Температура тела до 37.5°C вечером допустима как реакция на вмешательство",
				],
				prohibited: [
					"НЕ греть щеку и не делать согревающие компрессы",
					"НЕ употреблять алкоголь и ограничить курение (ухудшает микроциркуляцию)",
				],
				medications: [
					{
						name: "Хлоргексидин 0.05% (или Мирамистин)",
						dosage: "Ротовые ванночки 3–4 раза в день после каждого приема пищи",
						purpose: "Антисептическая санация лунки",
					},
					{
						name: "Амоксиклав 625 мг (при назначении врачом)",
						dosage: "1 таб. 2 раза в день через 12 часов строго по курсу 5–7 дней",
						purpose: "Профилактика бактериальных осложнений",
					},
				],
			},
			{
				id: "stage_day_4_6",
				dayRangeLabel: "День 4–6 (72–144 ч)",
				title: "Регенерация и эпителизация раны",
				focus: "Спад отека, очищение фибринового налета лунки и заживление слизистой",
				rules: [
					"Отек и болезненность должны стабильно идти на спад",
					"Белый налет на лунке — это фибрин (нормальная ткань заживления, не гной!)",
					"Продолжать ротовые ванночки после еды",
					"Постепенно расширять рацион мягкой пищи",
				],
				prohibited: [
					"НЕ счищать белый фибриновый налет со швов",
					"НЕ жевать твердые продукты (сухари, орехи, чипсы) на стороне операции",
				],
				medications: [
					{
						name: "Дентальный гель Холисал / Асепта / Солкосерил",
						dosage: "Аппликации на десну вокруг швов 2 раза в день после чистки",
						purpose: "Ускорение эпителизации десны",
					},
				],
			},
			{
				id: "stage_day_7_10",
				dayRangeLabel: `День ${SURGERY_METADATA[activeSurgery].sutureRemovalDay} (Финал)`,
				title: "Контрольный осмотр и снятие швов",
				focus: "Атравматичное удаление шовного материала и оценка остеоинтеграции / эпителизации",
				rules: [
					"Визит в клинику к хирургу-стоматологу на контрольный осмотр",
					"Безболезненное снятие нерассасывающихся швов за 2–3 минуты",
					"Окончательные рекомендации по гигиене и контрольной рентгенограмме",
				],
				prohibited: [
					"НЕ пытаться снимать или обрезать швы самостоятельно дома",
				],
				medications: [
					{
						name: "Гигиенический ополаскиватель с травами",
						dosage: "2 раза в день",
						purpose: "Поддержание гигиены после снятия швов",
					},
				],
			},
		];
	}, [activeSurgery]);

	const currentStage = stages[selectedDayIdx] || stages[0]!;

	const toggleCheck = (itemKey: string) => {
		setCheckedItems((prev) => ({
			...prev,
			[itemKey]: !prev[itemKey],
		}));
		triggerHaptic("light");
		playClinicalAudioFeedback("click");
	};

	const handleEnablePushNotifications = async () => {
		const res = await initMobilePushNotifications({
			onNotificationReceived: (payload) => {
				showToast(`Напоминание: ${payload.title ?? "Прием лекарств"}`, "info");
			},
		});

		if (res.success) {
			setNotificationsEnabled(true);
			triggerHaptic("success");
			showToast("Напоминания о компрессах и приеме лекарств активированы!", "success");
		} else {
			showToast(res.error || "Не удалось включить push-уведомления", "warning");
		}
	};

	const handleSendSos = () => {
		triggerHaptic("error");
		setIsSosModalOpen(false);
		onEmergencyCallRequested?.(sosSymptom);
		showToast("Экстренный вызов передан дежурному хирургу клиники!", "success");
	};

	return (
		<div className="postop-widget-card" data-testid="post-op-care-widget">
			{/* HEADER */}
			<div className="postop-header">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
						<HeartPulse className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-bold text-white">Реабилитация после операции</h3>
							<span className="postop-surgery-badge">
								Зуб FDI: {toothFdiCodes.join(", ")}
							</span>
						</div>
						<p className="text-xs text-neutral-400">
							{SURGERY_METADATA[activeSurgery].label} • {patientName}
						</p>
					</div>
				</div>

				{/* 1-Click SOS Emergency Button */}
				<a
					href={`tel:${emergencyPhone.replace(/[^\d+]/g, "")}`}
					onClick={() => {
						triggerHaptic("error");
						setIsSosModalOpen(true);
					}}
					className="postop-sos-button"
					title="Экстренная связь с дежурным врачом-стоматологом"
					aria-label="Экстренная связь с клиникой"
				>
					<PhoneCall className="w-5 h-5 animate-pulse" />
					<span className="hidden sm:inline">SOS Дежурный врач</span>
				</a>
			</div>

			{/* SURGERY SELECTOR PILLS */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
				{(Object.keys(SURGERY_METADATA) as SurgeryType[]).map((st) => (
					<button
						key={st}
						type="button"
						onClick={() => {
							setActiveSurgery(st);
							setSelectedDayIdx(0);
							triggerHaptic("light");
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
							activeSurgery === st
								? "bg-teal-500 text-white shadow-sm"
								: "bg-neutral-800 text-neutral-400 hover:text-white"
						}`}
					>
						{SURGERY_METADATA[st].label}
					</button>
				))}
			</div>

			{/* STEP-BY-STEP CALENDAR STAGES TABS */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				{stages.map((stg, idx) => (
					<button
						key={stg.id}
						type="button"
						onClick={() => {
							setSelectedDayIdx(idx);
							triggerHaptic("light");
						}}
						className={`p-2.5 rounded-xl text-left flex flex-col gap-1 transition-all cursor-pointer border ${
							selectedDayIdx === idx
								? "bg-teal-500/15 border-teal-500/50 text-white shadow-sm"
								: "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
						}`}
					>
						<span className="text-[11px] font-bold text-teal-400">{stg.dayRangeLabel}</span>
						<span className="text-xs font-semibold line-clamp-1">{stg.title}</span>
					</button>
				))}
			</div>

			{/* ACTIVE STAGE CONTENT CARD */}
			<div className="postop-day-card active">
				<div className="postop-day-header">
					<div className="postop-day-title">
						<span className="text-teal-400">{currentStage.dayRangeLabel}:</span>
						<span>{currentStage.title}</span>
					</div>
					<span className="text-xs text-neutral-400 italic">{currentStage.focus}</span>
				</div>

				{/* 15-MINUTE COMPRESS TIMER (Visible on Day 1) */}
				{selectedDayIdx === 0 && (
					<div className="postop-timer-bar">
						<div className="flex items-center gap-2">
							<Clock className="w-4 h-4 text-blue-400" />
							<div>
								<span className="text-xs font-bold text-white">Холодный компресс: </span>
								<span className="font-mono text-sm font-black text-blue-400">
									{formatTimer(compressSecondsLeft)}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={toggleTimer}
								className="postop-timer-btn"
								title={isTimerRunning ? "Пауза" : "Старт 15 мин"}
							>
								{isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
								<span>{isTimerRunning ? "Пауза" : "Старт"}</span>
							</button>
							<button
								type="button"
								onClick={resetTimer}
								className="w-10 h-10 min-h-[44px] min-w-[44px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer transition-colors"
								title="Сбросить таймер"
							>
								<RotateCcw className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				)}

				{/* CLINICAL RULES CHECKLIST */}
				<div className="flex flex-col gap-2">
					<h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
						<CheckCircle2 className="w-4 h-4 text-teal-400" />
						Что необходимо выполнять:
					</h4>
					<div className="postop-checklist">
						{currentStage.rules.map((rule, rIdx) => {
							const itemKey = `${currentStage.id}_rule_${rIdx}`;
							const isChecked = checkedItems[itemKey] || false;
							return (
								<div
									key={itemKey}
									onClick={() => toggleCheck(itemKey)}
									className="postop-check-item"
								>
									<div className={`postop-checkbox ${isChecked ? "checked" : ""}`}>
										{isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
									</div>
									<span className={isChecked ? "line-through text-neutral-500" : ""}>
										{rule}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* PROHIBITED ACTIONS (RED ZONE) */}
				<div className="postop-prohibition-box">
					<div className="postop-prohibition-title">
						<ShieldAlert className="w-4 h-4" />
						Категорически запрещено:
					</div>
					<ul className="text-xs text-red-200/90 list-disc list-inside space-y-1 pl-1">
						{currentStage.prohibited.map((proh, pIdx) => (
							<li key={`proh_${pIdx}`}>{proh}</li>
						))}
					</ul>
				</div>

				{/* PRESCRIBED MEDICATIONS */}
				<div className="flex flex-col gap-2 pt-1 border-t border-neutral-800">
					<h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
						<Sparkles className="w-4 h-4 text-amber-400" />
						Назначенные препараты и дозировки:
					</h4>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{currentStage.medications.map((med, mIdx) => {
							const medKey = `${currentStage.id}_med_${mIdx}`;
							const isMedTaken = checkedItems[medKey] || false;
							return (
								<div
									key={medKey}
									onClick={() => toggleCheck(medKey)}
									className={`p-3 rounded-lg border flex flex-col gap-1 cursor-pointer transition-all ${
										isMedTaken
											? "bg-emerald-950/20 border-emerald-500/40 text-neutral-400"
											: "bg-neutral-900 border-neutral-800 text-white hover:border-neutral-700"
									}`}
								>
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-white">{med.name}</span>
										<div className={`postop-checkbox ${isMedTaken ? "checked" : ""}`}>
											{isMedTaken && <Check className="w-3.5 h-3.5 stroke-[3]" />}
										</div>
									</div>
									<span className="text-[11px] text-teal-400 font-semibold">{med.dosage}</span>
									<span className="text-[10px] text-neutral-400">{med.purpose}</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* FINAL STAGE SUTURE REMOVAL CALL TO ACTION */}
				{selectedDayIdx === stages.length - 1 && (
					<div className="mt-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<ShieldCheck className="w-5 h-5 text-teal-400" />
							<div>
								<h5 className="text-xs font-bold text-white">Визит на снятие швов</h5>
								<p className="text-[11px] text-neutral-400">
									Плановый день: {SURGERY_METADATA[activeSurgery].sutureRemovalDay}-й день после операции
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => {
								triggerHaptic("success");
								onSutureRemovalBooked?.();
								showToast("Заявка на запись на снятие швов отправлена администратору", "success");
							}}
							className="min-h-[44px] px-3.5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold shadow transition-colors cursor-pointer"
						>
							Записаться
						</button>
					</div>
				)}
			</div>

			{/* FOOTER ACTIONS: PUSH REMINDERS */}
			<div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs text-neutral-400">
				<div className="flex items-center gap-1.5">
					<Info className="w-4 h-4 text-neutral-500" />
					<span>При температуре выше 38.0°C или сильном кровотечении немедленно нажмите SOS.</span>
				</div>
				<button
					type="button"
					onClick={handleEnablePushNotifications}
					className={`min-h-[44px] px-3 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
						notificationsEnabled
							? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
							: "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
					}`}
				>
					<Bell className="w-4 h-4" />
					<span>{notificationsEnabled ? "Напоминания включены" : "Включить push-напоминания"}</span>
				</button>
			</div>

			{/* SOS EMERGENCY SYMPTOM MODAL */}
			{isSosModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
					<div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
						<div className="flex items-center justify-between border-b border-neutral-800 pb-3">
							<div className="flex items-center gap-2 text-red-400 font-bold text-base">
								<AlertTriangle className="w-5 h-5" />
								<span>Экстренная связь с дежурным врачом</span>
							</div>
							<button
								type="button"
								onClick={() => setIsSosModalOpen(false)}
								className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-lg text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<p className="text-xs text-neutral-300 leading-relaxed">
							Укажите главный беспокоящий симптом для мгновенного оповещения дежурного хирурга-стоматолога:
						</p>

						<div className="flex flex-col gap-2">
							{[
								{ id: "bleeding", label: "Кровотечение не останавливается более 30 минут" },
								{ id: "increasing_swelling", label: "Отек резко нарастает, трудно открывать рот / глотать" },
								{ id: "high_fever", label: "Температура поднялась выше 38.0°C" },
								{ id: "unbearable_pain", label: "Сильная пульсирующая боль, не снимается анальгетиками" },
								{ id: "suture_loose", label: "Разошлись швы или обнажился край мембраны / имплантат" },
							].map((sym) => (
								<label
									key={sym.id}
									className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-semibold transition-all ${
										sosSymptom === sym.id
											? "bg-red-950/40 border-red-500 text-white"
											: "bg-neutral-800/60 border-neutral-700 text-neutral-300 hover:border-neutral-600"
									}`}
								>
									<input
										type="radio"
										name="sosSymptom"
										value={sym.id}
										checked={sosSymptom === sym.id}
										onChange={() => setSosSymptom(sym.id)}
										className="accent-red-500"
									/>
									<span>{sym.label}</span>
								</label>
							))}
						</div>

						<div className="flex items-center gap-2 pt-2">
							<a
								href={`tel:${emergencyPhone.replace(/[^\d+]/g, "")}`}
								onClick={handleSendSos}
								className="flex-1 min-h-[48px] rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-colors text-decoration-none"
							>
								<PhoneCall className="w-4 h-4" />
								<span>Позвонить врачу ({emergencyPhone})</span>
							</a>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
