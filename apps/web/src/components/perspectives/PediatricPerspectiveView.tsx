import { AnimatePresence, motion } from "framer-motion";
import {
	AlertCircle,
	ArrowLeft,
	Award,
	Baby,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Edit3,
	Gift,
	Heart,
	Layers,
	Loader2,
	Phone,
	Plus,
	Save,
	Shield,
	ShieldCheck,
	Smile,
	Sparkles,
	Star,
	Stethoscope,
	Users,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	TOOTH_STATE_LABELS,
	type ToothState,
} from "../odontogram/ToothChart";

interface PediatricTemplate {
	id: string;
	title: string;
	description: string;
	durationMin: number;
	icon: string;
	recommendedTooth?: number;
}

const PEDIATRIC_TEMPLATES: PediatricTemplate[] = [
	{
		id: "adaptation",
		title: "Адаптационный визит (Знакомство)",
		description: "Экскурсия по кабинету, чистка зубов щеточкой с клубничной пастой, вручение подарка за смелость",
		durationMin: 20,
		icon: "🧸",
	},
	{
		id: "fissure_seal",
		title: "Герметизация фиссур",
		description: "Очистка фиссур пастой без фтора, протравливание, нанесение светоотверждаемого герметика",
		durationMin: 30,
		icon: "🛡️",
	},
	{
		id: "milk_caries",
		title: "Лечение кариеса молочного зуба",
		description: "Щадящее препарирование без боли, пломбирование стеклоиономерным цементом / Twinky Star",
		durationMin: 40,
		icon: "🦷",
	},
	{
		id: "pulpotomy",
		title: "Пульпотомия (витальная ампутация)",
		description: "Купирование пульпита временного зуба, наложение гемостатического препарата Pulpotec/MTA",
		durationMin: 45,
		icon: "🩹",
	},
	{
		id: "milk_extraction",
		title: "Удаление подвижного молочного зуба",
		description: "Вкусная аппликационная анестезия (гель со вкусом вишни), легкая люксация, памятка для Зубной феи",
		durationMin: 15,
		icon: "🎈",
	},
];

const PEDIATRIC_TOOTH_STATES: ReadonlyArray<{
	state: ToothState;
	label: string;
	badgeClass: string;
}> = [
	{ state: "Caries", label: "Кариес молочного", badgeClass: "bg-red-500 text-white" },
	{ state: "Pulpitis", label: "Пульпит (Пульпотомия)", badgeClass: "bg-amber-500 text-white" },
	{ state: "Filled", label: "Пломба / Twinky", badgeClass: "bg-teal-600 text-white" },
	{ state: "Missing", label: "Сменился (Выпал)", badgeClass: "bg-zinc-600 text-white" },
	{ state: "Healthy", label: "Здоров / Прорезался", badgeClass: "bg-emerald-600 text-white" },
];

