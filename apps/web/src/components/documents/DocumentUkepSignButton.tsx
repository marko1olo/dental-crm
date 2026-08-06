import { AlertCircle, FileSignature, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	operatorReadableErrorDetailFromUnknown,
	responseErrorMessage,
} from "../../AppHelpers";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";
import { showToast } from "../GlobalToast";

/**
 * Подписание документа УКЭП (КриптоПро): отказ теперь виден и объяснён.
 *
 * ЧТО БЫЛО СЛОМАНО.
 *
 * 1. ОТКАЗ ХРАНИЛИЩА ПОКАЗЫВАЛСЯ КАК ПУСТОТА. Чтение личных сертификатов
 *    (getPersonalCertificates) падает, если не вставлен носитель, не запущен
 *    КриптоПро CSP или хранилище не открывается. Обработчик показывал всплывающую
 *    подсказку на четыре секунды и оставлял список пустым — а панель дальше
 *    навсегда писала «Личные сертификаты в хранилище не найдены». Это неправда:
 *    хранилище не прочитано, а не пусто. Повторить чтение было нечем, кроме
 *    перезагрузки страницы, и об этом на экране не было ни слова.
 *
 * 2. СЛУЖЕБНЫЙ ТЕКСТ СЕРВЕРА УХОДИЛ ЧЕЛОВЕКУ ДОСЛОВНО. Отказ сохранения подписи
 *    показывался как `err.message` без разбора. У самого маршрута сообщение
 *    английское («ID and pkcs7Signature are required»), у двух его отказов
 *    сообщения нет вовсе (`{ error: "DocumentNotFound" }`,
 *    `{ error: "DatabaseError" }`), а пока маршрут не подключён (см. долг ниже)
 *    Fastify отвечает своим телом, и администратор читал в подсказке
 *    «Route POST:/api/documents/<идентификатор>/sign-ukep not found». Обрыв сети
 *    давал английское «Failed to fetch». Теперь отказ проходит через тот же
 *    разбор, что и весь остальной экран (responseErrorMessage в AppHelpers:
 *    служебное и нерусское заменяется человеческой причиной по коду ответа), и к
 *    причине добавляется следующий шаг.
 *
 * 3. ОТКАЗ ИСЧЕЗАЛ ЧЕРЕЗ ЧЕТЫРЕ СЕКУНДЫ. Единственным сообщением об отказе была
 *    всплывающая подсказка со сроком показа по умолчанию. Пожилой администратор
 *    не успевает её прочесть, а перечитать нечем. Причина отказа теперь остаётся
 *    в панели до следующей попытки.
 *
 * 4. КНОПКА «ТЕСТОВОЕ ПОДПИСАНИЕ (DEV)» НЕ МОГЛА СРАБОТАТЬ НИКОГДА. Она
 *    показывалась ровно тогда, когда плагин НЕ найден, и вызывала тот же
 *    обработчик, который в этом случае сразу бросал «Подписание невозможно:
 *    отсутствует плагин или сертификат». То есть кнопка обещала действие,
 *    которого не бывает. Убрана, а не «починена»: подпись, полученная в обход
 *    КриптоПро, — это заведомо недействительная крипто-подпись в архивной
 *    колонке документа, и хуже мёртвой кнопки только документ, который выглядит
 *    заверенным.
 *
 * ЗАЯВЛЕННЫЙ ДОЛГ, НЕ ЗАКРЫТЫЙ ЗДЕСЬ (правки на сервере вне этой задачи).
 *  • POST /api/documents/:id/sign-ukep объявлен в
 *    apps/api/src/routes/documents/signUkep.ts, но registerDocumentRoutes
 *    (apps/api/src/routes/documents.ts:1031-1038) его НЕ вызывает: там семь
 *    регистраторов, и signUkep среди них нет, а server.ts:371 подключает только
 *    этот один регистратор.
 *
 *    ИЗМЕРЕНО, А НЕ ВЫЧИТАНО ГЛАЗАМИ. Проб apps/api/src/tests/routes/
 *    _reconSignUkepRegistrationProbe.ts, запущенный в процессе через app.inject:
 *    маршрут отвечает 404 с телом Fastify
 *    `{"message":"Route POST:/api/documents/<идентификатор>/sign-ukep not
 *    found",…}`; живой сосед /issue из того же регистратора отвечает 401, а сам
 *    signUkep, подключённый напрямую, — тоже 401. То есть мёртвая именно
 *    проводка, а не модуль. Через dev-сервер на 4100 ответ другой (400 и русское
 *    «Запрос не выполнен. Проверьте данные и повторите действие.»): там общий
 *    предохранитель запроса перехватывает раньше маршрутизации. Оба ответа
 *    означают одно — подписать нельзя, и до этой правки первый из них уходил
 *    администратору дословно, вместе с адресом маршрута.
 *
 *    Комментарий в src/tests/documentsViewDecomposition.test.ts:165-167
 *    утверждает обратное («Путь на сервере рабочий») — это утверждение неверно.
 *  • Сам компонент не смонтирован ни одним экраном (заявлено там же и в
 *    src/tests/panelsAreMounted.test.ts), поэтому подписать документ УКЭП
 *    сейчас нельзя ничем. Подключение — новая возможность на экране, а не
 *    правка этого файла.
 */

