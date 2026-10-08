import { dentalTermPattern } from "./dentalSpeechNumbersSchemas.js";

export const dentalSpeechReplacementMap: Array<[RegExp, string, string]> = [
	[
		/(?<![0-9A-Za-zА-Яа-яЁё])((?:зуб(?:а|е|ом)?|област(?:ь|и)|fdi)\s+)([1-4])\s*[.,]\s*([1-8])(?![0-9A-Za-zА-Яа-яЁё])/gi,
		"$1$2$3",
		"номер зуба FDI",
	],
	[
		/(?<![0-9A-Za-zА-Яа-яЁё])([1-4])\s*[.,]\s*([1-8])(\s+(?:зуб|зуба|зубе|зубом))(?![0-9A-Za-zА-Яа-яЁё])/gi,
		"$1$2$3",
		"номер зуба FDI",
	],
	[dentalTermPattern(String.raw`к\s*л\s*к\s*т`), "КЛКТ", "КЛКТ"],
	[dentalTermPattern(String.raw`клкт`), "КЛКТ", "КЛКТ"],
	[
		dentalTermPattern(
			String.raw`конусно[-\s]*лучев(?:ая|ой|ую)\s+компьютерн(?:ая|ой|ую)\s+томограф(?:ия|ию)`,
		),
		"КЛКТ",
		"КЛКТ",
	],
	[dentalTermPattern(String.raw`к\s*т`), "КТ", "КТ"],
	[dentalTermPattern(String.raw`кт`), "КТ", "КТ"],
	[dentalTermPattern(String.raw`о\s*п\s*т\s*г`), "ОПТГ", "ОПТГ"],
	[dentalTermPattern(String.raw`оптг`), "ОПТГ", "ОПТГ"],
	[dentalTermPattern(String.raw`р\s*в\s*г|эр\s*вэ\s*гэ|рвг`), "RVG", "RVG"],
	[dentalTermPattern(String.raw`э\s*о\s*д|е\s*о\s*д|эод|еод`), "ЭОД", "ЭОД"],
	[dentalTermPattern(String.raw`д\s*с|ди\s*эс|ds|d\/s`), "DS", "DS"],
	[dentalTermPattern(String.raw`д\s*икс|ди\s*икс|dx`), "Dx", "Dx"],
	[
		dentalTermPattern(
			String.raw`м\s*к\s*б(?:\s*[-–]?\s*10)?|эм\s*ка\s*бэ(?:\s*[-–]?\s*10)?`,
		),
		"МКБ-10",
		"МКБ-10",
	],
	[
		dentalTermPattern(
			String.raw`(?:k|к|ка)\s*0\s*2\s*(?:[.,]|точк(?:а|и)?)\s*1`,
		),
		"K02.1",
		"K02.1",
	],
	[
		dentalTermPattern(
			String.raw`(?:k|к|ка)\s*0\s*4\s*(?:[.,]|точк(?:а|и)?)\s*0`,
		),
		"K04.0",
		"K04.0",
	],
	[
		dentalTermPattern(
			String.raw`(?:k|к|ка)\s*0\s*4\s*(?:[.,]|точк(?:а|и)?)\s*5`,
		),
		"K04.5",
		"K04.5",
	],
	[dentalTermPattern(String.raw`си\s*би\s*си\s*ти|cbct`), "CBCT", "CBCT"],
	[
		dentalTermPattern(
			String.raw`(?:кофердам|кофедам|кофирдам|коффердамм)(?:ом|а|е)?`,
		),
		"коффердам",
		"коффердам",
	],
	[
		dentalTermPattern(String.raw`раббер\s*дам(?:ом|а|е)?`),
		"коффердам",
		"коффердам",
	],
	[
		dentalTermPattern(String.raw`раббердам(?:ом|а|е)?`),
		"коффердам",
		"коффердам",
	],
	[
		dentalTermPattern(String.raw`эйр\s*флоу|айр\s*флоу|air\s*flow|airflow`),
		"Air Flow",
		"Air Flow",
	],
	[
		dentalTermPattern(String.raw`(?:пульпид|пульпед)(?:а|ом|е)?`),
		"пульпит",
		"пульпит",
	],
	[
		dentalTermPattern(String.raw`(?:периодантит|переодонтит)(?:а|ом|е)?`),
		"периодонтит",
		"периодонтит",
	],
	[
		dentalTermPattern(String.raw`(?:пародантит|парадонтит)(?:а|ом|е)?`),
		"пародонтит",
		"пародонтит",
	],
	[
		dentalTermPattern(String.raw`кариес\s+дентина|кариес\s+дентин`),
		"кариес дентина",
		"кариес дентина",
	],
	[
		dentalTermPattern(
			String.raw`кариозн(?:ая|ой|ую)\s+поласть|кариозн(?:ая|ой|ую)\s+полас[тд]ь`,
		),
		"кариозная полость",
		"кариозная полость",
	],
	[
		dentalTermPattern(String.raw`зандирован(?:ие|ия)|зондированее`),
		"зондирование",
		"зондирование",
	],
	[dentalTermPattern(String.raw`перкусия`), "перкуссия", "перкуссия"],
	[
		dentalTermPattern(String.raw`палпац(?:ия|ии)|пальпацыя`),
		"пальпация",
		"пальпация",
	],
	[
		dentalTermPattern(String.raw`адгизивн(?:ый|ого|ом|ая|ую)`),
		"адгезивный",
		"адгезивный",
	],
	[
		dentalTermPattern(String.raw`рестоврац(?:ия|ии|ию)`),
		"реставрация",
		"реставрация",
	],
	[dentalTermPattern(String.raw`пламб(?:а|ы|у|ой|е)?`), "пломба", "пломба"],
	[dentalTermPattern(String.raw`матриц(?:а|ы|у|ей|е)?`), "матрица", "матрица"],
	[dentalTermPattern(String.raw`клин(?:а|ом|е)?`), "клин", "клин"],
	[
		dentalTermPattern(
			String.raw`финиров(?:ание|ания)|финишн(?:ая|ой|ую)\s+обработк(?:а|и|у)`,
		),
		"финирование",
		"финирование",
	],
	[
		dentalTermPattern(String.raw`полеровк(?:а|и|у)|полировк(?:а|и|у)`),
		"полировка",
		"полировка",
	],
	[
		dentalTermPattern(
			String.raw`холодов(?:ая|ой|ую)\s+проб(?:а|ы|у)|термо\s*проб(?:а|ы|у)|термопроб(?:а|ы|у)`,
		),
		"холодовая проба",
		"холодовая проба",
	],
	[
		dentalTermPattern(
			String.raw`визиограф(?:ия|ии|ию)|прицельн(?:ый|ого|ом|ая|ую)\s+сним(?:ок|ка)`,
		),
		"прицельный снимок",
		"прицельный снимок",
	],
	[dentalTermPattern(String.raw`и\s*р\s*о\s*п\s*з|иропз`), "ИРОПЗ", "ИРОПЗ"],
	[dentalTermPattern(String.raw`к\s*п\s*у|кпу`), "КПУ", "КПУ"],
	[dentalTermPattern(String.raw`с\s*и\s*ц|сиц`), "СИЦ", "СИЦ"],
	[dentalTermPattern(String.raw`м\s*т\s*а|mta`), "MTA", "MTA"],
	[
		dentalTermPattern(String.raw`стекло\s*иономерн(ый|ого|ом|ая|ую)?`),
		"стеклоиономерн$1",
		"стеклоиономерный цемент",
	],
	[
		dentalTermPattern(String.raw`фесур(?:а|ы|у|ой)?|фиссур(?:а|ы|у|ой)?`),
		"фиссура",
		"фиссура",
	],
	[
		dentalTermPattern(
			String.raw`гермитизац(?:ия|ии|ию)|герметизац(?:ия|ии|ию)`,
		),
		"герметизация",
		"герметизация",
	],
	[
		dentalTermPattern(String.raw`мастер\s*штифт(?:а|ом|е)?`),
		"мастер-штифт",
		"мастер-штифт",
	],
	[dentalTermPattern(String.raw`м\s*о\s*д|эм\s*о\s*дэ|мод`), "МОД", "МОД"],
	[dentalTermPattern(String.raw`м\s*о|эм\s*о`), "МО", "МО"],
	[dentalTermPattern(String.raw`о\s*д|о\s*дэ`), "ОД", "ОД"],
	[
		dentalTermPattern(
			String.raw`мезиальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+окклюзионн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+дистальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`,
		),
		"МОД",
		"МОД",
	],
	[
		dentalTermPattern(
			String.raw`мезиальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+окклюзионн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`,
		),
		"МО",
		"МО",
	],
	[
		dentalTermPattern(
			String.raw`дистальн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?\s+окклюзионн(?:ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`,
		),
		"ОД",
		"ОД",
	],
	[
		dentalTermPattern(
			String.raw`перв(?:ого|ый|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`,
		),
		"I класс по Блэку",
		"класс по Блэку",
	],
	[
		dentalTermPattern(
			String.raw`втор(?:ого|ой|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`,
		),
		"II класс по Блэку",
		"класс по Блэку",
	],
	[
		dentalTermPattern(
			String.raw`треть(?:его|ий|ем)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`,
		),
		"III класс по Блэку",
		"класс по Блэку",
	],
	[
		dentalTermPattern(
			String.raw`четверт(?:ого|ый|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`,
		),
		"IV класс по Блэку",
		"класс по Блэку",
	],
	[
		dentalTermPattern(
			String.raw`пят(?:ого|ый|ом)\s+класс(?:а|у|ом)?\s+по\s+бл[эе]к(?:у|а)?`,
		),
		"V класс по Блэку",
		"класс по Блэку",
	],
	[
		dentalTermPattern(String.raw`оклюзионн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`),
		"окклюзионн$1",
		"окклюзионная поверхность",
	],
	[
		dentalTermPattern(String.raw`медиальн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`),
		"мезиальн$1",
		"мезиальная поверхность",
	],
	[
		dentalTermPattern(
			String.raw`апрокс\s*имальн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?|апроксималн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`,
		),
		"апроксимальн$1$2",
		"апроксимальная поверхность",
	],
	[
		dentalTermPattern(
			String.raw`контактн(?:ый|ого|ом|ая|ую|ой)?\s+пун[кт](?:а|ом|е)?`,
		),
		"контактный пункт",
		"контактный пункт",
	],
	[
		dentalTermPattern(
			String.raw`при\s+шеечн(ая|ой|ую|ые|ых|ым|ыми|ый|ого|ом)?`,
		),
		"пришеечн$1",
		"пришеечная область",
	],
	[
		dentalTermPattern(String.raw`апек\s*локатор`),
		"апекслокатор",
		"апекслокатор",
	],
	[
		dentalTermPattern(String.raw`рабоч(?:ая|ей|ую)\s+длин(?:а|ы|у)`),
		"рабочая длина",
		"рабочая длина",
	],
	[
		dentalTermPattern(String.raw`гут[ао]\s*перч(?:а|и|у|ей)?`),
		"гуттаперча",
		"гуттаперча",
	],
	[dentalTermPattern(String.raw`силлер(?:а|ом|е)?`), "силер", "силер"],
	[
		dentalTermPattern(String.raw`времен(?:ная|ной|ную)\s+пломб(?:а|ы|у|ой)?`),
		"временная пломба",
		"временная пломба",
	],
	[
		dentalTermPattern(String.raw`статус\s+пр[еэ]з[еэ]нс|status\s+praesens`),
		"status praesens",
		"status praesens",
	],
	[
		dentalTermPattern(String.raw`статус\s+локалис|status\s+localis`),
		"status localis",
		"status localis",
	],
	[
		dentalTermPattern(String.raw`ирригац(?:ия|ии|ию)|иригац(?:ия|ии|ию)`),
		"ирригация",
		"ирригация",
	],
	[
		dentalTermPattern(
			String.raw`пломбиров(?:ание|ания)|пламбиров(?:ание|ания)`,
		),
		"пломбирование",
		"пломбирование",
	],
	[
		dentalTermPattern(String.raw`шлифовк(?:а|и|у|ой)|пришлифовк(?:а|и|у|ой)`),
		"шлифовка",
		"шлифовка",
	],
	[
		dentalTermPattern(
			String.raw`коррекц(?:ия|ии|ию)\s+окклюз(?:ии|ия|ию)|корекц(?:ия|ии|ию)\s+оклюз(?:ии|ия|ию)`,
		),
		"коррекция окклюзии",
		"коррекция окклюзии",
	],
	[
		dentalTermPattern(
			String.raw`артикуляционн(?:ая|ой|ую)\s+бумаг(?:а|и|у|ой)`,
		),
		"артикуляционная бумага",
		"артикуляционная бумага",
	],
	[dentalTermPattern(String.raw`карпул(?:а|ы|у|ой|е)?`), "карпула", "карпула"],
	[
		dentalTermPattern(
			String.raw`переапикальн(?:ый|ого|ом)?|периапекальн(?:ый|ого|ом)?`,
		),
		"периапикальный",
		"периапикальный",
	],
	[
		dentalTermPattern(String.raw`обьективно|объективна`),
		"объективно",
		"объективно",
	],
	[
		dentalTermPattern(String.raw`анастезия|анистезия|анестезея`),
		"анестезия",
		"анестезия",
	],
	[
		dentalTermPattern(
			String.raw`инфильтрационн(?:ая|ой|ую)|инфилтрационн(?:ая|ой|ую)`,
		),
		"инфильтрационная",
		"инфильтрационная анестезия",
	],
	[
		dentalTermPattern(String.raw`проводников(?:ая|ой|ую)`),
		"проводниковая",
		"проводниковая анестезия",
	],
	[
		dentalTermPattern(String.raw`ортопантомограмма|ортопантомограмму`),
		"ОПТГ",
		"ОПТГ",
	],
];

