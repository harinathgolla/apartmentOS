# ApartmentOS infrastructure

Everything needed to (re)create the AWS footprint and the runtime scripts the
EC2 host uses. Both the Terraform modules and the deploy scripts are versioned
here so provisioning is reproducible instead of hand-run in the console.

```
infra/
├── terraform/          # VPC, subnets, SGs, RDS, S3, IAM, EC2, SSM params
│   ├── providers.tf
│   ├── versions.tf
│   ├── variables.tf
│   ├── locals.tf
│   ├── network.tf      # VPC, public/private subnets, SGs
│   ├── rds.tf          # MySQL 8.4, private, utf8mb4, TLS
│   ├── s3.tf           # backups + deploy artifact buckets
│   ├── iam.tf          # EC2 instance role/profile + GitHub OIDC deploy role
│   ├── ssm.tf          # DB password / JWT secret in Parameter Store
│   ├── ec2.tf          # t4g.small ARM64 host + Elastic IP
│   ├── outputs.tf
│   └── templates/
│       └── user_data.sh.tftpl   # bootstraps Docker + deploy scripts
└── deploy/             # exact files placed at /opt/apartmentos on the host
    ├── start.sh        # pull images for an IMAGE_TAG, recreate, health-gate
    ├── docker-compose.yml  # backend + frontend + nginx (GHCR images)
    └── nginx.conf      # /api, /oauth2, /login/oauth2, /actuator, / -> frontend
```

## How the pieces fit

1. `terraform apply` builds the VPC, security groups, RDS, S3 buckets, the EC2
   instance role (SSM core + read access to `/apartmentos/dev/*` parameters),
   the GitHub OIDC deploy role, and the EC2 host itself.
2. `user_data` installs Docker/Compose and copies `deploy/*` into
   `/opt/apartmentos`, then does a first-boot `start.sh latest`.
3. GitHub Actions (`build-push.yml`) builds ARM64 images to GHCR.
4. GitHub Actions (`deploy.yml`) assumes the OIDC role and calls
   `ssm send-command` to run `bash /opt/apartmentos/start.sh <sha>` on the host.
   `start.sh` pulls that immutable tag, recreates the stack, and fails the
   deploy if the backend health check or the nginx frontend check does not pass.

## First run

```bash
cd infra/terraform
terraform init
terraform plan  -out tfplan
terraform apply tfplan
```

Then copy the outputs into the GitHub workflow env if anything changed:

| output | goes into |
| --- | --- |
| `github_deploy_role_arn` | `deploy.yml` → `ROLE_ARN` |
| `instance_id` | `deploy.yml` → `INSTANCE_ID` |
| `public_ip` / `app_url` | DNS, `APP_FRONTEND_URL` |

## Status of the live account (read this first)

This stack was written **after** the dev environment already existed, and the
live resources were created by hand. It is therefore a **reference / greenfield
provisioning implementation, not the manager of the live account.**

Running `terraform apply` against the live account would create a *second*
VPC / RDS / IAM / bucket set alongside the real ones. Do not do it.

A trial import of `aws_instance.app` was performed and then rolled back
(`terraform state rm aws_instance.app`); state is now empty. Nothing in AWS was
created, changed, or destroyed.

### If you ever want Terraform to own the live account

You must import every existing resource first, otherwise the plan shows them as
`to add`. Import the instance with:

```bash
terraform import aws_instance.app i-0e88fcb85356bc5f2
```

and import the VPC, subnets, route tables, security groups, RDS instance and
parameter/subnet groups, S3 buckets and their sub-resources, IAM roles,
policies and instance profile, and the SSM parameter. Then get the plan to
zero changes before trusting it.

### Live resources this code describes

| what | live value |
| --- | --- |
| EC2 instance | `i-0e88fcb85356bc5f2`, `t4g.small`, AZ `ap-south-2a`, AMI `ami-095ef26692f084edc` |
| RDS | identifier `apartmentos-mysql`, MySQL `8.4.11`, `db.t4g.micro` |
| S3 | `apartmentos-backups-962634335384`, `apartmentos-deploy-962634335384` |
| IAM | `apartmentos-ec2-instance-role`, `apartmentos-ec2-instance-profile`, `apartmentos-github-deploy`, `apartmentos-deploy-policy` |
| SSM | `/apartmentos/dev/db/password` (JWT secret not created yet) |
| Elastic IP | **none** — the instance uses its auto-assigned public IP |

Note the live account has **no Elastic IP**. `ec2.tf` declares one, so a
fresh greenfield deploy would get a stable IP the current hand-made host does
not have.

## Secrets

No secrets are stored in this repo. The RDS password and JWT secret live in
SSM Parameter Store under `/apartmentos/dev/…` and are read at deploy time by
`start.sh` using the instance role. `infra/.gitignore` excludes state, plans,
and the transient SSM helper files.

## Notes / gotchas

- GHCR packages must be set to **Public** in GitHub → profile → Packages, or
  the host cannot pull images anonymously.
- RDS uses `caching_sha2_password`; connections must be TLS
  (`useSSL=true&requireSSL=true`), which `start.sh` already sets in the JDBC URL.
- Only one GitHub OIDC provider is allowed per AWS account. Set
  `github_oidc_create_provider = false` to reuse the existing one.
