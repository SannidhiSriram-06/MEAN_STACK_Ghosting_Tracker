# AWS Integration Guide — JobTrack

This document details exactly how to configure, provision, and connect AWS services (Cognito and S3) to your JobTrack application, transitioning the stack from Local Mock Mode to secure cloud-integrated production services.

---

## 1. AWS Cognito Authentication Setup

Cognito acts as our User Identity provider, issuing secure JWT tokens.

### Step 1: Create a User Pool
1. Log in to the [AWS Management Console](https://console.aws.aws.amazon.com/) and navigate to **Amazon Cognito**.
2. Click **Create user pool**.
3. Under **Configure sign-in experience**:
   - Select **Username** and **Email** as provider sign-in options.
   - Click **Next**.
4. Under **Configure security requirements**:
   - Choose **Cognito defaults** for password policy.
   - Choose **No MFA** (highly recommended for development/free-tier to avoid SMS fees).
   - Click **Next**.
5. Under **Configure sign-up experience**:
   - Keep default user verification settings (Email validation).
   - Under **Required attributes**, do not select unnecessary options to keep signups simple.
   - Click **Next**.
6. Under **Configure message delivery**:
   - Select **Send email with Cognito** (this is free for up to 50 verification emails per day).
   - Click **Next**.
7. Under **Integrate app**:
   - **User pool name**: `JobTrack-User-Pool`.
   - Under **Initial app client**:
     - **App client name**: `JobTrack-Angular-Client`.
     - **Client secret**: Select **Don't generate a client secret** (Crucial: Client secrets are not safe for frontend Angular Single Page Applications as they can be extracted from bundle code).
   - Click **Next**, review settings, and click **Create user pool**.

### Step 2: Retrieve Cognito IDs
Once created, select your User Pool in the console and copy:
* **User Pool ID** (e.g., `us-east-1_abcdef123`)
* **Client ID** (under App Integration -> App Clients, e.g., `5abcde12345fghij67890klmno`)
* **AWS Region** (e.g., `us-east-1`)

---

## 2. AWS S3 Resume Storage Setup

S3 is utilized for durable, high-availability storage of candidate resume files.

### Step 1: Create an S3 Bucket
1. Navigate to **Amazon S3** in the AWS Console.
2. Click **Create bucket**.
3. **Bucket name**: Enter a globally unique name (e.g., `jobtrack-resumes-yourname`).
4. **AWS Region**: Select the same region as your Cognito pool (e.g., `us-east-1`).
5. **Object Ownership**: Leave **ACLs disabled** (default, recommended).
6. **Block Public Access settings for this bucket**:
   - Keep **Block all public access** checked (Crucial: Resumes contain sensitive PII like phone numbers and home addresses; they must never be publicly accessible).
7. Keep default encryption settings (SSE-S3 managed key) and click **Create bucket**.

### Step 2: Establish User Folders
The backend is programmed to prefix all keys with the user's ID: `resumes/${userId}/${Date.now()}-${filename}`. S3 creates logical virtual folders automatically when objects are uploaded, isolating user files out of the box.

---

## 3. IAM Least-Privilege Policy Setup

To allow your Express backend to upload to S3, you must create a dedicated IAM user with scoped credentials.

### Step 1: Create IAM Policy
1. Navigate to **IAM** (Identity and Access Management) in the AWS Console.
2. Under **Policies**, click **Create policy**.
3. Click **JSON** and paste the following policy (replace `jobtrack-resumes-yourname` with your actual bucket name):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject"
         ],
         "Resource": "arn:aws:s3:::jobtrack-resumes-yourname/*"
       }
     ]
   }
   ```
4. Click **Next**, name the policy `JobTrack-S3-Upload-Policy`, and click **Create policy**.

### Step 2: Create IAM User
1. Under **Users**, click **Create user**.
2. **User name**: `jobtrack-backend-service`. Click **Next**.
3. Select **Attach policies directly**.
4. Search for and select `JobTrack-S3-Upload-Policy`. Click **Next** and **Create user**.
5. Select the newly created user `jobtrack-backend-service`, go to the **Security credentials** tab.
6. Scroll to **Access keys** and click **Create access key**.
7. Choose **Application running outside AWS** and click **Next**.
8. Copy the generated credentials:
   - **Access Key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - **Secret Access Key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

---

## 4. Connecting AWS to your Local App

The application uses an **auto-detection system** that activates real S3 and Cognito if env vars are present.

### Step 1: Update Environment File
Open the `.env` file in the root directory (or `backend/.env`) and fill in the values:

```bash
# Groq LLM Key
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxx

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_abcdef123
COGNITO_CLIENT_ID=5abcde12345fghij67890klmno
COGNITO_REGION=us-east-1

# AWS S3 Configuration
S3_BUCKET_NAME=jobtrack-resumes-yourname
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

### Step 2: Restart Containers
Run the following to reload the env file and restart services:
```bash
docker compose down
docker compose up -d --build
```
The Express logs will now show:
```
Connected to MongoDB successfully.
Cognito JWT verifier initialized successfully.
AWS S3 Client initialized successfully.
```

### Step 3: Frontend Integration
1. Open the Angular app at `http://localhost:4200`.
2. Navigate to the **Settings** tab.
3. Under **AWS Cognito Security Integration**, input your User Pool ID, Client ID, and Region.
4. Click **Apply Cognito Config**.
5. Register a new user in the login screen. Check your AWS Cognito Console; you will see the new user created instantly!

---

## 5. Viva Defenses (Technical Q&A)

Prepare to answer these questions during the project evaluation:

### Q1: Why did you use AWS Cognito instead of hand-rolling JWT authentication?
* **Defense**:
  1. **Compliance & Security**: Hand-rolled authentication is highly prone to vulnerabilities (weak hashing, unsafe salt generation, incorrect JWT signature validation). Cognito offloads credential security, user account verification flows, and session management to AWS.
  2. **Scalability**: Cognito manages up to 50,000 monthly active users on the AWS Free Tier with no cost.
  3. **Industry Best Practice**: Offloading user database storage reduces exposure to data privacy regulations (e.g., GDPR, CCPA) since plain-text or hashed passwords never touch our MongoDB instance.

### Q2: Why store resume files in S3 instead of directly in MongoDB?
* **Defense**:
  1. **Document Size Limitations**: MongoDB has a strict 16MB document size limit (BSON document limit). While resumes are usually smaller, scaling this pattern to larger media files in MongoDB causes major issues.
  2. **Database Performance**: Storing heavy binary blobs (PDF files) inside Mongoose collections bloats the database size, thrashing RAM cache limits, and slowing down primary CRUD queries (like Kanban counts or stats listings).
  3. **Cost-Efficient Scalability**: S3 is optimized for serving static binary data. We can store files in S3 for fractions of a cent per GB, keeping our MongoDB database lightweight and fast.
  4. **Direct CDN integration**: If needed, files in S3 can be routed through CloudFront (CDN) with pre-signed URLs for secure, direct downloads.
