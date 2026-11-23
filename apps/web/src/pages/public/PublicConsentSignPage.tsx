/**
 * apps/web/src/pages/public/PublicConsentSignPage.tsx
 *
 * Публичный шлюз дистанционного подписания согласия пациентом (ИДС 1051н).
 * Открывается пациентом по QR-коду со смартфона или персональной ссылке из мессенджера.
 * Мандаты 8e (Автономия врача), 8n (Суверенитет масштаба), 8al (Apple HIG, тач >= 44px).
 */

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileSignature, ShieldCheck } from "lucide-react";
import { sha256Hex } from "@dental/shared";
import { PublicBudgetSignaturePad } from "./PublicBudgetSignaturePad";

export interface PublicConsentSignPageProps {
	token?: string | undefined;
	patientId?: string | undefined;
	consentKind?: string | undefined;
}

interface ConsentShareInfo {
	valid: boolean;
	patientName: string;
	clinicName: string;
	title: string;
	kind: string;
	patientId: string;
	visitId?: string | null | undefined;
}

const CONSENT_LEGAL_TEXT =
	"В соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ» и Приказом Минздрава России от 12.11.2021 № 1051н настоящим подтверждаю, что мне в доступной форме разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, а также предполагаемые результаты лечения. Я подтверждаю, что сообщил(а) лечащему врачу все известные мне сведения о перенесенных заболеваниях, аллергических реакциях, принимаемых лекарственных препаратах и противопоказаниях. Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения.";

