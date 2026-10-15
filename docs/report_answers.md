# Report and Viva Answers (Library Book Management project)

**What is Infrastructure as Code?** Defining and managing infrastructure (Workers, KV namespaces, bindings, settings) in machine-readable files that can be versioned, reviewed and executed, instead of clicking through a dashboard.

**What problem does IaC solve?** Manual setup is hard to reproduce, error-prone, untracked, inconsistent across teams, hard to rebuild after failure, and slow to destroy/recreate. IaC makes environments repeatable and version-controlled.

**Why is Terraform declarative?** You describe the *desired end state* (a Worker bound to a KV namespace); Terraform works out the steps needed to reach it from the current state.

**Provider?** A plugin that lets Terraform talk to a platform's API. Here: `cloudflare/cloudflare`.

**Resource?** A single infrastructure object Terraform manages, e.g. `cloudflare_workers_kv_namespace.library_books` and `cloudflare_workers_script.library_worker`.

**Variable?** An input parameter (`account_id`, `worker_name`, `kv_namespace_name`, `environment`) that avoids hard-coding and makes the configuration reusable.

**Output?** A value Terraform prints after apply (Worker name, KV namespace ID, application URL).

**State?** A record mapping declared resources to real Cloudflare objects and their attributes. Terraform uses it to compute what must change.

**terraform init?** Prepares the working directory: downloads the Cloudflare provider, configures the backend.

**terraform plan?** Compares configuration with state and real infrastructure and shows proposed changes (`+` create, `~` modify, `-` destroy) without changing anything.

**terraform apply?** Executes the plan: creates/updates/destroys resources and updates state.

**terraform destroy?** Removes every resource managed by the configuration (Worker, KV namespace, binding), including the stored data.

**Why not modify managed resources manually?** Manual edits cause drift; the next plan will show unexpected differences or overwrite the manual change, and state and reality diverge.

**Why not store API tokens in Terraform code?** Source code is shared and versioned; a committed token is exposed in Git history and can be abused. Use environment variables or GitHub Secrets.

**What is a KV database?** A key-value store: data is saved and retrieved by a unique key (`book:B101` → JSON book record). Workers KV is globally distributed and eventually consistent.

**Why serverless?** No servers to manage or pay for, automatic scaling, global edge deployment, and the Free plan suffices for a mini project.

**What is CI/CD?** Continuous Integration / Continuous Delivery: automatically validating and deploying every change pushed to the repository.

**Role of GitHub Actions?** On `git push` it checks out the code, installs Terraform, runs init/validate/plan/apply using GitHub Secrets, and deploys the update to Cloudflare.

**How can Terraform recreate infrastructure after deletion?** All infrastructure is declared in code, so `terraform plan` + `apply` rebuild everything without manual steps.

**What is infrastructure drift?** When real infrastructure differs from what Terraform code/state describe, usually due to manual changes.

## Viva quick answers
Q1 IaC = managing infrastructure via config files. Q2 Terraform. Q3 Cloudflare. Q4 Cloudflare Workers. Q5 Cloudflare Workers KV. Q6–Q10 init / plan / apply / destroy / state as above. Q11 Drift = reality differs from code. Q12 Terraform detects it on the next plan and reconciles it back to the declared configuration. Q13 Variables make code reusable and remove hard-coded values. Q14 Modules package reusable infrastructure components (e.g. `modules/worker`, `modules/kv`). Q15 Git gives history, collaboration, audit, rollback and change tracking for infrastructure.
