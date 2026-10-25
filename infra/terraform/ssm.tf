# ---------------------------------------------------------------------------
# SSM Parameter Store - application secrets
#
# The EC2 instance role reads these at deploy time (see deploy/start.sh), so
# they never have to live in the repo or in the instance user_data.
#
# NOTE: /apartmentos/dev/db/password already exists in the live account and is
#       referenced by the running instance. Terraform manages it only when
#       manage_db_password = true; otherwise it is left untouched to avoid
#       rotating a password the current RDS instance is already using.
# ---------------------------------------------------------------------------

resource "aws_ssm_parameter" "db_password" {
  count = var.manage_db_password ? 1 : 0

  name        = local.ssm_db_password
  description = "ApartmentOS RDS master password"
  type        = "SecureString"
  value       = random_password.db[0].result

  tags = { Name = local.ssm_db_password }
}

# JWT signing secret. A stable value is generated once and stored encrypted;
# start.sh falls back to a dev default if this parameter is missing, so
# creating it here removes that fallback in practice.
resource "random_password" "jwt" {
  count = var.manage_jwt_secret ? 1 : 0

  length  = 48
  special = false
}

resource "aws_ssm_parameter" "jwt_secret" {
  count = var.manage_jwt_secret ? 1 : 0

  name        = local.ssm_jwt_secret
  description = "ApartmentOS JWT signing secret"
  type        = "SecureString"
  value       = random_password.jwt[0].result

  tags = { Name = local.ssm_jwt_secret }
}
