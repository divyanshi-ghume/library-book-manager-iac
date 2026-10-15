variable "account_id" {
  description = "Cloudflare Account ID (set via TF_VAR_account_id or terraform.tfvars)."
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker."
  type        = string
  default     = "library-book-manager"
}

variable "kv_namespace_name" {
  description = "Title of the Workers KV namespace that stores book records."
  type        = string
  default     = "library_books"
}

variable "environment" {
  description = "Deployment environment: dev, test or production."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "production"], var.environment)
    error_message = "environment must be one of: dev, test, production."
  }
}

variable "app_name" {
  description = "Application display name passed to the Worker as an environment variable."
  type        = string
  default     = "Library Book Management System"
}

variable "compatibility_date" {
  description = "Cloudflare Workers runtime compatibility date."
  type        = string
  default     = "2025-01-01"
}

variable "workers_subdomain" {
  description = "Your account's workers.dev subdomain (Dashboard > Workers & Pages). Only used to print the URL."
  type        = string
  default     = ""
}
