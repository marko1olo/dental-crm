import React, { createContext, useContext, useEffect, useRef } from "react";
import type { useAppLogic } from "../useAppLogic";

// Define the shape of our global AppLogic context
// We expose the entire hook return value as the context type
export type AppLogicContextType = ReturnType<typeof useAppLogic>;

const AppLogicContext = createContext<AppLogicContextType | null>(null);

// Registry for tab teardown callbacks to avoid memory leaks across view switches
const tabTeardownCallbacks = new Set<() => void>();

export function registerTabTeardown(callback: () => void): () => void {
	tabTeardownCallbacks.add(callback);
	return () => {
		tabTeardownCallbacks.delete(callback);
	};
}

export function clearTabTeardownCallbacks(): void {
	tabTeardownCallbacks.clear();
}

export interface AppLogicProviderProps {
	children?: React.ReactNode;
	value: AppLogicContextType;
}

export function AppLogicProvider({
	children,
	value,
}: AppLogicProviderProps) {
	const currentView = (value as { currentView?: string })?.currentView;
	const prevViewRef = useRef<string | undefined>(currentView);

	// Memory leak guard: when switching tabs/views in the workspace, invoke and drain registered teardown callbacks
	useEffect(() => {
		if (prevViewRef.current !== undefined && prevViewRef.current !== currentView) {
			const callbacksToExecute = Array.from(tabTeardownCallbacks);
			tabTeardownCallbacks.clear();
			for (const callback of callbacksToExecute) {
				try {
					callback();
				} catch {
					// Safe teardown: one failing callback must not interrupt others
				}
			}
		}
		prevViewRef.current = currentView;
	}, [currentView]);

	// Clean up global teardown callback registry on provider unmount
	useEffect(() => {
		return () => {
			tabTeardownCallbacks.clear();
		};
	}, []);

	return (
		<AppLogicContext.Provider value={value}>
			{children}
		</AppLogicContext.Provider>
	);
}

/**
 * ОТСУТСТВИЕ ПРОВАЙДЕРА — ЯВНЫЙ ОТКАЗ, А НЕ ВЫДУМАННОЕ ЗНАЧЕНИЕ.
 *
 * БЫЛО: `return {} as AppLogicContextType`. Приведение обещало компилятору
 * полный объект контекста, а во время работы отдавало пустой: каждое поле —
 * `undefined`, каждая разобранная функция — `undefined`, и ни исключения, ни
 * предупреждения в консоли. Компонент, отрисованный выше провайдера, показывал
 * пустое место, и выглядело это как «данных пока нет», а не как поломка сборки
 * дерева. Поймать такое типами нельзя ПО ПОСТРОЕНИЮ приведения: `as` ровно для
 * того и стоял, чтобы компилятор перестал спрашивать.
 *
 * Цена уже платилась: провайдер стоял только вокруг ветки настроек, 59
 * потребителей рисовались выше него — карточка пациента, вкладки приёма,
 * одонтограмма, панели кассы — и всё это молча пустовало (разбор в App.tsx
 * у самого <AppLogicProvider>). Дерево починили, а подмену «неизвестно» на
 * значение оставили: следующая такая ошибка снова прошла бы незамеченной.
 *
 * ПОЧЕМУ ИСКЛЮЧЕНИЕ, А НЕ `null` И НЕ ЗНАЧЕНИЕ ПО УМОЛЧАНИЮ. Провайдера нет —
 * это дефект сборки дерева компонентов, а не состояние данных клиники. У него
 * нет разумного поведения «по умолчанию»: у пациента нет пустой истории, у кассы
 * нет нулевой смены — просто некому было передать данные. Видеть такое должен
 * разработчик на своём прогоне, а не регистратор на пустом экране. Ближайшая
 * граница ошибок (WorkspaceRouteErrorBoundary) покажет отказ в своём разделе и
 * не уронит остальное рабочее место.
 *
 * ЗАМЕРЕНО ПЕРЕД ПРАВКОЙ: потребителей вне провайдера в дереве НЕТ. Обе ветки
 * main.tsx проверены — публичный контур (GuestLabPortal, PublicBookingWidget,
 * GlobalToast) не дотягивается ни до одного потребителя, и всё, что App.tsx
 * рисует ДО провайдера (AuthHub, StaffPinPad, AppBootState) — тоже. Поэтому
 * бросок ничего живого не ломает.
 *
 * ТЕСТАМ ПОЛОЖЕН ПРОВАЙДЕР-ОБЁРТКА, А НЕ ПОБЛАЖКА ЗДЕСЬ. Тест, поднимающий
 * экран без провайдера, обязан сказать это вслух:
 * `<AppLogicProvider value={…}>` вокруг рендера. Охраняется
 * contexts/appLogicContextRefusesToInvent.test.tsx.
 */
export function useAppLogicContext(): AppLogicContextType {
	const context = useContext(AppLogicContext);
	if (!context) {
		throw new Error(
			"ОШИБКА: useAppLogicContext вызван вне AppLogicProvider. Убедитесь, что компонент обернут в AppLogicProvider, иначе данные будут недоступны.",
		);
	}
	return context;
}

export function useOptionalAppLogicContext(): AppLogicContextType | null {
	return useContext(AppLogicContext);
}

/**
 * Хук для безопасной подписки на изолированную часть глобальной логики.
 * Предотвращает лавинообразные ре-рендеры дерева при изменении соседних вкладок.
 */
export function useAppLogicSelector<T>(
	selector: (context: AppLogicContextType) => T,
	isEqual: (prev: T, next: T) => boolean = Object.is,
): T {
	const context = useAppLogicContext();
	const prevRef = useRef<T | undefined>(undefined);
	const nextVal = selector(context);

	if (prevRef.current !== undefined && isEqual(prevRef.current, nextVal)) {
		return prevRef.current;
	}
	prevRef.current = nextVal;
	return nextVal;
}

/**
 * Хук регистрации очистки ресурсов (ObjectURL, WebGL, таймеры) при уходе с вкладки/экрана.
 */
export function useTabTeardown(onTeardown: () => void): void {
	const callbackRef = useRef(onTeardown);
	callbackRef.current = onTeardown;

	useEffect(() => {
		return registerTabTeardown(() => {
			callbackRef.current();
		});
	}, []);
}
