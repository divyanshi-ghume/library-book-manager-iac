# ---------------------------------------------------------------------------
# 1. Workers KV namespace  (database for book records)
# ---------------------------------------------------------------------------
resource "cloudflare_workers_kv_namespace" "library_books" {
  account_id = var.account_id
  title      = var.kv_namespace_name
}

# ---------------------------------------------------------------------------
# 2. Build the Worker source.
#    worker.js contains three placeholders. Terraform injects the frontend files
#    (index.html, style.css, script.js) as JSON-encoded strings, so ONE Worker
#    serves both the web interface and the REST API.
# ---------------------------------------------------------------------------
locals {
  app_dir = "${path.module}/../application"

  worker_source = replace(
    replace(
      replace(
        file("${local.app_dir}/worker.js"),
        "\"__INDEX_HTML__\"", jsonencode(file("${local.app_dir}/index.html"))
      ),
      "\"__STYLE_CSS__\"", jsonencode(file("${local.app_dir}/style.css"))
    ),
    "\"__SCRIPT_JS__\"", jsonencode(file("${local.app_dir}/script.js"))
  )
}

# ---------------------------------------------------------------------------
# 3. Cloudflare Worker  +  4. Worker/KV binding  +  5. Configuration variables
# ---------------------------------------------------------------------------
resource "cloudflare_workers_script" "library_worker" {
  account_id         = var.account_id
  script_name        = var.worker_name
  content            = local.worker_source
  main_module        = "worker.js"
  compatibility_date = var.compatibility_date

  bindings = [
    {
      # Worker/KV binding: available in code as env.BOOKS_KV
      name         = "BOOKS_KV"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.library_books.id
    },
    {
      name = "ENVIRONMENT"
      type = "plain_text"
      text = var.environment
    },
    {
      name = "APP_NAME"
      type = "plain_text"
      text = var.app_name
    }
  ]
}

# Publish the Worker on <worker>.<account-subdomain>.workers.dev
resource "cloudflare_workers_script_subdomain" "library_worker" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.library_worker.script_name
  enabled     = true
}
