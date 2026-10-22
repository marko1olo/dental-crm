import { MessageSquare } from "lucide-react";
import type React from "react";
import { StaffChatMessageItem } from "./StaffChatMessageItem";
import type { StaffChatThreadProps } from "./types";

export const StaffChatThread: React.FC<StaffChatThreadProps> = ({
	messages,
	onOpenPatientCard,
	onIntercomAck,
	messagesEndRef,
}) => {
	return (
		<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
			{messages.length === 0 ? (
				<div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
					<MessageSquare size={40} className="opacity-30 mb-2" />
					<p className="text-sm font-semibold">Сообщений пока нет</p>
					<p className="text-xs max-w-xs mt-1">
						Напишите коллеге или отправьте быстрый вызов через кнопки интеркома выше.
					</p>
				</div>
			) : (
				messages.map((m) => (
					<StaffChatMessageItem
						key={m.id}
						message={m}
						onOpenPatientCard={onOpenPatientCard}
						onIntercomAck={onIntercomAck}
					/>
				))
			)}
			<div ref={messagesEndRef} />
		</div>
	);
};
