# ---------------------------------------------------------------------------
# RDS MySQL 8.4 - private, single-AZ, free-tier sizing
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db-subnets"
  description = "ApartmentOS RDS subnets (2 AZs required by RDS)"
  subnet_ids  = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = { Name = "${local.name_prefix}-db-subnets" }
}

# utf8mb4 everywhere - matches the Liquibase schema (apartment_db, utf8mb4_unicode_ci).
resource "aws_db_parameter_group" "mysql84" {
  name        = "${local.name_prefix}-mysql84-utf8mb4"
  family      = "mysql8.4"
  description = "ApartmentOS MySQL 8.4 utf8mb4 params"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  # caching_sha2_password requires TLS; keep require_secure_transport off so the
  # bootstrap `CREATE DATABASE` over the socket works, then enable at app level
  # via the JDBC URL (useSSL=true&requireSSL=true). Flip to 1 once clients are
  # all TLS-capable.
  parameter {
    name         = "require_secure_transport"
    value        = "0"
    apply_method = "pending-reboot"
  }

  tags = { Name = "${local.name_prefix}-mysql84-utf8mb4" }
}

resource "random_password" "db" {
  count = var.manage_db_password ? 1 : 0

  length           = 32
  special          = true
  override_special = "!#%*()-_=+[]{}<>?"
}

resource "aws_db_instance" "main" {
  identifier = var.db_identifier != "" ? var.db_identifier : "${local.name_prefix}-mysql"

  engine         = "mysql"
  engine_version = var.db_engine_version
  instance_class = local.effective_db_class

  allocated_storage = local.effective_db_storage
  storage_type      = var.db_storage_type
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.manage_db_password ? random_password.db[0].result : null
  # When manage_db_password = false the password is left to `manage_master_user_password`
  # style external management; in practice it already lives in SSM and is not
  # touched by Terraform. Setting password = null means Terraform will not drift.

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.mysql84.name

  publicly_accessible     = false
  multi_az                = var.db_multi_az
  backup_retention_period = var.db_backup_retention_period
  deletion_protection     = var.db_deletion_protection
  skip_final_snapshot     = var.db_skip_final_snapshot

  # Free-tier: no Performance Insights, no enhanced monitoring, no autoscaling.
  performance_insights_enabled = false
  monitoring_interval          = 0

  auto_minor_version_upgrade = true
  apply_immediately          = true

  tags = { Name = "${local.name_prefix}-mysql" }

  lifecycle {
    # If the password is externally managed we must not fight over it.
    ignore_changes = [password]
  }
}
