import type {
	FastifyBaseLogger,
	FastifyInstance,
	FastifyRequest,
	FastifyTypeProvider,
	FastifyTypeProviderDefault,
	RawReplyDefaultExpression,
	RawRequestDefaultExpression,
	RawServerBase,
	RawServerDefault,
} from "fastify";
import type { WebSocket } from "ws";

declare module "fastify" {
	interface RouteShorthandMethod<
		RawServer extends RawServerBase = RawServerDefault,
		RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
		RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
		TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
		Logger extends FastifyBaseLogger = FastifyBaseLogger,
	> {
		(
			path: string,
			opts: { websocket: true },
			handler: (socket: WebSocket, request: FastifyRequest) => void,
		): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;
	}
}
