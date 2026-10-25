import { showToast } from "../../GlobalToast";
import { ANTERIOR_TEETH } from "../orthoProtocolTypes";
import { FULL_DENTITION, type WireActivationPresetActions } from "./useWireActivationPresets";

export function useBondingPresets(actions: WireActivationPresetActions) {
	const handlePresetBonding = () => {
		actions.setActivePreset("bonding");
		actions.setTargetArch("upper");
		actions.setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("damon_q2");
		actions.setArchwireMaterial("NiTi");
		actions.setArchwireSection(".014");
		actions.setSelectedActions(["wire_change"]);
		actions.setElasticScheme("none");
		actions.setNotes(
			"Первичная прямая фиксация несъемной вестибулярной брекет-системы на верхнюю челюсть (сегменты 17-27). Протравливание эмали 37% ортофосфорной кислотой (30 сек), тщательное смывание, высушивание. Нанесение праймера, позиционирование брекетов по индивидуальной высоте, фотополимеризация. Введена первичная нивелирующая дуга NiTi .014\". Концы дуг отожжены и подогнуты. Проведен подробный инструктаж по уходу за брекетами и гигиене полости рта, выдан защитный воск.",
		);
		showToast("Пресет: Фиксация брекет-системы (ВЧ) применен", "info");
	};

	const handlePresetDebonding = () => {
		actions.setActivePreset("debonding");
		actions.setTargetArch("both");
		actions.setSelectedTeeth(ANTERIOR_TEETH);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("damon_q2");
		actions.setSelectedActions(["debonding"]);
		actions.setElasticScheme("none");
		actions.setNotes(
			"Окончание активного периода ортодонтического лечения. Атравматичное снятие брекет-системы специальными щипцами. Механическое удаление остатков композита твердосплавными финирами без повреждения эмали, полировка вестибулярных поверхностей. Фиксация несъемного проволочного ретейнера (флекс-дуга 0.0175\") на текучий композит в сегментах 13-23 и 33-43. Сняты оттиски/сканы для изготовления ретенционных капп. Окклюзия стабильна.",
		);
		showToast("Пресет: Снятие брекетов + ретейнер применен", "info");
	};

	const handlePresetBondingBothMbt = () => {
		actions.setActivePreset("bonding_both_mbt");
		actions.setTargetArch("both");
		actions.setSelectedTeeth(FULL_DENTITION);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("empower");
		actions.setArchwireMaterial("NiTi");
		actions.setArchwireSection(".014");
		actions.setSelectedActions(["bonding_both_mbt"]);
		actions.setElasticScheme("none");
		actions.setNotes(
			"Первичная прямая фиксация вестибулярной брекет-системы верх/низ Roth/MBT .022\" на обе челюсти (17-27, 47-37). Кислотное протравливание эмали 37% H3PO4 (30 сек), тщательное промывание, высушивание. Адгезивный протокол, позиционирование брекетов по высоте с фотополимеризацией. Установлены первичные нивелирующие дуги NiTi .014\" ВЧ/НЧ. Выдан защитный воск, пациент проинструктирован.",
		);
		showToast("Пресет: Фиксация брекет-системы верх/низ Roth/MBT .022 применен", "success");
	};

	return {
		handlePresetBonding,
		handlePresetDebonding,
		handlePresetBondingBothMbt,
	};
}
