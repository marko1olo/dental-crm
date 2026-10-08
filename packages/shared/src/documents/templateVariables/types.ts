/**
 * Контракт спецификации стандартизированного токена подстановки.
 * Layer 0: Чистый интерфейс без рантайм-зависимостей.
 */

export interface DocumentTemplateVariableSpec {
	token: string;
	domain: string;
	name: string;
	description: string;
	exampleValue: string;
	resolverPath: string;
}