export const spokenToothOrdinalMap: Array<[RegExp, string]> = [
	[dentalTermPattern(String.raw`одиннадцат(?:ый|ого|ому|ым|ом)?`), "11"],
	[dentalTermPattern(String.raw`двенадцат(?:ый|ого|ому|ым|ом)?`), "12"],
	[dentalTermPattern(String.raw`тринадцат(?:ый|ого|ому|ым|ом)?`), "13"],
	[dentalTermPattern(String.raw`четырнадцат(?:ый|ого|ому|ым|ом)?`), "14"],
	[dentalTermPattern(String.raw`пятнадцат(?:ый|ого|ому|ым|ом)?`), "15"],
	[dentalTermPattern(String.raw`шестнадцат(?:ый|ого|ому|ым|ом)?`), "16"],
	[dentalTermPattern(String.raw`семнадцат(?:ый|ого|ому|ым|ом)?`), "17"],
	[dentalTermPattern(String.raw`восемнадцат(?:ый|ого|ому|ым|ом)?`), "18"],
	[dentalTermPattern(String.raw`двадцать\s+перв(?:ый|ого|ому|ым|ом)?`), "21"],
	[dentalTermPattern(String.raw`двадцать\s+втор(?:ой|ого|ому|ым|ом)?`), "22"],
	[
		dentalTermPattern(String.raw`двадцать\s+трет(?:ий|ьего|ьему|ьим|ьем)?`),
		"23",
	],
	[
		dentalTermPattern(String.raw`двадцать\s+четверт(?:ый|ого|ому|ым|ом)?`),
		"24",
	],
	[dentalTermPattern(String.raw`двадцать\s+пят(?:ый|ого|ому|ым|ом)?`), "25"],
	[dentalTermPattern(String.raw`двадцать\s+шест(?:ой|ого|ому|ым|ом)?`), "26"],
	[dentalTermPattern(String.raw`двадцать\s+седьм(?:ой|ого|ому|ым|ом)?`), "27"],
	[dentalTermPattern(String.raw`двадцать\s+восьм(?:ой|ого|ому|ым|ом)?`), "28"],
	[dentalTermPattern(String.raw`тридцать\s+перв(?:ый|ого|ому|ым|ом)?`), "31"],
	[dentalTermPattern(String.raw`тридцать\s+втор(?:ой|ого|ому|ым|ом)?`), "32"],
	[
		dentalTermPattern(String.raw`тридцать\s+трет(?:ий|ьего|ьему|ьим|ьем)?`),
		"33",
	],
	[
		dentalTermPattern(String.raw`тридцать\s+четверт(?:ый|ого|ому|ым|ом)?`),
		"34",
	],
	[dentalTermPattern(String.raw`тридцать\s+пят(?:ый|ого|ому|ым|ом)?`), "35"],
	[dentalTermPattern(String.raw`тридцать\s+шест(?:ой|ого|ому|ым|ом)?`), "36"],
	[dentalTermPattern(String.raw`тридцать\s+седьм(?:ой|ого|ому|ым|ом)?`), "37"],
	[dentalTermPattern(String.raw`тридцать\s+восьм(?:ой|ого|ому|ым|ом)?`), "38"],
	[dentalTermPattern(String.raw`сорок\s+перв(?:ый|ого|ому|ым|ом)?`), "41"],
	[dentalTermPattern(String.raw`сорок\s+втор(?:ой|ого|ому|ым|ом)?`), "42"],
	[dentalTermPattern(String.raw`сорок\s+трет(?:ий|ьего|ьему|ьим|ьем)?`), "43"],
	[dentalTermPattern(String.raw`сорок\s+четверт(?:ый|ого|ому|ым|ом)?`), "44"],
	[dentalTermPattern(String.raw`сорок\s+пят(?:ый|ого|ому|ым|ом)?`), "45"],
	[dentalTermPattern(String.raw`сорок\s+шест(?:ой|ого|ому|ым|ом)?`), "46"],
	[dentalTermPattern(String.raw`сорок\s+седьм(?:ой|ого|ому|ым|ом)?`), "47"],
	[dentalTermPattern(String.raw`сорок\s+восьм(?:ой|ого|ому|ым|ом)?`), "48"],
];
