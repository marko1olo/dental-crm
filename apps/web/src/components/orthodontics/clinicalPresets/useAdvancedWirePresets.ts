import { showToast } from "../../GlobalToast";
import { FULL_DENTITION, type WireActivationPresetActions } from "./useWireActivationPresets";

export function useAdvancedWirePresets(actions: WireActivationPresetActions) {
	const handlePresetNiti014Activation = () => {
		actions.setActivePreset("niti_014_activation");
		actions.setTargetArch("both");
		actions.setSelectedTeeth(FULL_DENTITION);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("damon_q2");
		actions.setArchwireMaterial("NiTi");
		actions.setArchwireSection(".014");
		actions.setSelectedActions(["niti_014_activation", "ligature_change"]);
		actions.setElasticScheme("none");
		actions.setNotes(
			"Плановый этап нивелирования: произведена активация и установка первичных эластичных никель-титановых дуг NiTi .014\" на верхней и нижней челюстях. Замки брекетов закрыты со щелчком. Эластические лигатуры обновлены. Концы дуг отожжены, подогнуты и зашлифованы. Травмирование слизистой исключено. Расходники списаны.",
		);
		showToast("Пресет: Активация дуги 0.14 NiTi применен", "success");
	};

	const handlePresetPowerChainChange = () => {
		actions.setActivePreset("power_chain_change");
		actions.setTargetArch("both");
		actions.setSelectedTeeth([
			16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26,
			46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36,
		]);
		actions.setArchwireMaterial("SS");
		actions.setArchwireSection(".019x.025");
		actions.setSelectedActions(["power_chain_change", "ligature_change"]);
		actions.setNotes(
			"Этап консолидации и закрытия промежутков: выполнена замена эластических цепочек (power chain) с коротким шагом на жестких стальных дугах SS .019x.025\". Произведен контроль торка фронтальных зубов и стабильности окклюзионных контактов. Натяжение равномерное, фиксация надежная.",
		);
		showToast("Пресет: Смена эластических цепочек (power chain) применен", "success");
	};

	const handlePresetRebracket = () => {
		actions.setActivePreset("rebracket");
		actions.setSelectedActions((prev) =>
			prev.includes("rebracket") ? prev : [...prev, "rebracket"],
		);
		actions.setNotes(
			"Жалоба на отклейку брекета во время еды. Объективно: отрыв брекета без повреждения эмали. Проведена ультразвуковая очистка эмали зуба от остатков адгезива, протравливание 37% ортофосфорной кислотой 20 сек, смывание, высушивание, нанесение праймера Transbond XT, позиционирование нового брекета, фотополимеризация 20 сек. Дуга установлена в паз, подвязана эластической лигатурой. Окклюзионных контактов с замком нет.",
		);
		showToast("Пресет: Повторная фиксация брекета применен (добавлена услуга в смету)", "success");
	};

	return {
		handlePresetNiti014Activation,
		handlePresetPowerChainChange,
		handlePresetRebracket,
	};
}
