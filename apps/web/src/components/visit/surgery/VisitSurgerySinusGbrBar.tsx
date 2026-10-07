import React, { useState } from "react";
import { Zap, CheckCircle2, ShieldCheck, Layers } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface VisitSurgerySinusGbrBarProps {
	readonly effectiveTooth: number;
	readonly isClosedSinus?: boolean;
	readonly onApplyProtocolText: (text: string) => void;
}

export const VisitSurgerySinusGbrBar: React.FC<VisitSurgerySinusGbrBarProps> = ({
	effectiveTooth,
	isClosedSinus = false,
	onApplyProtocolText,
}) => {
	const [selectedGraft, setSelectedGraft] = useState<string>("Bio-Oss 0.5 г");
	const [selectedMembrane, setSelectedMembrane] = useState<string>(
		isClosedSinus ? "Без мембраны" : "Bio-Gide 25x25 мм",
	);
	const [hasPins, setHasPins] = useState<boolean>(!isClosedSinus);
	const [sutureMaterial, setSutureMaterial] = useState<string>("ПГА 4-0");

	const buildGbrProtocolText = (
		graft: string,
		membrane: string,
		pins: boolean,
		suture: string,
	) => {
		const toothStr = `области зуба FDI #${effectiveTooth}`;
		if (isClosedSinus) {
			return (
				`Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. ` +
				`Разрез по гребню альвеолярного отростка в ${toothStr}, отслоен слизисто-надкостничный лоскут. ` +
				`Пилотное препарирование костного ложа фрезами с обильным охлаждением физраствором с недоходом до дна пазухи 1 мм. ` +
				`Трансальвеолярная элевация дна верхнечелюстного синуса остеотомами Саммерса (закрытый синус-лифтинг). ` +
				`Целостность мембраны Шнайдера подтверждена пробой Вальсальвы (носоротовой тест отрицательный). ` +
				`Внесение остеопластического материала: ${graft}. ` +
				`Установка дентального имплантата с первичной стабильностью 35 Н·см. ` +
				`Установка формирователя десны / винта-заглушки. Ушивание раны шовным материалом ${suture} без натяжения. ` +
				`Гемостаз полный. Рекомендации даны.`
			);
		}

		const pinsText = pins ? "Барьерная мембрана фиксирована титановыми пинами (2 шт). " : "";
		const membraneText =
			membrane !== "Без мембраны"
				? `Уложена барьерная мембрана ${membrane}. ${pinsText}`
				: "";

		return (
			`Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. ` +
			`Трапециевидный разрез в боковом отделе верхней челюсти в ${toothStr}, скелетирование передне-боковой стенки верхнечелюстного синуса. ` +
			`Формирование латерального окна пьезотомом. Аккуратная элевация мембраны Шнайдера без перфорации. ` +
			`Субантральное пространство заполнено остеопластическим материалом: ${graft}. ` +
			membraneText +
			`Послойное ушивание раны шовным материалом ${suture} без натяжения. ` +
			`Гемостаз полный. Рекомендации даны (сосудосуживающие капли в нос 5 дней, не чихать с закрытым ртом, антибиотикотерапия).`
		);
	};

	const handleGraftSelect = (graft: string) => {
		setSelectedGraft(graft);
		const text = buildGbrProtocolText(graft, selectedMembrane, hasPins, sutureMaterial);
		onApplyProtocolText(text);
	};

	const handleMembraneSelect = (membrane: string) => {
		setSelectedMembrane(membrane);
		const text = buildGbrProtocolText(selectedGraft, membrane, hasPins, sutureMaterial);
		onApplyProtocolText(text);
	};

	// Физиологическая норма НКР / Синус-лифтинга (Мандат 8e)
	const handleApplyUncomplicatedGbrNorm = () => {
		const graft = "Bio-Oss 0.5 г (ксенографт)";
		const membrane = isClosedSinus ? "Без мембраны" : "Bio-Gide 25x25 мм";
		const pins = !isClosedSinus;
		const suture = "ПГА 4-0";
		setSelectedGraft(graft);
		setSelectedMembrane(membrane);
		setHasPins(pins);
		setSutureMaterial(suture);

		const text = buildGbrProtocolText(graft, membrane, pins, suture);
		onApplyProtocolText(text);
		showToast(
			"✓ Физиологическая норма: Субантральная аугментация выполнена, мембрана Шнайдера интактна, гемостаз полный",
			"success",
		);
	};

	return (
		<div
			className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3"
			data-testid="visit-surgery-sinus-gbr-bar"
		>
			{/* Верхний ряд */}
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
					<Layers size={16} />
					<span>Костная пластика & Синус-лифтинг:</span>
				</div>

				<button
					type="button"
					onClick={handleApplyUncomplicatedGbrNorm}
					className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-2 cursor-pointer shadow-xs hover:opacity-95 transition-all touch-manipulation"
					data-testid="btn-uncomplicated-gbr-norm"
					title="Физиологическая норма: остеопластика, мембрана Шнайдера интактна, гемостаз полный"
				>
					<Zap size={14} className="text-amber-300" />
					<span>Норма НКР: мембрана Шнайдера интактна, графт внесен, гемостаз устойчивый</span>
				</button>
			</div>

			{/* Выбор остеопластического материала (Графт) */}
			<div className="space-y-1">
				<span className="text-[11px] font-bold text-[var(--muted)]">Костный графт:</span>
				<div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Выбор костного материала">
					{[
						{ label: "Bio-Oss 0.5 г (Ксенографт)", short: "Bio-Oss 0.5г" },
						{ label: "Cerabone 0.5 г (Ксенографт)", short: "Cerabone" },
						{ label: "SureOss (Аллографт)", short: "SureOss" },
						{ label: "Аутокость (костный скребок)", short: "Аутокость" },
					].map((g) => {
						const isSel = selectedGraft.includes(g.short) || selectedGraft === g.label;
						return (
							<button
								key={g.short}
								type="button"
								onClick={() => handleGraftSelect(g.label)}
								className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
									isSel
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`btn-graft-${g.short.replace(/[\s.]+/g, "-")}`}
							>
								{isSel && <CheckCircle2 size={13} className="shrink-0" />}
								<span>{g.short}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Барьерная мембрана и фиксация пинами */}
			<div className="space-y-1">
				<span className="text-[11px] font-bold text-[var(--muted)]">Барьерная мембрана & Пины:</span>
				<div className="flex items-center gap-2 flex-wrap">
					{[
						{ label: "Bio-Gide 25x25 мм", short: "Bio-Gide 25×25" },
						{ label: "Jason мембрана", short: "Jason" },
						{ label: "Cytoplast d-PTFE", short: "Cytoplast" },
						{ label: "Без мембраны", short: "Без мембраны" },
					].map((m) => {
						const isSel = selectedMembrane.includes(m.short) || selectedMembrane === m.label;
						return (
							<button
								key={m.short}
								type="button"
								onClick={() => handleMembraneSelect(m.label)}
								className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
									isSel
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`btn-membrane-${m.short.replace(/[\s×]+/g, "-")}`}
							>
								{isSel && <CheckCircle2 size={13} className="shrink-0" />}
								<span>{m.short}</span>
							</button>
						);
					})}

					{/* Титановые пины тоггл */}
					<button
						type="button"
						onClick={() => {
							const nextPins = !hasPins;
							setHasPins(nextPins);
							const text = buildGbrProtocolText(selectedGraft, selectedMembrane, nextPins, sutureMaterial);
							onApplyProtocolText(text);
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ml-auto ${
							hasPins
								? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
						}`}
						data-testid="btn-toggle-titanium-pins"
					>
						<ShieldCheck size={14} />
						<span>{hasPins ? "Пины титановые: 2 шт" : "Без пинов"}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default VisitSurgerySinusGbrBar;
