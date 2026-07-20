resource "aws_efs_file_system" "mongodb" {
  creation_token = "jobtrack-mongodb-efs"
  encrypted      = true

  tags = {
    Name = "jobtrack-mongodb-efs"
  }
}

# Mount Targets
resource "aws_efs_mount_target" "target_1" {
  file_system_id  = aws_efs_file_system.mongodb.id
  subnet_id       = aws_subnet.public_1.id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_mount_target" "target_2" {
  file_system_id  = aws_efs_file_system.mongodb.id
  subnet_id       = aws_subnet.public_2.id
  security_groups = [aws_security_group.efs.id]
}

# Access point for mongodb path /data/db
resource "aws_efs_access_point" "mongodb_path" {
  file_system_id = aws_efs_file_system.mongodb.id

  root_directory {
    path = "/mongo"
    creation_info {
      owner_gid   = 999  # default mongodb user gid
      owner_uid   = 999  # default mongodb user uid
      permissions = "755"
    }
  }
}