export const PublicConsentSignPage: React.FC<PublicConsentSignPageProps> = ({
	token: propToken,
}) => {
	const [token] = useState<string>(() => {
		if (propToken) return propToken;
		if (typeof window !== "undefined") {
			const s = new URLSearchParams(window.location.search);
			const h = window.location.hash;
			const hashQuery = h.includes("?") ? new URLSearchParams(h.slice(h.indexOf("?"))) : null;
			return s.get("token") || s.get("t") || hashQuery?.get("token") || hashQuery?.get("t") || "";
		}
		return "";
	});

	const [info, setInfo] = useState<ConsentShareInfo | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isSignedSuccess, setIsSignedSuccess] = useState<boolean>(false);

	const fetchInfo = useCallback(async (tok: string) => {
		if (!tok) {
			setIsLoading(false);
			setError("Ссылка для подписания не содержит токена или недействительна.");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch(`/api/public/consents/share-info?token=${encodeURIComponent(tok)}`);
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { message?: string };
				setError(data.message || "Срок действия ссылки истёк или ссылка недействительна.");
				setIsLoading(false);
				return;
			}
			const data = (await res.json()) as ConsentShareInfo;
			setInfo(data);
		} catch (err) {
			console.warn("[PublicConsentSignPage] Ошибка проверки ссылки:", err);
			setError("Не удалось связаться с сервером клиники. Пожалуйста, проверьте интернет-соединение.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchInfo(token);
	}, [token, fetchInfo]);

	const handleSign = useCallback(
		async ({ signaturePng, signerName }: { signaturePng: string; signerName: string }) => {
			if (!token) return;
			setIsSubmitting(true);
			setError(null);

			try {
				// DEF-DOM-Q-01 / 63-ФЗ: Вычисляем канонический SHA-256 хеш целостности снапшота документа
				const snapshotPayload = JSON.stringify({
					title: info?.title || "Информированное добровольное согласие",
					clinic: info?.clinicName || "Стоматологическая клиника",
					patient: info?.patientName || "Пациент",
					patientId: info?.patientId || "",
					statutoryText: CONSENT_LEGAL_TEXT,
					signer: (signerName || info?.patientName || "Пациент").trim(),
					token,
				});
				const integrityHash = sha256Hex(snapshotPayload);

				// Оборачиваем PNG подписи в валидный SVG-контейнер согласно 63-ФЗ
				const signatureSvg = signaturePng.startsWith("<svg")
					? signaturePng
					: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 155" width="360" height="155"><image href="${signaturePng}" width="360" height="155"/></svg>`;

				const res = await fetch("/api/public/consents/sign", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": crypto.randomUUID(),
					},
					body: JSON.stringify({
						token,
						signatureSvg,
						integrityHash,
						signatureType: "tablet_stylus",
						notes: `Дистанционная цифровая подпись (${signerName || info?.patientName || "Пациент"})`,
					}),
				});

				if (!res.ok) {
					const data = (await res.json().catch(() => ({}))) as { message?: string };
					setError(data.message || "Не удалось сохранить подпись. Попробуйте повторить.");
					return;
				}

				setIsSignedSuccess(true);
			} catch (err) {
				console.warn("[PublicConsentSignPage] Ошибка отправки подписи:", err);
				setError("Ошибка сети при отправке подписи. Пожалуйста, повторите.");
			} finally {
				setIsSubmitting(false);
			}
		},
		[token, info],
	);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center p-4">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-3 border-[var(--primary,#0d9488)] border-t-transparent rounded-full animate-spin" />
					<p className="text-sm text-[var(--ink-muted,#64748b)]">Загрузка бланка согласия...</p>
				</div>
			</div>
		);
	}

	if (isSignedSuccess) {
		return (
			<div className="min-h-screen bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-[var(--paper,#ffffff)] rounded-2xl shadow-lg border border-[var(--line,#e2e8f0)] p-6 text-center space-y-4">
					<div className="w-16 h-16 bg-[var(--success-soft,#dcfce7)] text-[var(--success,#16a34a)] rounded-full flex items-center justify-center mx-auto">
						<CheckCircle2 className="w-9 h-9" />
					</div>
					<h1 className="text-xl font-semibold text-[var(--ink,#0f172a)]">
						Согласие успешно подписано
					</h1>
					<p className="text-sm text-[var(--ink-muted,#64748b)] leading-relaxed">
						Электронная подпись зарегистрирована. Документ сохранён в медицинской карте и доступен лечащему врачу клиники.
					</p>
					<div className="pt-2 text-xs text-[var(--ink-muted,#94a3b8)]">
						{info?.clinicName || "Стоматологическая клиника DENTE"}
					</div>
				</div>
			</div>
		);
	}

	if (error && !info) {
		return (
			<div className="min-h-screen bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-[var(--paper,#ffffff)] rounded-2xl shadow-lg border border-[var(--line,#e2e8f0)] p-6 text-center space-y-4">
					<div className="w-14 h-14 bg-[var(--danger-soft,#fee2e2)] text-[var(--danger,#dc2626)] rounded-full flex items-center justify-center mx-auto">
						<AlertCircle className="w-8 h-8" />
					</div>
					<h1 className="text-lg font-semibold text-[var(--ink,#0f172a)]">
						Ссылка недействительна
					</h1>
					<p className="text-sm text-[var(--ink-muted,#64748b)] leading-relaxed">
						{error}
					</p>
					<p className="text-xs text-[var(--ink-muted,#94a3b8)]">
						Обратитесь к администратору клиники или лечащему врачу для получения актуальной ссылки.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] py-6 px-4 sm:px-6">
			<div className="max-w-lg mx-auto bg-[var(--paper,#ffffff)] rounded-2xl shadow-sm border border-[var(--line,#e2e8f0)] overflow-hidden">
				{/* Шапка клиники */}
				<div className="p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
					<div className="flex items-center gap-2 text-[var(--primary,#0d9488)] text-xs font-medium mb-1">
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span>{info?.clinicName || "Стоматологическая клиника"}</span>
					</div>
					<h1 className="text-lg font-semibold tracking-tight text-[var(--ink,#0f172a)]">
						{info?.title || "Информированное добровольное согласие"}
					</h1>
					<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1">
						Пациент: <span className="font-medium text-[var(--ink,#0f172a)]">{info?.patientName || "Пациент"}</span>
					</p>
				</div>

				{/* Текст согласия */}
				<div className="p-5 space-y-4 text-xs sm:text-sm text-[var(--ink,#334155)] leading-relaxed max-h-[35vh] overflow-y-auto border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]/50">
					<p>
						В соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ» и Приказом Минздрава России от 12.11.2021 № 1051н настоящим подтверждаю, что мне в доступной форме разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, а также предполагаемые результаты лечения.
					</p>
					<p>
						Я подтверждаю, что сообщил(а) лечащему врачу все известные мне сведения о перенесенных заболеваниях, аллергических реакциях, принимаемых лекарственных препаратах и противопоказаниях. Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения.
					</p>
				</div>

				{/* Ошибки */}
				{error && (
					<div className="mx-5 mt-4 p-3 rounded-xl bg-[var(--danger-soft,#fee2e2)] border border-[var(--danger,#dc2626)]/20 text-xs text-[var(--danger,#b91c1c)] flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						<span>{error}</span>
					</div>
				)}

				{/* Поле электронной подписи */}
				<div className="p-5">
					<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink,#0f172a)] mb-3">
						<FileSignature className="w-4 h-4 text-[var(--primary,#0d9488)]" />
						<span>Подпись пациента (пальцем или стилусом)</span>
					</div>
					<PublicBudgetSignaturePad
						defaultSignerName={info?.patientName || ""}
						isSubmitting={isSubmitting}
						error={error}
						onSign={handleSign}
						agreementText="С текстом информированного добровольного согласия ознакомлен(а), условия понятны, на медицинское вмешательство согласен(на)"
						submitButtonText="Подписать согласие"
					/>
				</div>
			</div>
		</div>
	);
};

export default PublicConsentSignPage;
