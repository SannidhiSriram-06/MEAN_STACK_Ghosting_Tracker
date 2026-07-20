resource "aws_ecs_cluster" "cluster" {
  name = "jobtrack-cluster"

  tags = {
    Name = "jobtrack-cluster"
  }
}

# ECS Execution Role (to download images and write to CloudWatch)
resource "aws_iam_role" "ecs_execution" {
  name = "jobtrack-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (Permissions for running containers to call S3, EFS, etc.)
resource "aws_iam_role" "ecs_task" {
  name = "jobtrack-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Task Role Policy for S3 upload + EFS authorization
resource "aws_iam_policy" "task_s3_efs" {
  name        = "jobtrack-task-s3-efs-policy"
  description = "Allows ECS tasks to access S3 bucket and EFS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.resumes.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ]
        Resource = aws_efs_file_system.mongodb.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_policy" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.task_s3_efs.arn
}

# CloudWatch Logs Group for Containers
resource "aws_cloudwatch_log_group" "logs" {
  name              = "/ecs/jobtrack"
  retention_in_days = 7
}

# Multi-container ECS Task Definition
resource "aws_ecs_task_definition" "jobtrack" {
  family                   = "jobtrack-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"   # 0.5 vCPU
  memory                   = "1024"  # 1.0 GB RAM
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    # 1. MongoDB container
    {
      name      = "mongodb"
      image     = "mongo:7"
      essential = true
      portMappings = [
        {
          containerPort = 27017
          hostPort      = 27017
        }
      ]
      mountPoints = [
        {
          containerPath = "/data/db"
          sourceVolume  = "mongodb-storage"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "mongodb"
        }
      }
    },
    # 2. Express Backend container
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
        }
      ]
      environment = [
        { name = "PORT", value = "5000" },
        { name = "MONGO_URI", value = "mongodb://localhost:27017/jobtrack" }, # local loopback in Fargate Task
        { name = "GHOST_THRESHOLD_DAYS", value = "10" },
        { name = "COGNITO_USER_POOL_ID", value = aws_cognito_user_pool.pool.id },
        { name = "COGNITO_CLIENT_ID", value = aws_cognito_user_pool_client.client.id },
        { name = "COGNITO_REGION", value = var.aws_region },
        { name = "S3_BUCKET_NAME", value = aws_s3_bucket.resumes.id },
        { name = "AWS_REGION", value = var.aws_region }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
      dependsOn = [
        {
          containerName = "mongodb"
          condition     = "START"
        }
      ]
    },
    # 3. Angular Frontend container
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 4200
          hostPort      = 4200
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
      dependsOn = [
        {
          containerName = "backend"
          condition     = "START"
        }
      ]
    }
  ])

  # EFS Volume Mapping
  volume {
    name = "mongodb-storage"
    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.mongodb.id
      transit_encryption      = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.mongodb_path.id
        iam             = "ENABLED"
      }
    }
  }
}

# ECS Service running in the VPC public subnets
resource "aws_ecs_service" "service" {
  name            = "jobtrack-service"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.jobtrack.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  depends_on = [
    aws_efs_mount_target.target_1,
    aws_efs_mount_target.target_2
  ]
}
