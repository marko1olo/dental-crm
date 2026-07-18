import React, { useState } from "react";

export function VoiceAssistantTutorial({ onClose }: { onClose: () => void }) {
	const [activeTab, setActiveTab] = useState<"nav" | "search" | "visit">("nav");

	return (
		<div className="mb-2 bg-neutral-950/95 backdrop-blur-lg border border-neutral-800 text-neutral-200 p-5 rounded-2xl shadow-2xl w-80 md:w-96 pointer-events-auto transition-all animate-fade-in-up max-h-[70vh] overflow-y-auto">
			<div className="flex justify-between items-center mb-4 border-b border-neutral-800 pb-3">
				<div className="flex items-center gap-2">
					<div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<h3 className="font-bold text-sm text-white">Голосовое управление</h3>
						<p className="text-[10px] text-neutral-500 m-0 uppercase tracking-wider">
							Интерактивное обучение
						</p>
					</div>
				</div>
				<button
					onClick={onClose}
					className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 hover:bg-neutral-800 rounded-lg"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div className="flex gap-1 bg-neutral-900 p-1 rounded-xl mb-4 text-xs">
				{(["nav", "search", "visit"] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
							activeTab === tab
								? "bg-indigo-600 text-white shadow"
								: "text-neutral-400 hover:text-neutral-200"
						}`}
					>
						{tab === "nav"
							? "Навигация"
							: tab === "search"
								? "Поиск и Даты"
								: "Диктовка ЭМК"}
					</button>
				))}
			</div>

			<div className="space-y-3.5 text-xs leading-relaxed">
				{activeTab === "nav" && (
					<>
						<p className="text-neutral-400">
							Скажите команду для быстрого перехода между разделами клиники:
						</p>
						<div className="space-y-2">
							{[
								{ cmd: "«Перейди в расписание»", desc: "Открывает календарь записей" },
								{ cmd: "«Открой пациентов»", desc: "Переходит в список пациентов клиники" },
								{ cmd: "«Перейди в кассу»", desc: "Раздел финансов и оплат" },
								{ cmd: "«Открой настройки»", desc: "Управление клиникой и услугами" },
								{ cmd: "«Покажи маркетинг»", desc: "Аналитика каналов привлечения" },
								{ cmd: "«Открой документы»", desc: "Анализатор документов и согласий" },
							].map((item, idx) => (
								<div key={idx} className="bg-neutral-900/50 border border-neutral-850 p-2.5 rounded-xl hover:border-neutral-705 transition-colors">
									<div className="font-semibold text-indigo-400 mb-0.5">{item.cmd}</div>
									<div className="text-neutral-400 text-[11px]">{item.desc}</div>
								</div>
							))}
						</div>
					</>
				)}

				{activeTab === "search" && (
					<>
						<p className="text-neutral-400">
							Используйте для поиска пациентов или смены даты в календаре:
						</p>
						<div className="space-y-2">
							{[
								{ cmd: "«Найди пациента Смирнов»", desc: "Ищет карту пациента по фамилии или имени" },
								{ cmd: "«Поиск Петров»", desc: "Быстрый глобальный поиск по базе" },
								{ cmd: "«Покажи расписание на завтра»", desc: "Фильтрует календарь на следующий день" },
								{ cmd: "«Перейди на сегодня»", desc: "Возвращает календарную сетку на текущую дату" },
								{ cmd: "«Покажи расписание на вчера»", desc: "Переключает дату календаря на день назад" },
							].map((item, idx) => (
								<div key={idx} className="bg-neutral-900/50 border border-neutral-850 p-2.5 rounded-xl hover:border-neutral-705 transition-colors">
									<div className="font-semibold text-indigo-400 mb-0.5">{item.cmd}</div>
									<div className="text-neutral-400 text-[11px]">{item.desc}</div>
								</div>
							))}
						</div>
					</>
				)}

				{activeTab === "visit" && (
					<>
						<p className="text-neutral-400">
							Для заполнения карты приема диктуйте жалобы, объективный статус или диагнозы:
						</p>
						<div className="space-y-2">
							{[
								{ cmd: "«Жалобы на острую боль в 45 зубе»", desc: "Автоматически заполнит поле жалоб пациента" },
								{ cmd: "«Объективно глубокий кариес сорок шестого зуба»", desc: "Заполнит объективный статус" },
								{ cmd: "«Диагноз хронический пульпит»", desc: "Установит клинический диагноз визита" },
								{ cmd: "«Лечение проведено препарирование и пломбирование»", desc: "Добавит описание выполненных работ" },
								{ cmd: "«Зуб 36 кариес дентина»", desc: "Отметит состояние на интерактивной зубной карте" },
							].map((item, idx) => (
								<div key={idx} className="bg-neutral-900/50 border border-neutral-850 p-2.5 rounded-xl hover:border-neutral-705 transition-colors">
									<div className="font-semibold text-indigo-400 mb-0.5">{item.cmd}</div>
									<div className="text-neutral-400 text-[11px]">{item.desc}</div>
								</div>
							))}
						</div>
						<div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-amber-300 text-[11px]">
							<strong>Совет:</strong> Убедитесь, что открыта вкладка приёма (ЭМК), чтобы текст диктовки автоматически распределился по медицинским полям.
						</div>
					</>
				)}
			</div>
		</div>
	);
}
