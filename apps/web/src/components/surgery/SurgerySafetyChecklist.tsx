import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, AlertTriangle, HeartPulse, Sparkles } from "lucide-react";
import { showToast } from "../GlobalToast";

export interface SurgerySafetyChecklistProps {
	readonly toothFdi?: number;
	readonly patientName?: string;
	readonly onVerifiedChange?: (isVerified: boolean) => void;
	readonly className?: string;
}

export interface OutpatientSurgicalAnamnesisState {
	anestheticAllergyRisk: boolean;
	anticoagulantRisk: boolean;
	bisphosphonateRisk: boolean;
	diabetesRisk: boolean;
}

export const SurgerySafetyChecklist: React.FC<SurgerySafetyChecklistProps> = ({
	toothFdi = 46,
	patientName = "Пациент",
	onVerifiedChange,
	className = "",
}) => {
	const [checks, setChecks] = useState<{
		patientIdentity: boolean;
		zoneVerified: boolean;
		sterilityConfirmed: boolean;
		warehouseNoticeAcknowledged: boolean;
	}>({
		patientIdentity: true,
		zoneVerified: true,
		sterilityConfirmed: true,
		warehouseNoticeAcknowledged: true,
	});

	// 4 столпа амбулаторного хирургического анамнеза (Мандаты 8e, 8i, 8k)
	// Физиологическая норма по умолчанию в 1 клик
	const [anamnesis, setAnamnesis] = useState<OutpatientSurgicalAnamnesisState>({
		anestheticAllergyRisk: false,
		anticoagulantRisk: false,
		bisphosphonateRisk: false,
		diabetesRisk: false,
	});

	const allTimeOutPassed = Object.values(checks).every(Boolean);
	const hasSomaticRisks = Object.values(anamnesis).some(Boolean);

	const handleToggleCheck = (key: keyof typeof checks) => {
		const updated = { ...checks, [key]: !checks[key] };
		setChecks(updated);
		onVerifiedChange?.(Object.values(updated).every(Boolean));
	};

	const handleToggleAnamnesis = (key: keyof OutpatientSurgicalAnamnesisState) => {
		setAnamnesis((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	const handleOneClickAllNorm = () => {
		const verified = {
			patientIdentity: true,
			zoneVerified: true,
			sterilityConfirmed: true,
			warehouseNoticeAcknowledged: true,
		};
		setChecks(verified);
		setAnamnesis({
			anestheticAllergyRisk: false,
			anticoagulantRisk: false,
			bisphosphonateRisk: false,
			diabetesRisk: false,
		});
		onVerifiedChange?.(true);
		showToast("Хирургический Time-Out & Анамнез: норма подтверждена в 1 клик", "success");
	};

	const handleOneClickAnamnesisNorm = () => {
		setAnamnesis({
			anestheticAllergyRisk: false,
			anticoagulantRisk: false,
			bisphosphonateRisk: false,
			diabetesRisk: false,
		});
		showToast("Анамнез хирурга-стоматолога: физиологическая норма (1 клик)", "success");
	};

	return (
		<div
			className={`p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] space-y-3 ${className}`.trim()}
			data-testid="surgery-safety-checklist"
		>
			{/* Верхний тулбар: Time-Out ВОЗ + Кнопки 1-клик нормы */}
			<div className="flex items-center justify-between gap-2 flex-wrap min-h-[36px]">
				<div className="flex items-center gap-2">
					<ShieldCheck size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
						Хирургический Time-Out (Безопасность ВОЗ · Амбулаторная норма)
					</span>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={handleOneClickAnamnesisNorm}
						className="min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.1))] flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						title="Сбросить все 4 фактора риска в физиологическую норму"
						data-testid="btn-anamnesis-all-norm"
					>
						<Sparkles size={14} />
						<span>1-Клик норма анамнеза</span>
					</button>

					<button
						type="button"
						onClick={handleOneClickAllNorm}
						className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 active:scale-95 transition-all shadow-xs"
						title="Подтвердить Time-Out ВОЗ и чистый анамнез в 1 клик"
						data-testid="btn-timeout-all-norm"
					>
						<CheckCircle2 size={16} />
						<span>1-Клик норма (Time-Out & Анамнез)</span>
					</button>
				</div>
			</div>

			{/* Сетка чек-листа Time-Out */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
				<label className="min-h-[48px] p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none touch-manipulation flex items-center gap-2.5 hover:border-[var(--teal,#0d9488)] transition-all">
					<input
						type="checkbox"
						checked={checks.patientIdentity}
						onChange={() => handleToggleCheck("patientIdentity")}
						className="w-5 h-5 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)] shrink-0 cursor-pointer"
						data-testid="check-patient-identity"
					/>
					<span className="font-semibold text-[var(--ink)] leading-snug">
						Пациент идентифицирован ({patientName}), аллергоанамнез сверен
					</span>
				</label>

				<label className="min-h-[48px] p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none touch-manipulation flex items-center gap-2.5 hover:border-[var(--teal,#0d9488)] transition-all">
					<input
						type="checkbox"
						checked={checks.zoneVerified}
						onChange={() => handleToggleCheck("zoneVerified")}
						className="w-5 h-5 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)] shrink-0 cursor-pointer"
						data-testid="check-zone-verified"
					/>
					<span className="font-semibold text-[var(--ink)] leading-snug">
						Область операции сверена: Зуб FDI #{toothFdi}
					</span>
				</label>

				<label className="min-h-[48px] p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none touch-manipulation flex items-center gap-2.5 hover:border-[var(--teal,#0d9488)] transition-all">
					<input
						type="checkbox"
						checked={checks.sterilityConfirmed}
						onChange={() => handleToggleCheck("sterilityConfirmed")}
						className="w-5 h-5 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)] shrink-0 cursor-pointer"
						data-testid="check-sterility"
					/>
					<span className="font-semibold text-[var(--ink)] leading-snug">
						Стерильность стола и физиодиспенсера подтверждена
					</span>
				</label>

				<label className="min-h-[48px] p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] cursor-pointer select-none touch-manipulation flex items-center gap-2.5 hover:border-[var(--teal,#0d9488)] transition-all">
					<input
						type="checkbox"
						checked={checks.warehouseNoticeAcknowledged}
						onChange={() => handleToggleCheck("warehouseNoticeAcknowledged")}
						className="w-5 h-5 rounded text-[var(--teal,#0d9488)] accent-[var(--teal,#0d9488)] shrink-0 cursor-pointer"
						data-testid="check-warehouse"
					/>
					<span className="font-semibold text-[var(--ink)] leading-snug">
						Складской учет: овердрафт активен (без блокировки операции)
					</span>
				</label>
			</div>

			{/* 4 столпа амбулаторного хирургического анамнеза (Мандаты 8e, 8i) */}
			<div className="pt-2 border-t border-[var(--line)] space-y-2">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 text-xs font-black uppercase text-[var(--muted)] tracking-wider">
						<HeartPulse size={15} className="text-[var(--teal,#0d9488)]" />
						<span>4 фактора риска хирурга-стоматолога (Амбулаторный профиль):</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] font-medium">
						{hasSomaticRisks ? "Обнаружены соматические риски" : "Физиологическая норма"}
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
					{/* 1. Аллергия на анестетики */}
					<button
						type="button"
						onClick={() => handleToggleAnamnesis("anestheticAllergyRisk")}
						className={`min-h-[48px] p-2.5 rounded-xl border text-left cursor-pointer transition-all touch-manipulation flex flex-col justify-between ${
							anamnesis.anestheticAllergyRisk
								? "bg-[var(--amber-surface,rgba(245,158,11,0.15))] border-[var(--amber-soft,#f59e0b)] text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="anamnesis-allergy-toggle"
					>
						<span className="font-bold">1. Аллергия на анестетики</span>
						<span className={`text-[10px] ${anamnesis.anestheticAllergyRisk ? "text-[var(--amber-dark,#b45309)] font-bold" : "text-[var(--muted)]"}`}>
							{anamnesis.anestheticAllergyRisk ? "РИСК: Аллергия заявлена" : "Норма: аллергий нет"}
						</span>
					</button>

					{/* 2. Антикоагулянты и гемостаз */}
					<button
						type="button"
						onClick={() => handleToggleAnamnesis("anticoagulantRisk")}
						className={`min-h-[48px] p-2.5 rounded-xl border text-left cursor-pointer transition-all touch-manipulation flex flex-col justify-between ${
							anamnesis.anticoagulantRisk
								? "bg-[var(--amber-surface,rgba(245,158,11,0.15))] border-[var(--amber-soft,#f59e0b)] text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="anamnesis-anticoagulant-toggle"
					>
						<span className="font-bold">2. Антикоагулянты / МНО</span>
						<span className={`text-[10px] ${anamnesis.anticoagulantRisk ? "text-[var(--amber-dark,#b45309)] font-bold" : "text-[var(--muted)]"}`}>
							{anamnesis.anticoagulantRisk ? "РИСК: Прием антикоагулянтов" : "Норма: гемостаз чист"}
						</span>
					</button>

					{/* 3. Бисфосфонаты и MRONJ */}
					<button
						type="button"
						onClick={() => handleToggleAnamnesis("bisphosphonateRisk")}
						className={`min-h-[48px] p-2.5 rounded-xl border text-left cursor-pointer transition-all touch-manipulation flex flex-col justify-between ${
							anamnesis.bisphosphonateRisk
								? "bg-[var(--amber-surface,rgba(245,158,11,0.15))] border-[var(--amber-soft,#f59e0b)] text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="anamnesis-bisphosphonate-toggle"
					>
						<span className="font-bold">3. Бисфосфонаты / MRONJ</span>
						<span className={`text-[10px] ${anamnesis.bisphosphonateRisk ? "text-[var(--amber-dark,#b45309)] font-bold" : "text-[var(--muted)]"}`}>
							{anamnesis.bisphosphonateRisk ? "РИСК: Остеонекроз (БРОНЖ)" : "Норма: не принимал"}
						</span>
					</button>

					{/* 4. Сахарный диабет */}
					<button
						type="button"
						onClick={() => handleToggleAnamnesis("diabetesRisk")}
						className={`min-h-[48px] p-2.5 rounded-xl border text-left cursor-pointer transition-all touch-manipulation flex flex-col justify-between ${
							anamnesis.diabetesRisk
								? "bg-[var(--amber-surface,rgba(245,158,11,0.15))] border-[var(--amber-soft,#f59e0b)] text-[var(--ink)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="anamnesis-diabetes-toggle"
					>
						<span className="font-bold">4. Сахарный диабет</span>
						<span className={`text-[10px] ${anamnesis.diabetesRisk ? "text-[var(--amber-dark,#b45309)] font-bold" : "text-[var(--muted)]"}`}>
							{anamnesis.diabetesRisk ? "РИСК: Замедленное заживление" : "Норма: диабета нет"}
						</span>
					</button>
				</div>

				{/* Неблокирующее информирование врача при выявлении рисков (Мандат 8e) */}
				{hasSomaticRisks && (
					<div className="p-2.5 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,#f59e0b)] space-y-1 text-xs" data-testid="anamnesis-risk-guidance">
						<div className="font-extrabold text-[var(--amber-dark,#b45309)] flex items-center gap-1.5">
							<AlertTriangle size={15} className="shrink-0" />
							<span>Клинические рекомендации при выявленных соматических рисках:</span>
						</div>
						<ul className="list-disc list-inside space-y-0.5 text-[var(--ink)] text-[11px] leading-snug">
							{anamnesis.anestheticAllergyRisk && (
								<li><strong>Аллергия:</strong> проверить реакцию на сульфиты/амиды. При риске — Скандонест 3% без адреналина или консультация аллерголога.</li>
							)}
							{anamnesis.anticoagulantRisk && (
								<li><strong>Антикоагулянты:</strong> риск кровотечения. Использовать местный гемостаз (гемостатическая губка, швы, компрессия), не отменять терапию без кардиолога.</li>
							)}
							{anamnesis.bisphosphonateRisk && (
								<li><strong>Бисфосфонаты:</strong> высокий риск медикаментозного остеонекроза (MRONJ). Атравматичный протокол, минимальное скелетирование кости, антибиотикопрофилактика.</li>
							)}
							{anamnesis.diabetesRisk && (
								<li><strong>Диабет:</strong> контроль уровня гликемии, щадящая мобилизация лоскута, усиленный антисептический контроль и антибиотикопрофилактика.</li>
							)}
						</ul>
					</div>
				)}
			</div>

			{!allTimeOutPassed && (
				<div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--amber-surface,rgba(245,158,11,0.1))] text-xs text-[var(--amber-dark,#b45309)]">
					<AlertTriangle size={15} className="shrink-0" />
					<span>Отметьте пункты Time-Out или нажмите «1-Клик норма» для моментального подтверждения.</span>
				</div>
			)}
		</div>
	);
};

export default SurgerySafetyChecklist;

