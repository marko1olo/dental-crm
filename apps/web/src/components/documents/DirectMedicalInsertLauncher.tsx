import React, { useState, useEffect } from "react";
import { FastClinicalPrintEngine } from "./FastClinicalPrintEngine";

export const DirectMedicalInsertLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("insert043u") ||
			s.includes("print-043u") ||
			s.includes("medical-insert") ||
			h.includes("insert043u") ||
			h.includes("print-043u") ||
			h.includes("medical-insert")
		);
	});

	useEffect(() => {
		const handleOpenEvent = () => setIsOpen(true);
		window.addEventListener("dente-open-medical-insert", handleOpenEvent);
		return () => window.removeEventListener("dente-open-medical-insert", handleOpenEvent);
	}, []);

	if (!isOpen) return null;

	return (
		<FastClinicalPrintEngine
			isOpen={isOpen}
			onClose={() => {
				setIsOpen(false);
				if (typeof window !== "undefined") {
					const url = new URL(window.location.href);
					url.searchParams.delete("insert043u");
					url.searchParams.delete("print-043u");
					url.searchParams.delete("medical-insert");
					window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("insert") ? url.hash : ""));
				}
			}}
			initialDocType="partisan_insert_043u"
			patient={{
				fullName: "Смирнов Алексей Викторович",
				birthDate: "24.08.1989",
				phone: "+7 (916) 123-45-67",
				address: "г. Москва, ул. Арбат, д. 10",
				cardNumber: "043/2026-99",
				allergies: "Аллергоанамнез не отягощен (отрицает; непереносимость анестетиков отрицает)",
				somaticNotes: "Соматический статус: компенсирован, сопутствующая патология без обострения",
			}}
			clinic={{
				name: "Стоматологическая клиника «DENTE»",
				legalName: 'ООО "ДЕНТЕ МЕДИКАЛ ГРУПП"',
				inn: "7704123456",
				ogrn: "1237700123456",
				address: "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
				phone: "+7 (495) 777-88-99",
				licenseNumber: "ЛО41-01137-77/00368421 от 14.02.2023 г.",
			}}
			doctor={{
				fullName: "Смирнова Елена Александровна",
				specialty: "Врач-стоматолог терапевт",
			}}
			visitData={{
				date: "11.10.2026",
				time: "14:30",
				toothNumber: "46",
				cavityLocalization: "Окклюзионно-медиальная (MOD / Класс II по Блэку)",
				diagnosis: "K02.1 Кариес дентина (хронический глубокий кариес)",
				complaints: "На кратковременные боли от термических раздражителей (холодное), попадание и застревание пищи в межзубном промежутке.",
				objective: "Прикус ортогнатический. Слизистая бледно-розовая, влажная. Зуб #46: на жевательно-медиальной поверхности глубокая кариозная полость с размягченным дентином. Зондирование болезненно по дну. Термопроба положительна (3–5 сек). Перкуссия безболезненна. ЭОД — 8 мкА.",
				treatment: "1. Анестезия: проводниковая (торусальная) Sol. Articaini 4% (1:100 000) — 1.7 мл. 2. Изоляция: коффердам (OptiDam, кламп W8A). 3. Препарирование: некрэктомия под водяным охлаждением до плотного дентина, фальц эмали. 4. Антисептика: 2% р-р хлоргексидина биглюконата. 5. Прокладка: лечебная Life (Ca(OH)2), изолирующая СИЦ Vitrebond. 6. Адгезив: травление эмали 37% H3PO4 15 с, OptiBond FL, свет 20 с. 7. Пломба: послойная реставрация нанокомпозитом Filtek Ultimate (A3B/A3E). 8. Финиш: коррекция по прикусу (копирка 40 мкм), шлифовка, полировка Sof-Lex и Prisma Gloss.",
				recommendations: "Воздержаться от приёма пищи 1.5–2 часа (до окончания действия анестезии). Ограничить красящие продукты на 24 часа. Контрольный осмотр через 6 месяцев.",
				warrantyPeriod: "12 месяцев (1 год) при соблюдении гигиены и контрольных осмотров",
			}}
		/>
	);
};
