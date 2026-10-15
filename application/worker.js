/**
 * Library Book Manager - Cloudflare Worker
 * Serves the web interface AND the REST API, storing books in Workers KV.
 *
 * Bindings (created by Terraform):
 *   env.BOOKS_KV     -> Workers KV namespace
 *   env.ENVIRONMENT  -> dev | test | production
 *   env.APP_NAME     -> display name
 *
 * The three constants below are placeholders. Terraform replaces them with the
 * contents of index.html, style.css and script.js at plan/apply time.
 */
const INDEX_HTML = "__INDEX_HTML__";
const STYLE_CSS = "__STYLE_CSS__";
const SCRIPT_JS = "__SCRIPT_JS__";

const STATUSES = ["Available", "Issued", "Reserved"];
const KEY_PREFIX = "book:";
const COUNTER_KEY = "meta:counter";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const asset = (body, type) =>
  new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8` } });

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function nextId(env) {
  const raw = await env.BOOKS_KV.get(COUNTER_KEY);
  const n = raw ? parseInt(raw, 10) + 1 : 101; // first book -> B101
  await env.BOOKS_KV.put(COUNTER_KEY, String(n));
  return `B${n}`;
}

async function listBooks(env) {
  const books = [];
  let cursor;
  do {
    const page = await env.BOOKS_KV.list({ prefix: KEY_PREFIX, cursor });
    const items = await Promise.all(page.keys.map((k) => env.BOOKS_KV.get(k.name, "json")));
    books.push(...items.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return books.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validate(body, { partial }) {
  const out = {};
  const errors = [];
  const fields = {
    title: clean(body.title, 150),
    author: clean(body.author, 100),
    category: clean(body.category, 50),
    status: clean(body.status, 20),
  };
  for (const [key, value] of Object.entries(fields)) {
    if (partial && body[key] === undefined) continue;
    if (key === "category") out[key] = value || "General";
    else if (key === "status") {
      const match = STATUSES.find((s) => s.toLowerCase() === value.toLowerCase());
      if (!match && !(!partial && !value)) errors.push(`status must be one of: ${STATUSES.join(", ")}`);
      out[key] = match || "Available";
    } else if (!value) errors.push(`${key} is required`);
    else out[key] = value;
  }
  return { out, errors };
}

async function handleApi(request, env, path) {
  const method = request.method;

  if (path === "/api/config" && method === "GET") {
    return json({ appName: env.APP_NAME || "Library Book Management System", environment: env.ENVIRONMENT || "dev" });
  }

  // /api/books
  if (path === "/api/books") {
    if (method === "GET") {
      const books = await listBooks(env);
      return json({ count: books.length, books });
    }
    if (method === "POST") {
      const body = await readBody(request);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const { out, errors } = validate(body, { partial: false });
      if (errors.length) return json({ error: errors.join("; ") }, 400);
      const book = { id: await nextId(env), ...out, createdAt: new Date().toISOString() };
      await env.BOOKS_KV.put(KEY_PREFIX + book.id, JSON.stringify(book));
      return json({ message: "Book successfully added", book }, 201);
    }
    return json({ error: "Method not allowed" }, 405);
  }

  // /api/books/{id}
  const match = path.match(/^\/api\/books\/([A-Za-z0-9_-]{1,20})$/);
  if (match) {
    const id = match[1].toUpperCase();
    const key = KEY_PREFIX + id;
    const existing = await env.BOOKS_KV.get(key, "json");
    if (!existing) return json({ error: `Book ${id} not found` }, 404);

    if (method === "GET") return json(existing);

    if (method === "PUT") {
      const body = await readBody(request);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const { out, errors } = validate(body, { partial: true });
      if (errors.length) return json({ error: errors.join("; ") }, 400);
      const book = { ...existing, ...out, id, updatedAt: new Date().toISOString() };
      await env.BOOKS_KV.put(key, JSON.stringify(book));
      return json({ message: "Book successfully updated", book });
    }

    if (method === "DELETE") {
      await env.BOOKS_KV.delete(key);
      return json({ message: "Book successfully removed", id });
    }
    return json({ error: "Method not allowed" }, 405);
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    try {
      if (path.startsWith("/api/")) return await handleApi(request, env, path);
      if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed" }, 405);
      if (path === "/" || path === "/index.html") return asset(INDEX_HTML, "text/html");
      if (path === "/style.css") return asset(STYLE_CSS, "text/css");
      if (path === "/script.js") return asset(SCRIPT_JS, "application/javascript");
      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: "Internal server error", detail: String(err && err.message) }, 500);
    }
  },
};
