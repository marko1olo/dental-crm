import type { Tooth46LayerFlags } from "./tooth46Types";

export const LAYER_ITEMS: readonly [keyof Tooth46LayerFlags, string][] = [
	["crown", "Коронка"],
	["cusps", "5 бугров"],
	["fissures", "Фиссуры Y-5"],
	["roots", "Корни"],
	["grooves", "Борозда"],
	["cej", "Шейка CEJ"],
	["canals", "3 канала"],
	["guttaPercha", "Гуттаперча"],
	["pulp", "Пульпа"],
	["periapicalHalo", "Гранулема"],
	["caries", "Биокариес"],
	["composite", "Пломба"],
	["zirconiaCrown", "Коронка (протез)"],
	["abfraction", "Клин. дефект"],
	["postCore", "Штифт/Культя"],
	["calculus", "Камень"],
	["crack", "Трещина"],
	["implant", "Имплант"],
	["missing", "Удален (Х)"],
];
