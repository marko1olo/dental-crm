import { z } from "zod";

const SBERBANK_TEST_URL = "https://3dsec.sberbank.ru/payment/rest/";
const SBERBANK_PROD_URL = "https://securepayments.sberbank.ru/payment/rest/";

const SberbankRegisterResponseSchema = z.object({
	orderId: z.string().optional(),
	formUrl: z.string().optional(),
	errorCode: z.coerce.string().optional(),
	errorMessage: z.string().optional(),
});

export type SberbankRegisterResponse = z.infer<
	typeof SberbankRegisterResponseSchema
>;

const SberbankOrderStatusResponseSchema = z.object({
	errorCode: z.coerce.string().optional(),
	errorMessage: z.string().optional(),
	orderNumber: z.string().optional(),
	orderStatus: z.coerce.number().optional(),
	actionCode: z.coerce.number().optional(),
	actionCodeDescription: z.string().optional(),
	amount: z.coerce.number().optional(),
	currency: z.string().optional(),
	date: z.coerce.number().optional(),
	ip: z.string().optional(),
	attributes: z
		.array(
			z.object({
				name: z.string(),
				value: z.string(),
			}),
		)
		.optional(),
});

export type SberbankOrderStatusResponse = z.infer<
	typeof SberbankOrderStatusResponseSchema
>;

export class SberbankClient {
	private baseUrl: string;
	private userName: string;
	private password?: string | undefined;
	private token?: string | undefined;

	constructor() {
		// Поддержка переключения на тестовый контур
		const isTestMode = process.env.SBERBANK_IS_TEST_MODE === "true";
		this.baseUrl = isTestMode ? SBERBANK_TEST_URL : SBERBANK_PROD_URL;

		const user = process.env.SBERBANK_TERMINAL_USER?.trim();
		const pass = process.env.SBERBANK_TERMINAL_PASSWORD?.trim();
		const token = process.env.SBERBANK_TERMINAL_TOKEN?.trim();

		if (!user && !token) {
			throw new Error("Не настроены параметры доступа к эквайрингу Сбербанка: задайте логин терминала или токен.");
		}

		this.userName = user ?? "";
		this.password = pass;
		this.token = token;
	}

	/**
	 * Регистрация заказа
	 * @param orderNumber Уникальный номер заказа в нашей системе
	 * @param amount Сумма в копейках (целое число)
	 * @param returnUrl Адрес возврата после оплаты (требуется шлюзом, даже если оплата из модалки)
	 */
	async registerOrder(
		orderNumber: string,
		amount: number,
		returnUrl: string,
	): Promise<SberbankRegisterResponse> {
		const params = new URLSearchParams();
		
		if (this.token) {
			params.append("token", this.token);
		} else {
			params.append("userName", this.userName);
			if (this.password) params.append("password", this.password);
		}
		
		params.append("orderNumber", orderNumber);
		params.append("amount", amount.toString());
		params.append("returnUrl", returnUrl);

		const response = await fetch(`${this.baseUrl}register.do`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`Ошибка обращения к шлюзу Сбербанка: HTTP ${response.status}`);
		}

		const data = await response.json();
		return SberbankRegisterResponseSchema.parse(data);
	}

	/**
	 * Запрос расширенного статуса заказа
	 * @param orderId Идентификатор заказа, полученный от шлюза при регистрации (register.do)
	 */
	async getOrderStatusExtended(
		orderId: string,
	): Promise<SberbankOrderStatusResponse> {
		const params = new URLSearchParams();
		
		if (this.token) {
			params.append("token", this.token);
		} else {
			params.append("userName", this.userName);
			if (this.password) params.append("password", this.password);
		}
		
		params.append("orderId", orderId);

		const response = await fetch(`${this.baseUrl}getOrderStatusExtended.do`, {
			method: "POST", // API поддерживает и GET и POST, но POST надёжнее для URLSearchParams
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`Ошибка запроса статуса заказа в Сбербанке: HTTP ${response.status}`);
		}

		const data = await response.json();
		return SberbankOrderStatusResponseSchema.parse(data);
	}
}
