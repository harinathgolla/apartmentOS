# ---------------------------------------------------------------------------
# S3 buckets
#
# Both buckets are free under the 5 GB / 12-month allotment. Lifecycle rules
# are ported verbatim from aws-toolkit-setup/s3/*.json.
# ---------------------------------------------------------------------------

# ---- backups ---------------------------------------------------------------

resource "aws_s3_bucket" "backups" {
  bucket = local.backups_bucket

  tags = { Name = local.backups_bucket, Purpose = "db-backups" }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "expire-backups-after-30-days"
    status = "Enabled"

    filter { prefix = "" }

    expiration { days = 30 }

    abort_incomplete_multipart_upload { days_after_initiation = 3 }

    noncurrent_version_expiration { noncurrent_days = 7 }
  }
}

# ---- deploy artifacts ------------------------------------------------------

resource "aws_s3_bucket" "deploy" {
  bucket = local.deploy_bucket

  tags = { Name = local.deploy_bucket, Purpose = "deploy-artifacts" }
}

resource "aws_s3_bucket_versioning" "deploy" {
  bucket = aws_s3_bucket.deploy.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "deploy" {
  bucket                  = aws_s3_bucket.deploy.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "deploy" {
  bucket = aws_s3_bucket.deploy.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "deploy" {
  bucket = aws_s3_bucket.deploy.id

  rule {
    id     = "expire-old-artifacts-after-90-days"
    status = "Enabled"

    filter { prefix = "" }

    expiration { days = 90 }

    abort_incomplete_multipart_upload { days_after_initiation = 3 }

    noncurrent_version_expiration { noncurrent_days = 14 }
  }
}
