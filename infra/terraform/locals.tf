locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = merge(
    {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Repo        = "github.com/harinathgolla/apartmentOS"
    },
    var.extra_tags,
  )

  # ---- effective sizing (free_tier_strict overrides) ----------------------
  effective_instance_type = var.free_tier_strict ? "t4g.micro" : var.instance_type
  effective_db_class      = var.free_tier_strict ? "db.t4g.micro" : var.db_instance_class
  effective_db_storage    = var.free_tier_strict ? min(var.db_allocated_storage, 20) : var.db_allocated_storage

  # ---- bucket names (account-suffixed, globally unique) --------------------
  backups_bucket = "${var.project}-backups-${var.aws_account_id}"
  deploy_bucket  = "${var.project}-deploy-${var.aws_account_id}"

  # ---- IAM names ----------------------------------------------------------
  ec2_role_name       = "${var.project}-ec2-instance-role"
  ec2_profile_name    = "${var.project}-ec2-instance-profile"
  github_role_name    = "${var.project}-github-deploy"
  operator_policy     = "${var.project}-operator-policy"
  deploy_policy       = "${var.project}-deploy-policy"
  github_oidc_host    = "token.actions.githubusercontent.com"
  github_oidc_arn_fmt = "arn:aws:iam::${var.aws_account_id}:oidc-provider/${local.github_oidc_host}"

  # ---- SSM parameter paths ------------------------------------------------
  ssm_db_password = "${var.ssm_parameter_prefix}/db/password"
  ssm_jwt_secret  = "${var.ssm_parameter_prefix}/jwt/secret"

  # ---- app directory on the instance --------------------------------------
  app_dir = "/opt/${var.project}"

  # ---- public URL (used by the backend for links/redirects) ---------------
  app_frontend_url = var.app_frontend_url != "" ? var.app_frontend_url : "http://${aws_eip.app.public_ip}"
}
