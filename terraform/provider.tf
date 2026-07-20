terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "aws_region" {
  type        = string
  description = "AWS deployment region"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "production"
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "JobTrack"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
