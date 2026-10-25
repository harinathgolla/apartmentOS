# ---------------------------------------------------------------------------
# IAM - EC2 instance role/profile + GitHub OIDC deploy role
#
# Mirrors the roles that already exist in account 962634335384 so that a fresh
# `terraform apply` recreates the exact same access model:
#   * apartmentos-ec2-instance-role       - SSM managed core (Session Manager),
#                                           plus read-only access to the app's
#                                           SSM parameters so start.sh can pull
#                                           the DB password / JWT secret.
#   * apartmentos-github-deploy           - assumed by GitHub Actions via OIDC,
#                                           drives SSM SendCommand + S3 artifacts.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# EC2 instance role
# ---------------------------------------------------------------------------

resource "aws_iam_role" "ec2" {
  name        = local.ec2_role_name
  description = "ApartmentOS EC2 instance role (SSM Session Manager + app secrets)"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = local.ec2_role_name }
}

# Managed policy that makes the instance reachable via SSM Session Manager.
resource "aws_iam_role_policy_attachment" "ec2_ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# start.sh calls `aws ssm get-parameter` for the DB password and JWT secret.
# Scope it to the app prefix only - never *.
resource "aws_iam_role_policy" "ec2_read_app_params" {
  name = "${var.project}-read-app-params"
  role = aws_iam_role.ec2.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ReadAppParameters"
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
      ]
      Resource = [
        "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter${var.ssm_parameter_prefix}",
        "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter${var.ssm_parameter_prefix}/*",
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = local.ec2_profile_name
  role = aws_iam_role.ec2.name

  tags = { Name = local.ec2_profile_name }
}

# ---------------------------------------------------------------------------
# GitHub Actions OIDC deploy role
# ---------------------------------------------------------------------------

# Only one OIDC provider per URL is allowed per account. Create it only when
# asked (github_oidc_create_provider) or when no provider exists yet.
data "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_create_provider ? 0 : 1
  url   = "https://${local.github_oidc_host}"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_create_provider ? 1 : 0

  url             = "https://${local.github_oidc_host}"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = { Name = "github-actions-oidc" }
}

locals {
  github_oidc_provider_arn = var.github_oidc_create_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

resource "aws_iam_role" "github_deploy" {
  name        = local.github_role_name
  description = "Assumed by GitHub Actions (OIDC) to deploy ApartmentOS via SSM"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.github_oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.github_oidc_host}:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "${local.github_oidc_host}:sub" = var.github_repo_subjects
        }
      }
    }]
  })

  tags = { Name = local.github_role_name }
}

# Matches the live apartmentos-deploy-policy document (v2) exactly.
resource "aws_iam_policy" "github_deploy" {
  name        = local.deploy_policy
  description = "GitHub Actions deploy: SSM SendCommand on the app instance + S3 artifacts"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3DeployArtifacts"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
        ]
        Resource = [
          "arn:aws:s3:::${local.deploy_bucket}",
          "arn:aws:s3:::${local.deploy_bucket}/*",
          "arn:aws:s3:::${local.backups_bucket}",
          "arn:aws:s3:::${local.backups_bucket}/*",
        ]
      },
      {
        Sid    = "SsmSendCommand"
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:ListCommandInvocations",
          "ssm:DescribeInstanceInformation",
        ]
        Resource = [
          "arn:aws:ec2:${var.aws_region}:${var.aws_account_id}:instance/*",
          "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript",
          "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:*",
        ]
      },
      {
        Sid    = "ReadOnlyDescribe"
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags",
          "rds:DescribeDBInstances",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "cloudwatch:PutMetricData",
        ]
        Resource = "*"
      },
    ]
  })

  tags = { Name = local.deploy_policy }
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = aws_iam_policy.github_deploy.arn
}
