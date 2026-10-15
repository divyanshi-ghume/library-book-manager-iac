# Automated Deployment of a Serverless Library Book Management Application Using Terraform-Based Infrastructure as Code

A small **Library Book Management System** whose *entire* cloud infrastructure is defined in Terraform and deployed to **Cloudflare Workers + Workers KV**, with CI/CD through **GitHub Actions**.

| Component | Technology |
|---|---|
| Infrastructure as Code | Terraform |
| Cloud platform | Cloudflare (Free plan) |
| Compute | Cloudflare Workers |
| Data storage | Cloudflare Workers KV |
| Application | HTML, CSS, JavaScript |
| API | JavaScript / Cloudflare Worker |
| Version control / Repo / CI-CD | Git, GitHub, GitHub Actions |

Do **not** create the Worker or KV namespace in the Cloudflare dashboard. Terraform creates them; the dashboard is for *viewing* only.

## Architecture

```
Student / Librarian → Browser → Cloudflare Worker ─┬─ Web interface (HTML/CSS/JS)
                                                   └─ REST API ── Workers KV (book records)

git push → GitHub → GitHub Actions → Terraform → Cloudflare Provider ─┬─ Worker
                                                                      ├─ KV namespace
                                                                      └─ Worker/KV binding (BOOKS_KV)
```

## Book record

| Field | Example |
|---|---|
| Book ID | B101 (auto-generated) |
| Title | Introduction to Algorithms |
| Author | Thomas H. Cormen |
| Category | Computer Science |
| Status | Available / Issued / Reserved |
| Created Date | ISO timestamp |

## REST API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/books` | Create book |
| GET | `/api/books` | List all books |
| GET | `/api/books/{id}` | Get one book (e.g. `/api/books/B101`) |
| PUT | `/api/books/{id}` | Update book (e.g. change status) |
| DELETE | `/api/books/{id}` | Delete book |
| GET | `/api/config` | Environment + app name (from Terraform variables) |

```json
POST /api/books
{ "title": "Clean Code", "author": "Robert C. Martin", "category": "Computer Science", "status": "Available" }
```

## Project structure

```
library-book-manager-iac/
├── terraform/
│   ├── providers.tf              # Cloudflare provider
│   ├── backend.tf                # shared remote state (see "State management")
│   ├── main.tf                   # KV namespace, Worker, binding, variables
│   ├── variables.tf
│   ├── outputs.tf
│   ├── terraform.tfvars.example
│   └── environments/             # dev / test / production (bonus)
├── application/
│   ├── worker.js                 # REST API + serves the UI
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .github/workflows/deploy.yml
├── docs/report_answers.md
├── screenshots/
├── .gitignore
└── README.md
```

How the frontend ships: `worker.js` contains three placeholders; `main.tf` replaces them with `index.html`, `style.css` and `script.js` (`file()` + `jsonencode()`), so one Worker serves both the UI and the API. Edit the application files and run `terraform apply`; the Worker is re-uploaded.

## Prerequisites

Git, a GitHub account, a Cloudflare account (Free plan), Terraform >= 1.6, VS Code, and basic HTML/JS/REST/CLI knowledge.

## Step-by-step

### 1–3. Accounts and tools
```bash
terraform --version      # screenshot
git --version
```
Open Cloudflare Dashboard → Workers & Pages once (this also creates your `workers.dev` subdomain; note it).

### 5. Cloudflare API token
Dashboard → My Profile → API Tokens → Create Token → Custom token, with:
- Account → **Workers Scripts** → Edit
- Account → **Workers KV Storage** → Edit

Copy your **Account ID** (Workers & Pages overview). Never put either value in `.tf` files.

```bash
# Linux / macOS
export CLOUDFLARE_API_TOKEN="your-token"
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN = "your-token"
```

### State management (important)
Terraform maps your code to real resources through its **state**. Because you will run Terraform from your laptop *and* from GitHub Actions, both must share one state, otherwise the pipeline would try to create resources that already exist. This project uses the free tier of HCP Terraform purely as a remote state store:

1. Create a free account at app.terraform.io, then an organization.
2. Create a workspace (CLI-driven) and set **Settings → General → Execution Mode = Local**.
3. Run `terraform login`, and set:
   ```bash
   export TF_CLOUD_ORGANIZATION="your-org"
   export TF_WORKSPACE="library-book-manager-dev"
   ```

For a quick local-only experiment, delete `terraform/backend.tf`; Terraform will then keep a local `terraform.tfstate` (git-ignored). Do not mix both approaches for the same resources.

