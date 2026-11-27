# Deployment

How code gets from a `git push` to https://&lt;hospital&gt;.app.&lt;domain&gt;.

```
git push (main)
   │
   ▼
GitHub Actions ── build-and-push ──► ECR (private) and/or Docker Hub   (9 images, tags: latest + commit id)
   │
   └─ deploy ── AWS login (OIDC, no keys) ──► Systems Manager ──► EC2 server
                                                   runs: git pull + scripts/deploy.sh <commit id>
                                                         = docker compose pull + up -d
```

Nobody SSHes in. No AWS keys or `.pem` are stored in GitHub.

## Pieces

| File | What it does |
|---|---|
| `.github/workflows/docker-publish.yml` | Builds the images (part A), then tells the server to update (part B) |
| `scripts/deploy.sh` | Runs on the server: pull images, restart, wait for Keycloak, allow tenant addresses |
| `scripts/keycloak-tenant-urls.sh` | Adds `https://<realm>.{app,admin,patient}.<domain>` to every realm's login client |
| `docker-compose.prod.yml` | Server-only additions: Caddy, `image:` instead of `build:`, restart policies |
| `caddy/Caddyfile` | HTTPS + routing by hostname; tenant certificates on first visit |
| `deploy/aws/github-deploy.yml` | One-time AWS setup (CloudFormation): GitHub deploy role + server role |

## Server `.env` (in `~/app`, never committed)

```
DOMAIN=kapse.online
DOCKERHUB_USERNAME=<docker hub user>
KEYCLOAK_ADMIN_PASSWORD=<strong password>
```

## One-time AWS setup

1. **CloudFormation → Create stack → Upload a template file** → `deploy/aws/github-deploy.yml`.
   Stack name `github-deploy`. Fill `InstanceId`. Tick *"I acknowledge that AWS CloudFormation might create IAM resources with custom names"* → Submit.
   When it shows `CREATE_COMPLETE`, open **Outputs** and copy `DeployRoleArn`.
2. **EC2 → the instance → Actions → Security → Modify IAM role** → `multi-tenant-server` → Update.
3. **GitHub repo → Settings → Secrets and variables → Actions → Variables**:
   | Name | Value |
   |---|---|
   | `AWS_DEPLOY_ROLE_ARN` | the `DeployRoleArn` output |
   | `AWS_REGION` | `ap-southeast-2` |
   | `EC2_INSTANCE_ID` | the instance id |
4. Check: **Systems Manager → Fleet Manager** lists the instance as *Online*
   (can take a few minutes; if not, restart the agent once: `sudo snap restart amazon-ssm-agent`).
5. Check: **EC2 → instance → Connect → Session Manager → Connect** opens a terminal.
   Once that works, delete the port 22 rule from the security group — SSH is no longer needed.

## Images: private AWS registry (ECR)

The images can be stored in **Amazon ECR** (private, in our AWS account, access by IAM role
-- no registry password) instead of Docker Hub. `deploy/aws/github-deploy.yml` creates the 9
repositories (`kaycare/<image>`), the role GitHub uses to push (`github-ecr-push`) and lets
the server pull. Switching over:

1. Update the CloudFormation stack with the new file (Outputs show the two values below).
2. GitHub -> Settings -> Variables: `AWS_ECR_PUSH_ROLE_ARN` = output `EcrPushRoleArn`.
   From the next push, every image is pushed to **both** ECR and Docker Hub.
3. On the server, add to `~/app/.env`: `IMAGE_PREFIX` = output `ImagePrefix`
   (`<account>.dkr.ecr.<region>.amazonaws.com/kaycare`), then `bash scripts/deploy.sh`.
   `deploy.sh` logs in to ECR with the server's role. Remove `IMAGE_PREFIX` to go back to Docker Hub.

## Secrets: never the ones from the repo

The repo is public, so the test users (`admin-a/admin123`, ...), the `platform-backend`
client secrets and the Keycloak admin password (`admin`) are known to everyone.
After the first deploy, and whenever a secret may have leaked, run on the server:

```
cd ~/app && bash scripts/rotate-secrets.sh
```

It sets new random passwords (test users must choose their own at first login),
regenerates the client secrets, updates `.env`, restarts the services that use them,
and writes the new values only to `~/credentials.txt` (mode 600). Nothing is printed.

## Two kinds of admin

| | Platform admin | Hospital admin (admin-a, admin-b, ...) |
|---|---|---|
| Signs in at | `https://platform.admin.<domain>` | `https://<hospital>.admin.<domain>` |
| Keycloak realm | `platform` | the hospital's realm |
| Create / list / deactivate hospitals | yes | no (API returns 403) |
| Hospital staff, patients, claims | no | own hospital only |

A platform admin = role `super-admin` **issued by the `platform` realm**
(`platform-core/.../security/PlatformAccess.java`). The same role created inside a
hospital realm is ignored, so a hospital admin cannot promote themselves.
`master` and `platform` cannot be used as hospital names.

Create the first platform admin once (random temporary password into `~/credentials.txt`):

```
cd ~/app && bash scripts/create-platform-admin.sh
```

## Everyday use

- **Deploy:** push to `main`. Watch it in the repo's **Actions** tab.
- **Manual re-deploy:** Actions → *Build and deploy* → **Run workflow**.
- **Rollback:** on the server (Session Manager): `cd ~/app && bash scripts/deploy.sh <older commit id>`.
- **New hospital:** create its realm; the next deploy (or `bash scripts/keycloak-tenant-urls.sh`) allows its addresses. Its certificate is issued on the first visit.
- **Server terminal:** EC2 → Connect → Session Manager (then `sudo -iu ubuntu` and `cd ~/app`).
