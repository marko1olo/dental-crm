import React, { useEffect, useRef } from "react";
import type { OmnichannelMessage } from "../types";
import { OmnichannelMessageBubble } from "./OmnichannelMessageBubble";

export interface OmnichannelMessageStreamProps {
	messages: OmnichannelMessage[];
	isLoading?: boolean | undefined;
}

export function OmnichannelMessageStream({ messages, isLoading = false }: OmnichannelMessageStreamProps): React.JSX.Element {
	// Прокрутка строго внутри своей панели: scrollIntoView тянет за собой
	// ВСЕ прокручиваемые предки вплоть до окна, из-за чего страница уезжала
	// вниз (срезанная шапка на ПК и дыра под чатом на мобильном).
	const scrollRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length, isLoading]);

	return (
		<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[var(--paper-soft)]">
			{isLoading ? (
				<div className="p-8 text-center text-xs text-[var(--muted)]">
					Загрузка истории переписки...
				</div>
			) : messages.length === 0 ? (
				<div className="p-8 text-center text-xs text-[var(--muted)]">
					В этом диалоге пока нет сообщений
				</div>
			) : (
				messages.map((msg) => (
					<OmnichannelMessageBubble key={msg.id} message={msg} />
				))
			)}
		</div>
	);
}