export function PediatricPerspectiveView() {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const setPerspective = usePerspectiveStore((s) => s.setPerspective);
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const activePatient = useMemo(() => {
		if (!dashboard?.patients || dashboard.patients.length === 0) return null;
		if (selectedPatientId) {
			const found = dashboard.patients.find((p) => p.id === selectedPatientId);
			if (found) return found;
		}
		return dashboard.patients[0] ?? null;
	}, [dashboard?.patients, selectedPatientId]);

	const [selectedTooth, setSelectedTooth] = useState<number>(55);
	const [toothStates, setToothStates] = useState<Record<number, ToothState>>({});
	const [isMixedDentition, setIsMixedDentition] = useState<boolean>(false);
	const [isSavingTooth, setIsSavingTooth] = useState(false);

	// Parent / Legal representative edit state
	const [isEditingRepresentative, setIsEditingRepresentative] = useState(false);
	const [parentFullName, setParentFullName] = useState<string>("");
	const [parentPhone, setParentPhone] = useState<string>("");
	const [parentRelationship, setParentRelationship] = useState<string>("Мать");
	const [isSavingRepresentative, setIsSavingRepresentative] = useState(false);

	// Milk teeth quadrants
	const upperMilkTeeth = useMemo(() => [55, 54, 53, 52, 51, 61, 62, 63, 64, 65], []);
	const lowerMilkTeeth = useMemo(() => [85, 84, 83, 82, 81, 71, 72, 73, 74, 75], []);

	// First permanent molars in mixed dentition
	const permanentMixedUpper = useMemo(() => [16, 26], []);
	const permanentMixedLower = useMemo(() => [46, 36], []);

	// Load existing representative from administrative profile
	useEffect(() => {
		if (activePatient?.administrativeProfile) {
			const prof = activePatient.administrativeProfile as Record<string, unknown>;
			setParentFullName(typeof prof.legalRepresentativeName === "string" ? prof.legalRepresentativeName : "");
			setParentPhone(typeof prof.legalRepresentativePhone === "string" ? prof.legalRepresentativePhone : "");
			setParentRelationship(typeof prof.legalRepresentativeRole === "string" ? prof.legalRepresentativeRole : "Мать");
		} else {
			setParentFullName("");
			setParentPhone("");
			setParentRelationship("Мать");
		}
	}, [activePatient]);

	const fetchToothStates = useCallback(async () => {
		if (!activePatient?.id) return;
		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states`, {
				headers: auth.denteClinicalMutationHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					const map: Record<number, ToothState> = {};
					for (const item of data) {
						if (item.toothNumber && item.state) {
							map[item.toothNumber] = item.state as ToothState;
						}
					}
					setToothStates(map);
				}
			}
		} catch (err) {
			logger.error("[PediatricPerspective] Failed to load tooth states", err);
		}
	}, [activePatient?.id, auth]);

	useEffect(() => {
		void fetchToothStates();
	}, [fetchToothStates]);

	const handleToothStatusSelect = async (state: ToothState) => {
		if (!activePatient?.id || !selectedTooth) return;
		setIsSavingTooth(true);
		try {
			const res = await fetch(`/api/patients/${activePatient.id}/tooth-states/batch`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					updates: [
						{
							toothNumber: selectedTooth,
							state,
							surfaces: [],
							diagnosis: TOOTH_STATE_LABELS[state] || state,
						},
					],
				}),
			});

			if (!res.ok) {
				showToast(actionFailureToast("Состояние зуба не сохранено", res.status), "error");
				return;
			}

			setToothStates((prev) => ({
				...prev,
				[selectedTooth]: state,
			}));
			showToast(`Молочный зуб ${selectedTooth}: статус «${TOOTH_STATE_LABELS[state]}» сохранен`, "success");
		} catch (err) {
			logger.error("[PediatricPerspective] Save tooth error", err);
			showToast("Ошибка сохранения статуса молочного зуба", "error");
		} finally {
			setIsSavingTooth(false);
		}
	};

	const handleSaveRepresentative = async () => {
		if (!activePatient?.id) return;
		setIsSavingRepresentative(true);
		try {
			const currentAdmin = (activePatient.administrativeProfile as Record<string, unknown>) || {};
			const res = await fetch(`/api/patients/${activePatient.id}/administrative-profile`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					...currentAdmin,
					legalRepresentativeName: parentFullName,
					legalRepresentativePhone: parentPhone,
					legalRepresentativeRole: parentRelationship,
				}),
			});

			if (res.ok) {
				showToast("Данные законного представителя сохранены (323-ФЗ)", "success");
				setIsEditingRepresentative(false);
				await loadDashboard();
			} else {
				showToast(actionFailureToast("Ошибка сохранения представителя", res.status), "error");
			}
		} catch (err) {
			logger.error("[PediatricPerspective] Representative save error", err);
			showToast("Ошибка сохранения данных родителя", "error");
		} finally {
			setIsSavingRepresentative(false);
		}
	};

	const handleApplyTemplate = (tmpl: PediatricTemplate) => {
		showToast(`Протокол «${tmpl.title}» применён к визиту`, "success");
	};

	return (
		<div
			data-testid="pediatric-perspective-view"
			className="pediatric-perspective min-h-screen bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] flex flex-col p-3 md:p-6"
		>
			{/* Top Bar */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-4 shadow-xl">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[50px] px-4 py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-bold flex items-center gap-2 border border-slate-600 active:scale-95 transition-all text-sm cursor-pointer shadow-md"
					>
						<ArrowLeft size={20} />
						<span>Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-pink-400 bg-pink-950/80 px-2.5 py-1 rounded-md border border-pink-500/30 flex items-center gap-1">
								<Baby size={14} /> Детский приём · Молочный прикус (51–85)
							</span>
							{activePatient && (
								<span className="text-xs font-semibold text-slate-400">
									Детская карта #{activePatient.id.slice(0, 6)}
								</span>
							)}
						</div>
						<h1 className="text-xl md:text-2xl font-black text-white m-0 mt-1 flex items-center gap-2">
							<span>{activePatient?.fullName || "Ребёнок (Пациент не выбран)"}</span>
							<span className="text-sm font-bold text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-500/20">
								🧸 6 лет
							</span>
						</h1>
					</div>
				</div>

				{/* Mixed Dentition Toggle */}
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setIsMixedDentition((prev) => !prev)}
						className={`h-11 px-4 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
							isMixedDentition
								? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
								: "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
						}`}
					>
						<Sparkles size={16} />
						<span>{isMixedDentition ? "Сменный прикус (Вкл.)" : "Только молочные (51–85)"}</span>
					</button>
				</div>
			</header>

			{/* Main Grid: Pediatric Formula (Left) + Parent Link & Templates (Right) */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
				{/* Left: Pediatric Tooth Chart & 1-Tap Status */}
				<section className="lg:col-span-7 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700">
							<div className="flex items-center gap-2">
								<Smile size={22} className="text-pink-400" />
								<h2 className="text-lg font-bold text-white m-0">
									Формула молочных зубов (Выбран #{selectedTooth})
								</h2>
							</div>
							<span className="text-xs text-pink-300 font-semibold">FDI 51–85</span>
						</div>

						{/* Upper Milk Arch (55–65) */}
						<div className="mb-5">
							<div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
								<span>Верхняя челюсть (55–51 | 61–65)</span>
								{isMixedDentition && <span className="text-purple-300 font-normal">+ моляры 16, 26</span>}
							</div>
							<div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
								{upperMilkTeeth.map((tNum) => {
									const isSelected = selectedTooth === tNum;
									const state = toothStates[tNum] || "Healthy";
									return (
										<button
											key={tNum}
											type="button"
											onClick={() => setSelectedTooth(tNum)}
											className={`min-h-[58px] rounded-2xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 ${
												isSelected
													? "bg-pink-500 text-slate-950 border-white shadow-lg shadow-pink-500/30 scale-105 z-10"
													: "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
											}`}
										>
											<span className="text-base">{tNum}</span>
											<span
												className={`text-[9px] px-1 rounded-sm mt-0.5 max-w-[90%] truncate font-medium ${
													isSelected ? "bg-slate-950 text-pink-300" : "bg-slate-900 text-slate-400"
												}`}
											>
												{TOOTH_STATE_LABELS[state] || state}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Lower Milk Arch (85–75) */}
						<div>
							<div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
								<span>Нижняя челюсть (85–81 | 71–75)</span>
								{isMixedDentition && <span className="text-purple-300 font-normal">+ моляры 46, 36</span>}
							</div>
							<div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
								{lowerMilkTeeth.map((tNum) => {
									const isSelected = selectedTooth === tNum;
									const state = toothStates[tNum] || "Healthy";
									return (
										<button
											key={tNum}
											type="button"
											onClick={() => setSelectedTooth(tNum)}
											className={`min-h-[58px] rounded-2xl flex flex-col items-center justify-center font-black transition-all border cursor-pointer active:scale-95 ${
												isSelected
													? "bg-pink-500 text-slate-950 border-white shadow-lg shadow-pink-500/30 scale-105 z-10"
													: "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
											}`}
										>
											<span className="text-base">{tNum}</span>
											<span
												className={`text-[9px] px-1 rounded-sm mt-0.5 max-w-[90%] truncate font-medium ${
													isSelected ? "bg-slate-950 text-pink-300" : "bg-slate-900 text-slate-400"
												}`}
											>
												{TOOTH_STATE_LABELS[state] || state}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* 1-Tap Status Options for Kids */}
					<div className="mt-6 pt-4 border-t border-slate-700/80">
						<div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
							<span>Отметить статус молочного зуба #{selectedTooth}:</span>
							{isSavingTooth && (
								<span className="text-pink-400 text-xs flex items-center gap-1">
									<Loader2 size={14} className="animate-spin" /> Сохранение...
								</span>
							)}
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
							{PEDIATRIC_TOOTH_STATES.map((opt) => (
								<button
									key={opt.state}
									type="button"
									disabled={isSavingTooth}
									onClick={() => void handleToothStatusSelect(opt.state)}
									className="min-h-[52px] p-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow"
								>
									<span>{opt.label}</span>
									<span className={`text-[9px] px-1.5 py-0.2 rounded-full ${opt.badgeClass}`}>
										1 клик
									</span>
								</button>
							))}
						</div>
					</div>
				</section>

				{/* Right: Parent/Legal Representative Linkage & Pediatric Templates */}
				<section className="lg:col-span-5 flex flex-col gap-5">
					{/* Legal Representative / Parent Card (323-ФЗ) */}
					<div className="bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex flex-col">
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
							<div className="flex items-center gap-2">
								<Users size={22} className="text-teal-400" />
								<h3 className="text-base font-bold text-white m-0">
									Законный представитель (323-ФЗ)
								</h3>
							</div>
							{!isEditingRepresentative ? (
								<button
									type="button"
									onClick={() => setIsEditingRepresentative(true)}
									className="text-xs text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
								>
									<Edit3 size={14} /> Изменить
								</button>
							) : (
								<button
									type="button"
									onClick={() => setIsEditingRepresentative(false)}
									className="text-xs text-slate-400 hover:underline cursor-pointer"
								>
									Отмена
								</button>
							)}
						</div>

						{isEditingRepresentative ? (
							<div className="space-y-3">
								<label className="flex flex-col text-xs text-slate-400 font-semibold gap-1">
									ФИО родителя / опекуна
									<input
										type="text"
										value={parentFullName}
										onChange={(e) => setParentFullName(e.target.value)}
										placeholder="Иванова Анна Сергеевна"
										className="h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
									/>
								</label>

								<div className="grid grid-cols-2 gap-2">
									<label className="flex flex-col text-xs text-slate-400 font-semibold gap-1">
										Родство
										<select
											value={parentRelationship}
											onChange={(e) => setParentRelationship(e.target.value)}
											className="h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
										>
											<option value="Мать">Мать</option>
											<option value="Отец">Отец</option>
											<option value="Опекун">Опекун</option>
											<option value="Попечитель">Попечитель</option>
										</select>
									</label>

									<label className="flex flex-col text-xs text-slate-400 font-semibold gap-1">
										Телефон представителя
										<input
											type="tel"
											value={parentPhone}
											onChange={(e) => setParentPhone(e.target.value)}
											placeholder="+7 (999) 000-00-00"
											className="h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
										/>
									</label>
								</div>

								<button
									type="button"
									disabled={isSavingRepresentative}
									onClick={() => void handleSaveRepresentative()}
									className="w-full h-10 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition-all mt-2"
								>
									{isSavingRepresentative ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
									<span>Сохранить данные представителя</span>
								</button>
							</div>
						) : (
							<div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-slate-400">Представитель:</span>
									<strong className="text-white font-bold">
										{parentFullName || "Не указан"} ({parentRelationship})
									</strong>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-slate-400">Телефон:</span>
									<span className="text-teal-400 font-bold">{parentPhone || "—"}</span>
								</div>
								<div className="flex justify-between items-center pt-1 border-t border-slate-700">
									<span className="text-slate-400">Статус согласия ИДС:</span>
									<span className="text-emerald-400 font-bold flex items-center gap-1">
										<ShieldCheck size={14} /> Подписано
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Pediatric Treatment Templates */}
					<div className="bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
								<div className="flex items-center gap-2">
									<Sparkles size={22} className="text-pink-400" />
									<h3 className="text-base font-bold text-white m-0">
										Детские клинические шаблоны
									</h3>
								</div>
								<span className="text-xs text-slate-400">1 клик</span>
							</div>

							<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
								{PEDIATRIC_TEMPLATES.map((tmpl) => (
									<div
										key={tmpl.id}
										onClick={() => handleApplyTemplate(tmpl)}
										className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-pink-500/50 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-98"
									>
										<div className="flex items-start gap-2.5">
											<span className="text-xl shrink-0 mt-0.5">{tmpl.icon}</span>
											<div>
												<div className="text-xs font-bold text-white">{tmpl.title}</div>
												<div className="text-[11px] text-slate-400 leading-tight mt-0.5">
													{tmpl.description}
												</div>
											</div>
										</div>

										<div className="text-right shrink-0">
											<span className="text-[10px] text-slate-400 font-semibold block">
												{tmpl.durationMin} мин
											</span>
											<span className="text-xs text-pink-400 font-bold flex items-center gap-0.5">
												Применить <ChevronRight size={14} />
											</span>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Rewards & Motivation */}
						<div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between">
							<div className="flex items-center gap-2 text-xs text-pink-300 font-semibold">
								<Award size={18} className="text-pink-400" />
								<span>Грамота Зубной феи за смелость</span>
							</div>
							<button
								type="button"
								onClick={() => {
									window.print();
									showToast("Печать детской грамоты за смелость...", "success");
								}}
								className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow"
							>
								Распечатать
							</button>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
