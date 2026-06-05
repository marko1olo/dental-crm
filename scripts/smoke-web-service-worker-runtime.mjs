import vm from "node:vm";
import { readFile } from "node:fs/promises";

const swSource = await readFile("apps/web/public/sw.js", "utf8");
const listeners = new Map();
const stores = new Map();
const cacheWrites = [];
const cacheDeletes = [];
const fetches = [];
let clientsClaimed = false;
let skipWaitingCalled = false;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function absoluteUrl(input) {
  if (typeof input === "string") return new URL(input, "https://clinic.local").href;
  return input.url;
}

function pathOf(input) {
  return new URL(absoluteUrl(input)).pathname;
}

class FakeCache {
  constructor(name) {
    this.name = name;
    this.entries = new Map();
  }

  async addAll(paths) {
    for (const path of paths) {
      this.entries.set(new URL(path, "https://clinic.local").href, new Response(`cached:${path}`, { status: 200 }));
    }
  }

  async put(request, response) {
    const url = absoluteUrl(request);
    cacheWrites.push(pathOf(request));
    this.entries.set(url, response.clone());
  }

  async keys() {
    return [...this.entries.keys()].map((url) => new Request(url));
  }

  async delete(request) {
    const url = absoluteUrl(request);
    cacheDeletes.push(pathOf(request));
    return this.entries.delete(url);
  }

  async match(request) {
    return this.entries.get(absoluteUrl(request))?.clone();
  }
}

const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new FakeCache(name));
    return stores.get(name);
  },
  async keys() {
    return [...stores.keys()];
  },
  async delete(name) {
    return stores.delete(name);
  },
  async match(request) {
    for (const cache of stores.values()) {
      const response = await cache.match(request);
      if (response) return response;
    }
    return undefined;
  }
};

let fetchHandler = async (request) => new Response(`network:${pathOf(request)}`, { status: 200 });

const self = {
  location: new URL("https://clinic.local/"),
  clients: {
    async claim() {
      clientsClaimed = true;
    }
  },
  addEventListener(type, handler) {
    listeners.set(type, handler);
  },
  skipWaiting() {
    skipWaitingCalled = true;
  }
};

vm.runInContext(swSource, vm.createContext({ self, caches, fetch: async (request) => {
  fetches.push(pathOf(request));
  return fetchHandler(request);
}, URL, Request, Response, Promise, console }));

async function settleLooseCacheWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function dispatchLifecycle(type) {
  const waits = [];
  listeners.get(type)?.({
    waitUntil(promise) {
      waits.push(Promise.resolve(promise));
    }
  });
  await Promise.all(waits);
  await settleLooseCacheWork();
}

async function dispatchMessage(data) {
  const waits = [];
  const replies = [];
  listeners.get("message")?.({
    data,
    source: {
      postMessage(message) {
        replies.push(message);
      }
    },
    waitUntil(promise) {
      waits.push(Promise.resolve(promise));
    }
  });
  await Promise.all(waits);
  await settleLooseCacheWork();
  return replies;
}

async function dispatchFetch(path, init = {}) {
  const requestUrl = new URL(path, "https://clinic.local").href;
  const request = {
    method: init.method ?? "GET",
    mode: init.mode ?? "same-origin",
    url: requestUrl
  };
  const waits = [];
  let responsePromise;
  listeners.get("fetch")?.({
    request,
    respondWith(promise) {
      responsePromise = Promise.resolve(promise);
    },
    waitUntil(promise) {
      waits.push(Promise.resolve(promise));
    }
  });
  assert(responsePromise, `fetch did not respond for ${path}`);
  const response = await responsePromise;
  await Promise.all(waits);
  await settleLooseCacheWork();
  return response;
}

await dispatchLifecycle("install");
await dispatchLifecycle("activate");

assert(clientsClaimed, "activate must claim clients");
assert(stores.has("dental-crm-shell-v4"), "current shell cache must exist after install");
assert(await caches.match("/index.html"), "install must cache index shell fallback");

cacheWrites.length = 0;
await dispatchFetch("/api/patients");
await dispatchFetch("/api/documents/doc-1/pdf");
await dispatchFetch("/imaging/dicom/pixels/series-1");
await dispatchFetch("/exports/model.stl");
assert(fetches.includes("/api/patients"), "api requests must use network");
assert(!cacheWrites.some((path) => path.startsWith("/api/")), "api responses must not be cached");
assert(!cacheWrites.some((path) => path.startsWith("/imaging/")), "DICOM/imaging responses must not be cached");
assert(!cacheWrites.includes("/exports/model.stl"), "mesh/CAD/STL responses must not be cached");

cacheWrites.length = 0;
await dispatchFetch("/assets/workspace-A1b2C3.js");
assert(cacheWrites.includes("/assets/workspace-A1b2C3.js"), "same-origin JS shell asset must be cached");

const assetCache = stores.get("dental-crm-shell-v4");
await assetCache.put(new Request("https://clinic.local/assets/workspace-stale.js"), new Response("cached-stale", { status: 200 }));
fetchHandler = async (request) => {
  if (pathOf(request) === "/assets/workspace-stale.js") throw new Error("offline");
  return new Response(`network:${pathOf(request)}`, { status: 200 });
};
const staleFallback = await dispatchFetch("/assets/workspace-stale.js");
assert((await staleFallback.text()) === "cached-stale", "network-first JS assets must fall back to cached shell assets offline");

fetchHandler = async () => {
  throw new Error("offline");
};
const navigationFallback = await dispatchFetch("/", { mode: "navigate" });
assert((await navigationFallback.text()).includes("cached:/index.html"), "offline navigation must fall back to cached index");

await dispatchMessage({ type: "DENTE_SKIP_WAITING" });
assert(skipWaitingCalled, "message protocol must allow a waiting worker to activate");

const replies = await dispatchMessage({ type: "DENTE_CLEAR_SHELL_CACHE" });
assert(stores.has("dental-crm-shell-v4"), "message protocol must retain the shell cache after stale chunk recovery");
assert(await caches.match("/index.html"), "stale chunk recovery must preserve index shell fallback");
assert(await caches.match("/offline.html"), "stale chunk recovery must preserve offline shell fallback");
assert(!(await caches.match("/assets/workspace-stale.js")), "stale chunk recovery must evict dynamic shell chunks");
assert(replies.some((message) => message.type === "DENTE_SHELL_CACHE_CLEARED"), "cache clear must acknowledge the client");
assert(cacheDeletes.length <= 80, "runtime cache pruning must remain bounded");

console.log("web service worker runtime smoke passed");
