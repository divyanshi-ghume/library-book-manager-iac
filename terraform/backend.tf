# Remote state (HCP Terraform free tier, "Local" execution mode).
# Needed so that your laptop AND GitHub Actions share ONE state file.
# Without shared state, the pipeline would try to re-create resources that
# already exist. Organisation and workspace come from environment variables:
#   TF_CLOUD_ORGANIZATION , TF_WORKSPACE
# For a purely local experiment, delete this file and Terraform will use a
# local terraform.tfstate instead (see README, "State management").
terraform {
  cloud {}
}
