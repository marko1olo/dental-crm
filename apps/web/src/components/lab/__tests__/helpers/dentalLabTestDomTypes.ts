export type MockFn<TArgs extends unknown[] = unknown[], TRet = unknown> = {
	(...args: TArgs): TRet;
	calls: TArgs[];
	mock: { calls: TArgs[] };
};

export function createMockFn<TArgs extends unknown[] = unknown[], TRet = unknown>(
	impl?: (...args: TArgs) => TRet,
): MockFn<TArgs, TRet> {
	const calls: TArgs[] = [];
	const fn = ((...args: TArgs) => {
		calls.push(args);
		return impl ? impl(...args) : (undefined as unknown as TRet);
	}) as MockFn<TArgs, TRet>;
	fn.calls = calls;
	fn.mock = { calls };
	return fn;
}

export interface MockDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: MockDomNode[];
	childNodes: MockDomNode[];
	attributes: { name: string; value: string }[];
	ownerDocument: unknown;
	parentNode: MockDomNode | null;
	textContent: string;
	multiple?: boolean;
	selectedIndex?: number;
	value?: string;
	options?: MockDomNode[];
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string }) => boolean;
	focus: () => void;
	blur: () => void;
	getBoundingClientRect: () => {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
	[key: string]: unknown;
}