### 6–11. Terraform configuration
Already written; read each file and be able to explain it:
`providers.tf` (provider), `variables.tf` (inputs), `main.tf` (resources), `outputs.tf` (outputs).

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # fill in account_id, workers_subdomain
```

### 12–17. Lifecycle commands
```bash
terraform init        # downloads the Cloudflare provider        → screenshot
terraform fmt         # standard formatting
terraform validate    # "Success! The configuration is valid."    → screenshot
terraform plan        # expect: + KV namespace, + Worker, + subdomain → screenshot, highlight "+"
terraform apply       # type "yes" → "Apply complete!"            → screenshot
terraform output      # Worker name, KV namespace ID, application URL
```
Verify in the dashboard: Workers & Pages → `library-book-manager` (Bindings → `BOOKS_KV`), and Storage & Databases → KV → `library_books`.

### 18–19. Test the application
Open `application_url`. Test cases:

| # | Test | Expected |
|---|---|---|
| 1 | Create book | "Book successfully added" |
| 2 | Read book list / `GET /api/books/B101` | Created book is shown |
| 3 | Update status Available → Issued | "Book successfully updated" |
| 4 | Delete book | "Book successfully removed" |

```bash
URL=https://library-book-manager.<subdomain>.workers.dev
curl -X POST $URL/api/books -H "Content-Type: application/json" \
  -d '{"title":"Clean Code","author":"Robert C. Martin","category":"Computer Science","status":"Available"}'
curl $URL/api/books
curl -X PUT $URL/api/books/B101 -H "Content-Type: application/json" -d '{"status":"Issued"}'
curl -X DELETE $URL/api/books/B101
```

### 20. Examine state
```bash
terraform show
```

### 21. Modify infrastructure
Change e.g. `environment = "test"` or `app_name` in `terraform.tfvars`, then `terraform plan` (observe `~` update in place) and `terraform apply`. Reload the page: the environment badge changes. Do not edit these resources in the dashboard (that causes drift).

### 22–23. Git and secrets
```bash
git init && git add . && git commit -m "Initial IaC project"
git remote add origin https://github.com/<you>/library-book-manager-iac.git
git branch -M main && git push -u origin main
```
Suggested commit history: *Initial Terraform configuration → Added KV namespace → Added Worker → Added Worker KV binding → Added CRUD API → Added GitHub Actions → Updated application*.
`.gitignore` already excludes `*.tfstate`, `.terraform/`, `terraform.tfvars`, and `.env`.

### 24. GitHub Secrets
Repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | your Cloudflare token |
| `CLOUDFLARE_ACCOUNT_ID` | your account ID |
| `TF_API_TOKEN` | HCP Terraform user/team token |
| `TF_CLOUD_ORGANIZATION` | your HCP organization |
| `TF_WORKSPACE` | your workspace name |

### 25–26. CI/CD
`.github/workflows/deploy.yml` runs: checkout → install Terraform → `fmt -check` → `init` → `validate` → `plan` → `apply` (apply only on pushes to `main`; pull requests stop after plan).

Trigger it: change the `<h1>` in `application/index.html` to `Cloud-Based Library Book Manager`, then
```bash
git add . && git commit -m "Update application title" && git push
```
Screenshot the successful GitHub Actions run, then refresh the live site.

### 27–29. Destroy and recreate
```bash
terraform plan -destroy
terraform destroy        # "Destroy complete!"                       → screenshot
# verify in dashboard: Worker and KV namespace are gone
terraform plan
terraform apply          # whole environment recreated from code      → screenshot
```
Note: destroying the KV namespace deletes its books, so the recreated app starts empty. This is expected.

## Multiple environments (bonus)
```bash
export TF_WORKSPACE="library-book-manager-test"   # separate state per environment
terraform init
terraform apply -var-file=environments/test.tfvars
```
The same code produces `library-book-manager-dev`, `-test` and `-prod` Workers with their own KV namespaces.

## Mandatory IaC demonstration checklist
1 Show Terraform code · 2 `validate` · 3 `plan` · 4 Explain plan · 5 `apply` · 6 Worker created · 7 KV created · 8 Open app · 9 Add book · 10 Retrieve · 11 Update · 12 Delete · 13 Modify config · 14 `plan` again · 15 Explain diff · 16 Apply · 17 Show GitHub repo · 18 Show Actions · 19 `destroy` · 20 Recreate.

## Screenshots to collect (`screenshots/`)
Terraform version, `init`, `validate`, `plan` (resources highlighted), `apply`, Cloudflare Worker, Workers KV, working app, create / update / delete operations, GitHub repository, GitHub Actions run, `destroy`, recreation.

## Suggested report structure
Ch 1 Introduction · Ch 2 Background of Cloud Computing and IaC · Ch 3 Problem Statement · Ch 4 Proposed Architecture · Ch 5 Technologies Used · Ch 6 Terraform Configuration · Ch 7 Application Implementation · Ch 8 CI/CD Implementation · Ch 9 Testing and Results · Ch 10 Conclusion and Future Scope. Answers to the required report and viva questions are in `docs/report_answers.md`.

## Design notes and limitations
- Book IDs come from a KV counter. KV is eventually consistent and has no transactions, so two simultaneous adds could in rare cases collide. Acceptable for a mini project; Durable Objects or D1 would fix it.
- KV list/read results can take up to ~60 s to propagate across Cloudflare locations; the UI updates its own list instantly after each action.
- Free plan: 100,000 Worker requests/day.
