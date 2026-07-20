data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "resumes" {
  bucket        = "jobtrack-resumes-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = {
    Name = "jobtrack-resumes-bucket"
  }
}

# Block all public access (PII safety)
resource "aws_s3_bucket_public_access_block" "block" {
  bucket = aws_s3_bucket.resumes.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "sse" {
  bucket = aws_s3_bucket.resumes.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
