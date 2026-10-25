terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # ---------------------------------------------------------------------------
  # Remote state (OPTIONAL, NOT FREE-TIER-NEUTRAL BY DEFAULT)
  #
  # Local state is used unless this block is enabled. An S3 backend itself is
  # free (tiny object), but DynamoDB state locking is NOT on the perpetual free
  # tier (25 GB always-free only applies to DynamoDB on-demand within the first
  # 12 months). We therefore use S3-native locking (use_lockfile) which needs no
  # DynamoDB table at all.
  #
  # To enable: create the bucket once, then uncomment and `terraform init -migrate-state`.
  # ---------------------------------------------------------------------------
  # backend "s3" {
  #   bucket       = "apartmentos-tfstate-962634335384"
  #   key          = "apartmentos/dev/terraform.tfstate"
  #   region       = "ap-south-2"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}
