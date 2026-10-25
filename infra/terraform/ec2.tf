# ---------------------------------------------------------------------------
# EC2 - single ARM64 app host
#
# The currently running instance (i-0e88fcb85356bc5f2) was launched by hand.
# This resource captures the same shape so the stack can be recreated from
# code: t4g.small, Amazon Linux 2023 ARM64, public subnet, Elastic IP, the
# ec2 security group from network.tf, and the SSM instance profile from iam.tf.
#
# Bootstrap (user_data) installs Docker + Compose and lays down the deploy
# scripts from infra/deploy/. After that, deploys are driven purely by the
# GitHub Actions -> SSM path, so the files can be updated by re-running
# `terraform apply -replace=aws_instance.app` (or by editing them in place).
# ---------------------------------------------------------------------------

data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = { Name = "${local.name_prefix}-app-eip" }
}

resource "aws_instance" "app" {
  ami                    = var.ec2_ami_id != "" ? var.ec2_ami_id : data.aws_ami.al2023_arm64.id
  instance_type          = local.effective_instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.key_pair_name != "" ? var.key_pair_name : null

  # IMDSv2 only - the instance role credentials must never be reachable over v1.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = var.ec2_root_volume_type
    volume_size           = var.ec2_root_volume_gb
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    app_dir      = local.app_dir
    aws_region   = var.aws_region
    ssm_prefix   = var.ssm_parameter_prefix
    image_tag    = var.image_tag
    frontend_url = var.app_frontend_url
    db_endpoint  = aws_db_instance.main.address
    db_name      = var.db_name
    db_username  = var.db_username
    start_sh     = file("${path.module}/../deploy/start.sh")
    compose_yml  = file("${path.module}/../deploy/docker-compose.yml")
    nginx_conf   = file("${path.module}/../deploy/nginx.conf")
  })

  user_data_replace_on_change = true

  tags = { Name = "${local.name_prefix}-app" }

  lifecycle {
    # The hand-launched instance predates this code; adopt it with
    #   terraform import aws_instance.app i-0e88fcb85356bc5f2
    # rather than letting Terraform destroy it on first apply.
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
