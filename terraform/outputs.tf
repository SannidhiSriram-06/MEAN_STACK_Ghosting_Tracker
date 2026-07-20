output "s3_bucket_name" {
  value       = aws_s3_bucket.resumes.id
  description = "The name of the S3 bucket created for resumes"
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.pool.id
  description = "The ID of the Cognito User Pool"
}

output "cognito_client_id" {
  value       = aws_cognito_user_pool_client.client.id
  description = "The ID of the Cognito App Client"
}

output "backend_ecr_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "The URL of the backend ECR repository"
}

output "frontend_ecr_url" {
  value       = aws_ecr_repository.frontend.repository_url
  description = "The URL of the frontend ECR repository"
}

output "deployment_instructions" {
  value = <<EOF
JobTrack Fargate Deployment Instructions:

1. Authenticate Docker with your AWS ECR Registry:
   aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com

2. Build and tag your Backend image:
   docker build -t ${aws_ecr_repository.backend.repository_url}:latest ./backend

3. Build and tag your Frontend image:
   docker build -t ${aws_ecr_repository.frontend.repository_url}:latest ./frontend

4. Push the images to ECR:
   docker push ${aws_ecr_repository.backend.repository_url}:latest
   docker push ${aws_ecr_repository.frontend.repository_url}:latest

5. Trigger a deployment by updating the ECS service:
   aws ecs update-service --cluster ${aws_ecs_cluster.cluster.name} --service ${aws_ecs_service.service.name} --force-new-deployment --region ${var.aws_region}

6. Discover your Task's public IP in the ECS Console to access the application:
   - Frontend running on: http://<TASK_PUBLIC_IP>:4200
   - Backend running on: http://<TASK_PUBLIC_IP>:5000
EOF
  description = "Steps to build, tag, push images, and access the application"
}
