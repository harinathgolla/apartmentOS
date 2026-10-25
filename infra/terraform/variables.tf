# ---------------------------------------------------------------------------
# Core / naming
# ---------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for all ApartmentOS resources."
  type        = string
  default     = "ap-south-2" # Hyderabad
}

variable "aws_account_id" {
  description = "AWS account id. Used only for constructing ARNs; no resources are created in other accounts."
  type        = string
  default     = "962634335384"
}

variable "project" {
  description = "Short project slug used in resource names."
  type        = string
  default     = "apartmentos"
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod)."
  type        = string
  default     = "dev"
}

# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR for the single public subnet (EC2 lives here; it needs egress)."
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_a_cidr" {
  description = "CIDR for private subnet A (RDS subnet group member)."
  type        = string
  default     = "10.0.2.0/24"
}

variable "private_subnet_b_cidr" {
  description = "CIDR for private subnet B (RDS subnet group member; RDS requires 2 AZs)."
  type        = string
  default     = "10.0.3.0/24"
}

variable "private_subnet_b_az_index" {
  description = "Index into the region's AZ list for private subnet B. RDS needs two distinct AZs; index 1 is the second AZ."
  type        = number
  default     = 1
}

# ---------------------------------------------------------------------------
# EC2
# ---------------------------------------------------------------------------

variable "instance_type" {
  description = <<-EOT
    EC2 instance type. DEFAULT t4g.small (2 GB ARM) matches the currently
    deployed instance and comfortably runs Spring Boot + Next.js.

    FREE-TIER NOTE: t4g.small is covered by the 750 h/month *trial* credit,
    NOT the 12-month perpetual free tier. Set `free_tier_strict = true` (or
    override this to t4g.micro / t3.micro) if you need $0 after the trial.
    On 1 GB the JVM + Next.js will swap - see ARCHITECTURE.md risk #1.
  EOT
  type        = string
  default     = "t4g.small"
}

variable "free_tier_strict" {
  description = "When true, ignore instance_type/instance_class and force the 12-month-perpetual free classes (t4g.micro + db.t4g.micro, 20 GB)."
  type        = bool
  default     = false
}

variable "ec2_root_volume_gb" {
  description = "Root EBS volume size in GB. 30 GB gp3 is free for 12 months."
  type        = number
  default     = 30
}

variable "ec2_root_volume_type" {
  description = "Root EBS volume type. gp3 is in the 12-month free allotment (30 GB)."
  type        = string
  default     = "gp3"
}

variable "ec2_ami_id" {
  description = <<-EOT
    Explicit AMI id for the app host. Defaults to the AMI the live instance
    (i-0e88fcb85356bc5f2) was actually launched from, so the code describes
    reality. Set to "" to auto-select the latest Amazon Linux 2023 ARM64 AMI.
  EOT
  type        = string
  default     = "ami-095ef26692f084edc"
}

variable "key_pair_name" {
  description = <<-EOT
    Name of an existing EC2 key pair to attach. SSH (port 22) is NOT opened by
    this stack - access is via SSM Session Manager. Set to "" to launch with no
    key pair at all (recommended).
  EOT
  type        = string
  default     = ""
}

variable "ssh_ingress_cidrs" {
  description = "CIDRs allowed to reach port 22. Empty list = no SSH ingress (SSM only). Do not put 0.0.0.0/0 here."
  type        = list(string)
  default     = []
}

# ---------------------------------------------------------------------------
# RDS
# ---------------------------------------------------------------------------

variable "db_identifier" {
  description = <<-EOT
    RDS instance identifier. Defaults to the live instance name
    (apartmentos-mysql) rather than the name_prefix-derived name, so the code
    matches the account. For a brand-new environment leave empty to use
    "<project>-<environment>-mysql".
  EOT
  type        = string
  default     = "apartmentos-mysql"
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is free for 12 months (single-AZ, <=20 GB)."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "MySQL engine version. 8.4.11 is confirmed available in ap-south-2."
  type        = string
  default     = "8.4.11"
}

variable "db_name" {
  description = "Initial database name created by RDS."
  type        = string
  default     = "apartment_db"
}

variable "db_username" {
  description = "RDS master username."
  type        = string
  default     = "apartment"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB. Keep <= 20 for the free tier."
  type        = number
  default     = 20
}

variable "db_storage_type" {
  description = "Storage type. gp2 is what the free-tier 20 GB allotment covers; gp3 is billed differently."
  type        = string
  default     = "gp2"
}

variable "db_backup_retention_period" {
  description = <<-EOT
    Automated backup retention in days. 0 disables automated backups, which is
    what keeps this RDS instance free-tier eligible. Set >0 only if you accept
    the backup storage charge.
  EOT
  type        = number
  default     = 0
}

variable "db_deletion_protection" {
  description = "Enable RDS deletion protection. Off for dev so `terraform destroy` works."
  type        = bool
  default     = false
}

variable "db_skip_final_snapshot" {
  description = "Skip the final snapshot on destroy. Must be true when deletion_protection is false, or destroy fails."
  type        = bool
  default     = true
}

variable "db_multi_az" {
  description = "Multi-AZ. MUST stay false for free tier."
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Secrets (SSM Parameter Store - free tier)
# ---------------------------------------------------------------------------

variable "ssm_parameter_prefix" {
  description = "SSM Parameter Store path prefix for application secrets."
  type        = string
  default     = "/apartmentos/dev"
}

variable "manage_jwt_secret" {
  description = "Generate and store the JWT signing secret in SSM SecureString. Set false if it already exists and must not be rotated."
  type        = bool
  default     = true
}

variable "manage_db_password" {
  description = "Let Terraform generate and store the RDS master password in SSM SecureString. Set false if the password already exists in SSM and must not be rotated."
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Container images (GHCR - no ECR to avoid storage/egress charges)
# ---------------------------------------------------------------------------

variable "ghcr_owner" {
  description = "GitHub user/org that owns the GHCR packages."
  type        = string
  default     = "harinathgolla"
}

variable "image_tag" {
  description = "Default image tag written into the instance .env. CI overrides per deploy."
  type        = string
  default     = "latest"
}

variable "app_frontend_url" {
  description = "Public base URL the backend uses for links/redirects. Leave empty to derive from the Elastic IP."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# GitHub OIDC
# ---------------------------------------------------------------------------

variable "github_oidc_create_provider" {
  description = "Create the GitHub OIDC provider. Set false if the account already has one (only one per account is allowed)."
  type        = bool
  default     = false
}

variable "github_repo_subjects" {
  description = "Allowed token.actions.githubusercontent.com:sub values for the deploy role."
  type        = list(string)
  default = [
    "repo:harinathgolla@*/apartmentOS*",
    "repo:harinathgolla@*/apartmentos*",
  ]
}

# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------

variable "extra_tags" {
  description = "Additional tags merged into every resource."
  type        = map(string)
  default     = {}
}
