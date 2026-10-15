const API = "/api/books";
let books = [];

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STATUSES = ["Available", "Issued", "Reserved"];

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(message, isError = false) {
  const t = $("toast");
  t.textContent = message;
  t.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 2600);
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const f = $("filter").value;
  const visible = books.filter(
    (b) => (!f || b.status === f) && (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
  );

  $("rows").innerHTML = visible
    .map(
      (b) => `<tr>
        <td><b>${esc(b.id)}</b></td>
        <td>${esc(b.title)}</td>
        <td>${esc(b.author)}</td>
        <td>${esc(b.category)}</td>
        <td><span class="pill ${esc(b.status)}">${esc(b.status)}</span><br />
          <select data-action="status" data-id="${esc(b.id)}" aria-label="Change status of ${esc(b.id)}">
            ${STATUSES.map((s) => `<option${s === b.status ? " selected" : ""}>${s}</option>`).join("")}
          </select></td>
        <td>${new Date(b.createdAt).toLocaleDateString()}</td>
        <td><button class="danger" data-action="delete" data-id="${esc(b.id)}">Delete</button></td>
      </tr>`
    )
    .join("");
  $("empty").hidden = visible.length > 0;

  const count = (s) => books.filter((b) => b.status === s).length;
  $("stats").innerHTML = [
    ["Total books", books.length],
    ["Available", count("Available")],
    ["Issued", count("Issued")],
    ["Reserved", count("Reserved")],
  ]
    .map(([label, n]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`)
    .join("");
}

async function loadBooks() {
  try {
    books = (await api(API)).books;
    render();
  } catch (e) {
    toast(e.message, true);
  }
}

$("bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const { book, message } = await api(API, {
      method: "POST",
      body: JSON.stringify({
        title: $("title").value,
        author: $("author").value,
        category: $("category").value,
        status: $("status").value,
      }),
    });
    books.push(book);
    e.target.reset();
    render();
    toast(message);
  } catch (err) {
    toast(err.message, true);
  }
});

$("rows").addEventListener("change", async (e) => {
  if (e.target.dataset.action !== "status") return;
  try {
    const { book, message } = await api(`${API}/${e.target.dataset.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: e.target.value }),
    });
    books = books.map((b) => (b.id === book.id ? book : b));
    render();
    toast(message);
  } catch (err) {
    toast(err.message, true);
    loadBooks();
  }
});

$("rows").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action='delete']");
  if (!btn) return;
  if (!confirm(`Delete book ${btn.dataset.id}?`)) return;
  try {
    const { message, id } = await api(`${API}/${btn.dataset.id}`, { method: "DELETE" });
    books = books.filter((b) => b.id !== id);
    render();
    toast(message);
  } catch (err) {
    toast(err.message, true);
  }
});

$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);

(async function init() {
  try {
    const cfg = await api("/api/config");
    $("envBadge").textContent = cfg.environment;
    $("subtitle").textContent = cfg.appName;
  } catch (_) {}
  loadBooks();
})();
