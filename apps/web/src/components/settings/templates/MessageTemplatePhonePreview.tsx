import { interpolateTemplateText, type MessageTemplate } from "@dental/shared";
import { Battery, CheckCheck, Smartphone } from "lucide-react";
import React from "react";
import { CHANNEL_BADGES } from "./templateConstants";

interface Props {
	template?: MessageTemplate;
}

export const MessageTemplatePhonePreview: React.FC<Props> = ({ template }) => {
	if (!template) {
		return (
			<div className="p-8 text-center text-xs text-[var(--muted)] border border-[var(--line)] rounded-2xl bg-[var(--paper-soft)]">
				Выберите шаблон для предпросмотра
			</div>
		);
	}

	const badge = CHANNEL_BADGES[template.channel];
	const sampleData = {
		patient_name: "Анна Сергеевна",
		doctor_name: "Д-р Воронов А.В.",
		appointment_date: "завтра",
		appointment_time: "14:30",
		clinic_name: "Клиника ДЕНТЕ",
		clinic_phone: "+7 (495) 123-45-67",
		payment_link: "https://sbp.nspk.ru/pay/dente",
		debt_amount: "4 500 ₽",
	};
	const previewText = interpolateTemplateText(template.templateText, sampleData);

	return (
		<div className="phone-mockup-wrapper flex justify-center py-2">
			<div className="phone-body w-[310px] rounded-[36px] p-3 border-4 border-slate-700 bg-slate-900 shadow-2xl flex flex-col min-h-[460px]">
				<div className="phone-notch-bar flex justify-between items-center px-4 py-1 text-[11px] text-slate-400">
					<span>09:41</span>
					<div className="w-16 h-4 bg-slate-800 rounded-full" />
					<Battery size={14} />
				</div>

				<div className={`phone-app-header flex items-center justify-between p-2.5 rounded-t-2xl ${badge.headerClass}`}>
					<span className="text-xs font-semibold text-white">{badge.label}</span>
					<span className="text-[10px] text-white/80">Онлайн</span>
				</div>

				<div className="flex-1 p-3 bg-slate-950/80 rounded-b-2xl overflow-y-auto space-y-2">
					<div className="flex justify-start">
						<div className={`max-w-[85%] p-3 rounded-2xl text-xs text-white shadow-sm leading-relaxed ${badge.bubbleClass}`}>
							<p className="m-0 whitespace-pre-wrap">{previewText}</p>
							<div className="flex justify-end items-center gap-1 mt-1 text-[10px] text-white/70">
								<span>14:30</span>
								<CheckCheck size={12} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
