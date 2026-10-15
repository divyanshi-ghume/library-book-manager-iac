# Official Cloudflare provider. Terraform needs a provider plugin to know how to
# talk to a platform's API. The API token is NOT written here: the provider reads
# it from the CLOUDFLARE_API_TOKEN environment variable (or GitHub Secret in CI).
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  # api_token  -> taken from env var CLOUDFLARE_API_TOKEN
}
