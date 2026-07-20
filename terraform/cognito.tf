resource "aws_cognito_user_pool" "pool" {
  name = "jobtrack-user-pool"

  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code is {####}."
    email_subject        = "Verify your JobTrack Account"
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      min_length = 5
      max_length = 50
    }
  }

  tags = {
    Name = "jobtrack-user-pool"
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "jobtrack-angular-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  # Public client: Do NOT generate secret (unusable in Angular)
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]
}