interface DocumentUkepSignButtonProps {
	documentId: string;
	onSuccess?: () => void;
}

/** Состояние чтения личного хранилища сертификатов: отказ отличается от пустоты. */
type CertificatesState = "loading" | "failed" | "ready";

/** Что делать, если хранилище не читается или в нём ничего нет. */
const CERTIFICATE_STORE_ADVICE =
	"Вставьте носитель с подписью (Рутокен или флешку), проверьте, что КриптоПро CSP запущен, и нажмите «Проверить снова».";

/** Общий хвост отказа подписания: документ остался без подписи, и это важно сказать. */
const SIGN_FAILURE_TAIL =
	"Документ остался без крипто-подписи. Повторите подписание, а если отказ повторится — сообщите администратору клиники.";

type PdfLoadResult =
	| { ok: true; base64: string }
	| { ok: false; reason: string };

export function DocumentUkepSignButton({
	documentId,
	onSuccess,
}: DocumentUkepSignButtonProps) {
	const [isSigning, setIsSigning] = useState(false);
	const [hasPlugin, setHasPlugin] = useState<boolean | null>(null);
	const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
	const [selectedThumbprint, setSelectedThumbprint] = useState<string>("");
	const [certificatesState, setCertificatesState] =
		useState<CertificatesState>("loading");
	/** Причина отказа чтения хранилища, если она пригодна для человека. */
	const [certificatesFailureDetail, setCertificatesFailureDetail] =
		useState("");
	/** Причина отказа подписания. Остаётся на экране до следующей попытки. */
	const [signFailure, setSignFailure] = useState("");

	const loadCertificates = useCallback(async () => {
		setCertificatesState("loading");
		setCertificatesFailureDetail("");
		try {
			const list = await getPersonalCertificates();
			setCertificates(list);
			setSelectedThumbprint(list[0]?.thumbprint ?? "");
			setCertificatesState("ready");
		} catch (error) {
			/*
			 * Список обнуляется намеренно. Раньше при отказе чтения в нём оставались
			 * сертификаты предыдущей удачной попытки, и человек выбирал из списка,
			 * которого в хранилище уже могло не быть.
			 */
			setCertificates([]);
			setSelectedThumbprint("");
			setCertificatesFailureDetail(
				operatorReadableErrorDetailFromUnknown(error) ?? "",
			);
			setCertificatesState("failed");
			showToast("Хранилище сертификатов УКЭП не прочитано", "error", 6000);
		}
	}, []);

	const detectPlugin = useCallback(async () => {
		setHasPlugin(null);
		const detected = await checkCryptoProPlugin();
		setHasPlugin(detected);
		if (detected) await loadCertificates();
	}, [loadCertificates]);

	useEffect(() => {
		void detectPlugin();
	}, [detectPlugin]);

	/**
	 * Печатная копия выданного документа в виде base64.
	 *
	 * Причину отказа отдаёт сам сервер и по-русски: «Документ не найден», «PDF
	 * недоступен: требуется отметка о подписании при выдаче документа», «Архив
	 * выданного документа не прошёл проверку целостности». Раньше все они
	 * заменялись одной строкой «Не удалось загрузить PDF файл документа с
	 * сервера», то есть человек не узнавал, что документ надо сначала выдать.
	 */
	const loadIssuedPdfBase64 = async (): Promise<PdfLoadResult> => {
		let response: Response;
		try {
			response = await fetch(`/api/documents/${documentId}/pdf`);
		} catch {
			return {
				ok: false,
				reason:
					"Печатная копия документа не получена: сервер клиники не отвечает. Проверьте подключение и повторите.",
			};
		}
		if (!response.ok) {
			const reason = await responseErrorMessage(
				response,
				"Печатная копия документа не получена",
			);
			return {
				ok: false,
				reason: `${reason}. Подписать УКЭП можно только выданный документ с отметкой о подписании: сначала выдайте документ, затем повторите подписание.`,
			};
		}
		const blob = await response.blob();
		return await new Promise<PdfLoadResult>((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const result = String(reader.result ?? "");
				const separator = result.indexOf(",");
				if (separator < 0) {
					resolve({
						ok: false,
						reason:
							"Печатная копия документа получена, но прочитать её не удалось. Откройте документ, проверьте, что печатная форма открывается, и повторите подписание.",
					});
					return;
				}
				resolve({ ok: true, base64: result.slice(separator + 1) });
			};
			reader.onerror = () =>
				resolve({
					ok: false,
					reason:
						"Печатная копия документа получена, но прочитать её не удалось. Повторите подписание, а если отказ повторится — сообщите администратору клиники.",
				});
			reader.readAsDataURL(blob);
		});
	};

	function failSigning(reason: string): void {
		setSignFailure(reason);
		showToast(reason, "error", 9000);
	}

	const handleSign = async () => {
		if (!selectedThumbprint) {
			failSigning(
				"Подписывать нечем: сертификат не выбран. Выберите сертификат в списке выше и повторите.",
			);
			return;
		}
		setIsSigning(true);
		setSignFailure("");
		try {
			const pdf = await loadIssuedPdfBase64();
			if (!pdf.ok) {
				failSigning(pdf.reason);
				return;
			}

			const signature = await signBase64WithCertificate(
				pdf.base64,
				selectedThumbprint,
			);

			let response: Response;
			try {
				response = await fetch(`/api/documents/${documentId}/sign-ukep`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ pkcs7Signature: signature }),
				});
			} catch {
				failSigning(
					`Подпись УКЭП не сохранена: сервер клиники не отвечает. ${SIGN_FAILURE_TAIL}`,
				);
				return;
			}

			if (!response.ok) {
				const reason = await responseErrorMessage(
					response,
					"Подпись УКЭП не сохранена",
				);
				failSigning(`${reason}. ${SIGN_FAILURE_TAIL}`);
				return;
			}

			showToast("Документ подписан УКЭП (КриптоПро)", "success");
			onSuccess?.();
		} catch (error) {
			/*
			 * Сюда приходят отказы самого КриптоПро. Их текст пишет плагин, и он
			 * бывает нерусским, поэтому проходит тот же разбор, что и ответы сервера:
			 * непригодное для человека заменяется общей причиной без выдумывания
			 * конкретной — «носитель вынули» и «сервер недоступен» здесь неотличимы.
			 */
			const detail = operatorReadableErrorDetailFromUnknown(error);
			failSigning(
				detail
					? `Подпись УКЭП не сохранена: ${detail} ${SIGN_FAILURE_TAIL}`
					: `Подпись УКЭП не сохранена: подписание не завершилось. Проверьте, что носитель с подписью вставлен и сервер клиники доступен. ${SIGN_FAILURE_TAIL}`,
			);
		} finally {
			setIsSigning(false);
		}
	};

	if (hasPlugin === null) {
		return (
			<div className="flex items-center justify-center p-2 text-sm text-slate-500">
				<Loader2 className="dente-icon-spin mr-2" size={16} />
				<span>Проверка плагина КриптоПро...</span>
			</div>
		);
	}

	if (!hasPlugin) {
		return (
			<div className="p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 rounded-lg text-sm">
				<div className="flex items-start text-red-800 dark:text-red-300 mb-2">
					<AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
					<span>Плагин КриптоПро ЭЦП Browser Plug-in не обнаружен.</span>
				</div>
				<p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
					Подписать документ усиленной квалифицированной подписью без него
					нельзя. Нужны КриптоПро CSP и расширение для браузера. Установите их
					по инструкции, затем нажмите «Проверить снова» — перезагружать
					страницу не требуется.
				</p>
				<div className="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onClick={() => void detectPlugin()}
						className="dente-button dente-button--secondary dente-button--small justify-center"
					>
						<RefreshCw className="mr-2" size={16} />
						<span>Проверить снова</span>
					</button>
					<a
						href="https://cryptopro.ru/products/cades/plugin"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-block text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
					>
						Инструкция по установке плагина →
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
			<label
				htmlFor="ukep-cert-select"
				className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
			>
				Выберите сертификат УКЭП:
			</label>
			{certificatesState === "loading" ? (
				<div className="flex items-center text-xs text-slate-400 p-2">
					<Loader2 className="dente-icon-spin mr-2" size={14} />
					Читаем хранилище сертификатов...
				</div>
			) : certificatesState === "failed" ? (
				<div
					className="text-xs p-2 border border-red-200 dark:border-red-900/30 rounded mb-3 text-red-800 dark:text-red-300"
					role="status"
					aria-live="polite"
				>
					<strong className="block mb-1">
						Хранилище сертификатов не прочитано — это не значит, что
						сертификатов нет.
					</strong>
					{certificatesFailureDetail ? (
						<p className="mb-1">{certificatesFailureDetail}</p>
					) : null}
					<p className="mb-2">{CERTIFICATE_STORE_ADVICE}</p>
					<button
						type="button"
						onClick={() => void loadCertificates()}
						className="dente-button dente-button--secondary dente-button--small justify-center"
					>
						<RefreshCw className="mr-2" size={14} />
						<span>Проверить снова</span>
					</button>
				</div>
			) : certificates.length === 0 ? (
				<div
					className="text-xs p-2 border border-dashed border-slate-300 dark:border-slate-700 rounded mb-3 text-slate-600 dark:text-slate-300"
					role="status"
					aria-live="polite"
				>
					<strong className="block mb-1">
						Хранилище прочитано, личных сертификатов в нём нет.
					</strong>
					<p className="mb-2">
						Сертификат подписи выдаёт удостоверяющий центр, и он должен быть
						установлен в личное хранилище этого компьютера.{" "}
						{CERTIFICATE_STORE_ADVICE}
					</p>
					<button
						type="button"
						onClick={() => void loadCertificates()}
						className="dente-button dente-button--secondary dente-button--small justify-center"
					>
						<RefreshCw className="mr-2" size={14} />
						<span>Проверить снова</span>
					</button>
				</div>
			) : (
				<select
					id="ukep-cert-select"
					value={selectedThumbprint}
					onChange={(e) => setSelectedThumbprint(e.target.value)}
					disabled={isSigning}
					className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1.5 mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
				>
					{certificates.map((cert) => {
						const expiry = new Date(cert.validTo).toLocaleDateString("ru-RU");
						const cleanSubject =
							cert.subjectName
								.split(",")
								.find((part) => part.startsWith("CN="))
								?.replace("CN=", "") || cert.subjectName;

						return (
							<option key={cert.thumbprint} value={cert.thumbprint}>
								{cleanSubject} (до {expiry})
							</option>
						);
					})}
				</select>
			)}

			{signFailure ? (
				<p
					className="text-xs p-2 border border-red-200 dark:border-red-900/30 rounded mb-3 text-red-800 dark:text-red-300"
					role="status"
					aria-live="polite"
				>
					{signFailure}
				</p>
			) : null}

			<button
				type="button"
				onClick={handleSign}
				disabled={isSigning || !selectedThumbprint}
				className="dente-button dente-button--primary dente-button--small w-full justify-center"
			>
				{isSigning ? (
					<Loader2 className="dente-icon-spin mr-2" size={16} />
				) : (
					<FileSignature className="mr-2" size={16} />
				)}
				<span>
					{isSigning ? "Подписание..." : "Подписать УКЭП (КриптоПро)"}
				</span>
			</button>
		</div>
	);
}
