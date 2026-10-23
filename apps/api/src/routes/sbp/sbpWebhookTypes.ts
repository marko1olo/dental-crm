import type { SbpWebhookResult } from "./types.js";

export type ProcessSbpWebhookResult =
	| {
			readonly statusCode: 400;
			readonly body: {
				readonly error: string;
				readonly message: string;
			};
	  }
	| {
			readonly statusCode: 200;
			readonly body: SbpWebhookResult;
	  };
