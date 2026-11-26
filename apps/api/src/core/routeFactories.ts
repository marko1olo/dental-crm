/**
 * routeFactories.ts — Типизированные фабрики Fastify-маршрутов с явным
 * управлением жизненным циклом транзакций PG18 (READ ONLY / READ WRITE / Stream).
 *
 * Все маршруты, зарегистрированные через эти фабрики, автоматически помечаются
 * `config: { tenantTxSelfManaged: true }` для обхода глобального хука `onRoute`.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeAny, z } from "zod";
import type { TenantDb } from "../db/client.js";
import { runWithStrictUnscopedDbTrap } from "../db/client.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../db/rls.js";
import {
	executeIdempotentMutationTx,
	type PermissionRequirement,
	type PrincipalAuthOptions,
	requireVerifiedPrincipal,
	type VerifiedPrincipal,
} from "../security/unifiedAuthPerimeter.js";

type InferOrUndefined<TSchema extends ZodTypeAny | undefined> =
	TSchema extends ZodTypeAny ? z.infer<TSchema> : undefined;

export type RouteFactoryKind =
	| "tenant_query"
	| "tenant_mutation"
	| "stream_route"
	| "public_route"
	| "webhook_route";

export interface FactoryRouteConfig {
	tenantTxSelfManaged: true;
	routeFactoryKind: RouteFactoryKind;
}

export interface TenantQueryContext<
	TParams extends ZodTypeAny | undefined,
	TQuery extends ZodTypeAny | undefined,
> {
	tx: TenantDb;
	principal: VerifiedPrincipal;
	organizationId: string;
	params: InferOrUndefined<TParams>;
	query: InferOrUndefined<TQuery>;
	request: FastifyRequest;
	reply: FastifyReply;
}

export interface TenantQueryRouteSpec<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
> {
	method?: "GET" | "HEAD" | undefined;
	path: string;
	permission: PermissionRequirement;
	authOptions?: PrincipalAuthOptions | undefined;
	paramsSchema?: TParams | undefined;
	querySchema?: TQuery | undefined;
	validationErrorCode?: string | undefined;
	validationErrorMessage?: string | undefined;
	handler: (ctx: TenantQueryContext<TParams, TQuery>) => Promise<TResult>;
}

export interface TenantMutationContext<
	TParams extends ZodTypeAny | undefined,
	TQuery extends ZodTypeAny | undefined,
	TBody extends ZodTypeAny | undefined,
> {
	tx: TenantDb;
	principal: VerifiedPrincipal;
	organizationId: string;
	idempotencyKey: string | null;
	params: InferOrUndefined<TParams>;
	query: InferOrUndefined<TQuery>;
	body: InferOrUndefined<TBody>;
	request: FastifyRequest;
	reply: FastifyReply;
}

export interface TenantMutationRouteSpec<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
> {
	method: "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	permission: PermissionRequirement;
	authOptions?: PrincipalAuthOptions | undefined;
	idempotency?:
		| "required_header"
		| "optional_header"
		| "exempt_idempotent_put_or_delete"
		| undefined;
	paramsSchema?: TParams | undefined;
	querySchema?: TQuery | undefined;
	bodySchema?: TBody | undefined;
	validationErrorCode?: string | undefined;
	validationErrorMessage?: string | undefined;
	onHandlerError?:
		| ((err: unknown, reply: FastifyReply) => boolean | Promise<boolean>)
		| undefined;
	handler: (
		ctx: TenantMutationContext<TParams, TQuery, TBody>,
	) => Promise<TResult>;
}

export interface StreamRouteContext<
	TParams extends ZodTypeAny | undefined,
	TQuery extends ZodTypeAny | undefined,
	TBody extends ZodTypeAny | undefined,
> {
	principal: VerifiedPrincipal | null;
	organizationId: string | null;
	runReadTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>;
	runWriteTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>;
	params: InferOrUndefined<TParams>;
	query: InferOrUndefined<TQuery>;
	body: InferOrUndefined<TBody>;
	request: FastifyRequest;
	reply: FastifyReply;
}

export interface StreamRouteSpec<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
> {
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	permission: PermissionRequirement;
	authOptions?: PrincipalAuthOptions | undefined;
	bodyLimit?: number | undefined;
	schema?: Record<string, unknown> | undefined;
	paramsSchema?: TParams | undefined;
	querySchema?: TQuery | undefined;
	bodySchema?: TBody | undefined;
	validationErrorCode?: string | undefined;
	validationErrorMessage?: string | undefined;
	handler: (
		ctx: StreamRouteContext<TParams, TQuery, TBody>,
	) => Promise<TResult>;
}

export interface PublicRouteContext<
	TParams extends ZodTypeAny | undefined,
	TQuery extends ZodTypeAny | undefined,
	TBody extends ZodTypeAny | undefined,
> {
	params: InferOrUndefined<TParams>;
	query: InferOrUndefined<TQuery>;
	body: InferOrUndefined<TBody>;
	request: FastifyRequest;
	reply: FastifyReply;
}

export interface PublicRouteSpec<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
> {
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	bodyLimit?: number | undefined;
	schema?: Record<string, unknown> | undefined;
	paramsSchema?: TParams | undefined;
	querySchema?: TQuery | undefined;
	bodySchema?: TBody | undefined;
	validationErrorCode?: string | undefined;
	validationErrorMessage?: string | undefined;
	handler: (
		ctx: PublicRouteContext<TParams, TQuery, TBody>,
	) => Promise<TResult>;
}

export interface WebhookRouteContext<
	TParams extends ZodTypeAny | undefined,
	TQuery extends ZodTypeAny | undefined,
	TBody extends ZodTypeAny | undefined,
> {
	params: InferOrUndefined<TParams>;
	query: InferOrUndefined<TQuery>;
	body: InferOrUndefined<TBody>;
	runTenantReadTx: <T>(
		organizationId: string,
		fn: (tx: TenantDb) => Promise<T>,
	) => Promise<T>;
	runTenantWriteTx: <T>(
		organizationId: string,
		fn: (tx: TenantDb) => Promise<T>,
	) => Promise<T>;
	request: FastifyRequest;
	reply: FastifyReply;
}

export interface WebhookRouteSpec<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
> {
	method: "GET" | "POST";
	path: string;
	verifySignature?:
		| ((request: FastifyRequest, reply: FastifyReply) => Promise<boolean> | boolean)
		| undefined;
	paramsSchema?: TParams | undefined;
	querySchema?: TQuery | undefined;
	bodySchema?: TBody | undefined;
	validationErrorCode?: string | undefined;
	validationErrorMessage?: string | undefined;
	handler: (
		ctx: WebhookRouteContext<TParams, TQuery, TBody>,
	) => Promise<TResult>;
}

function parseSchemaOrReply<TSchema extends ZodTypeAny | undefined>(
	schema: TSchema | undefined,
	rawInput: unknown,
	reply: FastifyReply,
	errorCode?: string,
	errorMessage?: string,
): { ok: true; data: InferOrUndefined<TSchema> } | { ok: false } {
	if (!schema) {
		return { ok: true, data: undefined as InferOrUndefined<TSchema> };
	}
	const parsed = schema.safeParse(rawInput ?? {});
	if (!parsed.success) {
		reply.code(400).send({
			error: errorCode ?? "ValidationError",
			message: errorMessage ?? "Некорректные параметры запроса.",
			issues: parsed.error.issues,
		});
		return { ok: false };
	}
	return { ok: true, data: parsed.data as InferOrUndefined<TSchema> };
}

function finalizeFactoryResponse(
	reply: FastifyReply,
	result: unknown,
	wasReplySendCalled: boolean,
): unknown {
	if (wasReplySendCalled || reply.sent || result === reply) {
		return reply;
	}
	if (result !== undefined) {
		return reply.send(result);
	}
	return reply;
}

export function defineTenantQuery<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
>(
	app: FastifyInstance,
	spec: TenantQueryRouteSpec<TParams, TQuery, TResult>,
): void {
	app.route({
		method: spec.method ?? "GET",
		url: spec.path,
		config: {
			tenantTxSelfManaged: true,
			routeFactoryKind: "tenant_query",
		} satisfies FactoryRouteConfig,
		handler: async (request, reply) => {
			let sendCalled = false;
			const origSend = reply.send.bind(reply);
			reply.send = ((...args: Parameters<typeof origSend>) => {
				sendCalled = true;
				origSend(...args);
				return reply;
			});
			try {
				const principal = await requireVerifiedPrincipal(
					request,
					reply,
					spec.permission,
					spec.authOptions,
				);
				if (!principal) return reply;

				const paramsRes = parseSchemaOrReply(
					spec.paramsSchema,
					request.params,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!paramsRes.ok) return reply;

				const queryRes = parseSchemaOrReply(
					spec.querySchema,
					request.query,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!queryRes.ok) return reply;

				const result = await withTenantReadCtx(
					principal.organizationId,
					(tx) =>
						spec.handler({
							tx,
							principal,
							organizationId: principal.organizationId,
							params: paramsRes.data,
							query: queryRes.data,
							request,
							reply,
						}),
				);

				return finalizeFactoryResponse(reply, result, sendCalled);
			} finally {
				reply.send = origSend;
			}
		},
	});
}

export function defineTenantMutation<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
>(
	app: FastifyInstance,
	spec: TenantMutationRouteSpec<TParams, TQuery, TBody, TResult>,
): void {
	app.route({
		method: spec.method,
		url: spec.path,
		config: {
			tenantTxSelfManaged: true,
			routeFactoryKind: "tenant_mutation",
		} satisfies FactoryRouteConfig,
		handler: async (request, reply) => {
			let sendCalled = false;
			const origSend = reply.send.bind(reply);
			reply.send = ((...args: Parameters<typeof origSend>) => {
				sendCalled = true;
				origSend(...args);
				return reply;
			});
			try {
				const principal = await requireVerifiedPrincipal(
					request,
					reply,
					spec.permission,
					spec.authOptions,
				);
				if (!principal) return reply;

				const paramsRes = parseSchemaOrReply(
					spec.paramsSchema,
					request.params,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!paramsRes.ok) return reply;

				const queryRes = parseSchemaOrReply(
					spec.querySchema,
					request.query,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!queryRes.ok) return reply;

				const bodyRes = parseSchemaOrReply(
					spec.bodySchema,
					request.body,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!bodyRes.ok) return reply;

				const requireHeader =
					(spec.idempotency ?? "required_header") === "required_header";

				try {
					await executeIdempotentMutationTx({
						request,
						reply,
						organizationId: principal.organizationId,
						requireHeader,
						execute: (tx, idempotencyKey) =>
							spec.handler({
								tx,
								principal,
								organizationId: principal.organizationId,
								idempotencyKey,
								params: paramsRes.data,
								query: queryRes.data,
								body: bodyRes.data,
								request,
								reply,
							}),
					});
					return reply;
				} catch (err) {
					if (spec.onHandlerError && (await spec.onHandlerError(err, reply))) {
						return reply;
					}
					throw err;
				}
			} finally {
				reply.send = origSend;
			}
		},
	});
}

export function defineStreamRoute<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
>(
	app: FastifyInstance,
	spec: StreamRouteSpec<TParams, TQuery, TBody, TResult>,
): void {
	app.route({
		method: spec.method,
		url: spec.path,
		...(spec.bodyLimit !== undefined ? { bodyLimit: spec.bodyLimit } : {}),
		...(spec.schema !== undefined ? { schema: spec.schema } : {}),
		config: {
			tenantTxSelfManaged: true,
			routeFactoryKind: "stream_route",
		} satisfies FactoryRouteConfig,
		handler: async (request, reply) => {
			let sendCalled = false;
			const origSend = reply.send.bind(reply);
			reply.send = ((...args: Parameters<typeof origSend>) => {
				sendCalled = true;
				origSend(...args);
				return reply;
			});
			try {
				let principal: VerifiedPrincipal | null = null;
				if (spec.permission !== "public") {
					principal = await requireVerifiedPrincipal(
						request,
						reply,
						spec.permission,
						spec.authOptions,
					);
					if (!principal) return reply;
				}

				const paramsRes = parseSchemaOrReply(
					spec.paramsSchema,
					request.params,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!paramsRes.ok) return reply;

				const queryRes = parseSchemaOrReply(
					spec.querySchema,
					request.query,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!queryRes.ok) return reply;

				const bodyRes = parseSchemaOrReply(
					spec.bodySchema,
					request.body,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!bodyRes.ok) return reply;

				const organizationId = principal?.organizationId ?? null;
				const requireOrg = (): string => {
					if (!organizationId) {
						throw new Error(
							`Stream route ${spec.path} attempted tenant DB transaction without verified organizationId`,
						);
					}
					return organizationId;
				};

				const result = await runWithStrictUnscopedDbTrap(() =>
					spec.handler({
						principal,
						organizationId,
						runReadTx: (fn) => withTenantReadCtx(requireOrg(), fn),
						runWriteTx: (fn) => withTenantWriteCtx(requireOrg(), fn),
						params: paramsRes.data,
						query: queryRes.data,
						body: bodyRes.data,
						request,
						reply,
					}),
				);

				return finalizeFactoryResponse(reply, result, sendCalled);
			} finally {
				reply.send = origSend;
			}
		},
	});
}

export function definePublicRoute<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
>(
	app: FastifyInstance,
	spec: PublicRouteSpec<TParams, TQuery, TBody, TResult>,
): void {
	app.route({
		method: spec.method,
		url: spec.path,
		...(spec.bodyLimit !== undefined ? { bodyLimit: spec.bodyLimit } : {}),
		...(spec.schema !== undefined ? { schema: spec.schema } : {}),
		config: {
			tenantTxSelfManaged: true,
			routeFactoryKind: "public_route",
		} satisfies FactoryRouteConfig,
		handler: async (request, reply) => {
			let sendCalled = false;
			const origSend = reply.send.bind(reply);
			reply.send = ((...args: Parameters<typeof origSend>) => {
				sendCalled = true;
				origSend(...args);
				return reply;
			});
			try {
				const paramsRes = parseSchemaOrReply(
					spec.paramsSchema,
					request.params,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!paramsRes.ok) return reply;

				const queryRes = parseSchemaOrReply(
					spec.querySchema,
					request.query,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!queryRes.ok) return reply;

				const bodyRes = parseSchemaOrReply(
					spec.bodySchema,
					request.body,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!bodyRes.ok) return reply;

				const result = await spec.handler({
					params: paramsRes.data,
					query: queryRes.data,
					body: bodyRes.data,
					request,
					reply,
				});

				return finalizeFactoryResponse(reply, result, sendCalled);
			} finally {
				reply.send = origSend;
			}
		},
	});
}

export function defineWebhookRoute<
	TParams extends ZodTypeAny | undefined = undefined,
	TQuery extends ZodTypeAny | undefined = undefined,
	TBody extends ZodTypeAny | undefined = undefined,
	TResult = unknown,
>(
	app: FastifyInstance,
	spec: WebhookRouteSpec<TParams, TQuery, TBody, TResult>,
): void {
	app.route({
		method: spec.method,
		url: spec.path,
		config: {
			tenantTxSelfManaged: true,
			routeFactoryKind: "webhook_route",
		} satisfies FactoryRouteConfig,
		handler: async (request, reply) => {
			let sendCalled = false;
			const origSend = reply.send.bind(reply);
			reply.send = ((...args: Parameters<typeof origSend>) => {
				sendCalled = true;
				origSend(...args);
				return reply;
			});
			try {
				if (spec.verifySignature) {
					const sigOk = await spec.verifySignature(request, reply);
					if (!sigOk) return reply;
				}

				const paramsRes = parseSchemaOrReply(
					spec.paramsSchema,
					request.params,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!paramsRes.ok) return reply;

				const queryRes = parseSchemaOrReply(
					spec.querySchema,
					request.query,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!queryRes.ok) return reply;

				const bodyRes = parseSchemaOrReply(
					spec.bodySchema,
					request.body,
					reply,
					spec.validationErrorCode,
					spec.validationErrorMessage,
				);
				if (!bodyRes.ok) return reply;

				const result = await runWithStrictUnscopedDbTrap(() =>
					spec.handler({
						params: paramsRes.data,
						query: queryRes.data,
						body: bodyRes.data,
						runTenantReadTx: (organizationId, fn) =>
							withTenantReadCtx(organizationId, fn),
						runTenantWriteTx: (organizationId, fn) =>
							withTenantWriteCtx(organizationId, fn),
						request,
						reply,
					}),
				);

				return finalizeFactoryResponse(reply, result, sendCalled);
			} finally {
				reply.send = origSend;
			}
		},
	});
}
