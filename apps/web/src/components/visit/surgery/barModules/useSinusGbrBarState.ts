import { useState, useEffect, useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import {
	getSinusGbrSurgicalServices,
	dispatchSurgicalServicesToInvoice,
	type SurgicalServiceItem,
} from "../../../surgery/surgeryProtocols";

export interface UseSinusGbrBarStateParams {
	readonly effectiveTooth: number;
	readonly isClosedSinus?: boolean | undefined;
	readonly onApplyProtocolText: (text: string) => void;
	readonly onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
}

export function useSinusGbrBarState({
	effectiveTooth,
	isClosedSinus = false,
	onApplyProtocolText,
	onAddToInvoice,
}: UseSinusGbrBarStateParams) {
	const [selectedGraft, setSelectedGraft] = useState<string>("Bio-Oss 0.5 г");
	const [selectedMembrane, setSelectedMembrane] = useState<string>(
		isClosedSinus ? "Без мембраны" : "Bio-Gide 25x25 мм",
	);
	const [hasPins, setHasPins] = useState<boolean>(!isClosedSinus);
	const [sutureMaterial, setSutureMaterial] = useState<string>("ПГА 4-0");
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
	const [isMobile, setIsMobile] = useState<boolean>(
		typeof window !== "undefined" && window.innerWidth <= 768,
	);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const buildGbrProtocolText = useCallback((
		graft: string, membrane: string, pins: boolean, suture: string,
	) => {
		const toothStr = `области зуба FDI #${effectiveTooth}`;
		if (isClosedSinus) {
			return (
				`Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в ${toothStr}, отслоен слизисто-надкостничный лоскут. Пилотное препарирование костного ложа фрезами с обильным охлаждением физраствором с недоходом до дна пазухи 1 мм. Трансальвеолярная элевация дна верхнечелюстного синуса остеотомами Саммерса (закрытый синус-лифтинг). Целостность мембраны Шнайдера подтверждена пробой Вальсальвы (носоротовой тест отрицательный). Внесение остеопластического материала: ${graft}. Установка дентального имплантата с первичной стабильностью 35 Н·см. Установка формирователя десны / винта-заглушки. Ушивание раны шовным материалом ${suture} без натяжения. Гемостаз полный. Рекомендации даны.`
			);
		}
		const pinsText = pins ? "Барьерная мембрана фиксирована титановыми пинами (2 шт). " : "";
		const membraneText = membrane !== "Без мембраны" ? `Уложена барьерная мембрана ${membrane}. ${pinsText}` : "";
		return (
			`Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез в боковом отделе верхней челюсти в ${toothStr}, скелетирование передне-боковой стенки верхнечелюстного синуса. Формирование латерального окна пьезотомом. Аккуратная элевация мембраны Шнайдера без перфорации. Субантральное пространство заполнено остеопластическим материалом: ${graft}. ${membraneText}Послойное ушивание раны шовным материалом ${suture} без натяжения. Гемостаз полный. Рекомендации даны (сосудосуживающие капли в нос 5 дней, не чихать с закрытым ртом, антибиотикотерапия).`
		);
	}, [effectiveTooth, isClosedSinus]);

	const handleGraftSelect = useCallback((graft: string) => {
		setSelectedGraft(graft);
		const text = buildGbrProtocolText(graft, selectedMembrane, hasPins, sutureMaterial);
		onApplyProtocolText(text);
	}, [buildGbrProtocolText, hasPins, onApplyProtocolText, selectedMembrane, sutureMaterial]);

	const handleMembraneSelect = useCallback((membrane: string) => {
		setSelectedMembrane(membrane);
		const text = buildGbrProtocolText(selectedGraft, membrane, hasPins, sutureMaterial);
		onApplyProtocolText(text);
	}, [buildGbrProtocolText, hasPins, onApplyProtocolText, selectedGraft, sutureMaterial]);

	const togglePins = useCallback(() => {
		const nextPins = !hasPins;
		setHasPins(nextPins);
		const text = buildGbrProtocolText(selectedGraft, selectedMembrane, nextPins, sutureMaterial);
		onApplyProtocolText(text);
	}, [buildGbrProtocolText, hasPins, onApplyProtocolText, selectedGraft, selectedMembrane, sutureMaterial]);

	const handleAddServicesToInvoice = useCallback(() => {
		const services = getSinusGbrSurgicalServices({
			isClosedSinus, toothFdi: effectiveTooth, membrane: selectedMembrane, hasPins,
		});
		dispatchSurgicalServicesToInvoice({ toothFdi: effectiveTooth, customServices: services, onAddToInvoice });
		const totalRub = services.reduce((acc, s) => acc + (s.priceRub || 0) * (s.quantity || 1), 0);
		showToast(`Услуги костной пластики (#${effectiveTooth}) на сумму ${totalRub.toLocaleString("ru-RU")} ₽ начислены в смету`, "success");
	}, [effectiveTooth, hasPins, isClosedSinus, onAddToInvoice, selectedMembrane]);

	const handleApplyUncomplicatedGbrNorm = useCallback(() => {
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

		const services = getSinusGbrSurgicalServices({
			isClosedSinus, toothFdi: effectiveTooth, membrane, hasPins: pins,
		});
		dispatchSurgicalServicesToInvoice({ toothFdi: effectiveTooth, customServices: services, onAddToInvoice });
		showToast("✓ Физиологическая норма: Субантральная аугментация выполнена, мембрана Шнайдера интактна, гемостаз полный", "success");
	}, [buildGbrProtocolText, effectiveTooth, isClosedSinus, onAddToInvoice, onApplyProtocolText]);

	return {
		selectedGraft, selectedMembrane, hasPins, sutureMaterial, isMobileSheetOpen, isMobile,
		setIsMobileSheetOpen, handleGraftSelect, handleMembraneSelect, togglePins,
		handleAddServicesToInvoice, handleApplyUncomplicatedGbrNorm,
	};
}
