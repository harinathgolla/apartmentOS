output "instance_id" {
  description = "App host instance id (use this in the deploy workflow INSTANCE_ID)."
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Elastic IP attached to the app host."
  value       = aws_eip.app.public_ip
}

output "app_url" {
  description = "Base URL the backend should use for links/redirects."
  value       = local.app_frontend_url
}

output "ec2_role_arn" {
  description = "IAM role attached to the EC2 instance profile."
  value       = aws_iam_role.ec2.arn
}

output "ec2_instance_profile_name" {
  description = "Instance profile name for the app host."
  value       = aws_iam_instance_profile.ec2.name
}

output "github_deploy_role_arn" {
  description = "Role ARN GitHub Actions assumes via OIDC (deploy workflow ROLE_ARN)."
  value       = aws_iam_role.github_deploy.arn
}

output "rds_endpoint" {
  description = "RDS MySQL endpoint host:port."
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS MySQL hostname only."
  value       = aws_db_instance.main.address
}

output "ssm_db_password_name" {
  description = "SSM parameter holding the DB password."
  value       = local.ssm_db_password
}

output "ssm_jwt_secret_name" {
  description = "SSM parameter holding the JWT secret."
  value       = local.ssm_jwt_secret
}

output "backups_bucket" {
  value = aws_s3_bucket.backups.bucket
}

output "deploy_bucket" {
  value = aws_s3_bucket.deploy.bucket
}
