output "worker_name" {
  description = "Deployed Worker name."
  value       = cloudflare_workers_script.library_worker.script_name
}

output "kv_namespace_id" {
  description = "ID of the Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.library_books.id
}

output "kv_namespace_title" {
  description = "Title of the Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.library_books.title
}

output "environment" {
  description = "Deployment environment."
  value       = var.environment
}

output "application_url" {
  description = "Public URL of the Library Book Manager."
  value       = var.workers_subdomain != "" ? "https://${var.worker_name}.${var.workers_subdomain}.workers.dev" : "https://${var.worker_name}.<your-account-subdomain>.workers.dev"
}
