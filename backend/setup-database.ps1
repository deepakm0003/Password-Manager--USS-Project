# Database Setup Script for Unified Authentication Manager (Windows PowerShell)
# This script helps set up the PostgreSQL database locally on Windows

Write-Host "🚀 Setting up Unified Authentication Manager Database..." -ForegroundColor Green

# Check if PostgreSQL is installed
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ PostgreSQL is not installed. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "   Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL is installed" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "⚠️  Please update .env file with your database credentials" -ForegroundColor Yellow
    } else {
        Write-Host "❌ .env.example file not found" -ForegroundColor Red
        exit 1
    }
}

# Load environment variables from .env file
$envContent = Get-Content .env
foreach ($line in $envContent) {
    if ($line -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        Set-Item -Path "env:$key" -Value $value
    }
}

# Extract database connection details from DATABASE_URL
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
    Write-Host "❌ DATABASE_URL not found in .env file" -ForegroundColor Red
    exit 1
}

# Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
$dbMatch = $databaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)'
if (-not $dbMatch) {
    Write-Host "❌ Invalid DATABASE_URL format" -ForegroundColor Red
    exit 1
}

$dbUser = $matches[1]
$dbPassword = $matches[2]
$dbHost = $matches[3]
$dbPort = $matches[4]
$dbName = $matches[5]

Write-Host "📊 Database Configuration:" -ForegroundColor Cyan
Write-Host "   Database: $dbName"
Write-Host "   User: $dbUser"
Write-Host "   Host: $dbHost"
Write-Host "   Port: $dbPort"

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $dbPassword

# Check if database exists
$dbExists = psql -h $dbHost -p $dbPort -U $dbUser -lqt 2>$null | Select-String -Pattern "\b$dbName\b"
if ($dbExists) {
    Write-Host "✅ Database '$dbName' already exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database '$dbName' does not exist. Creating..." -ForegroundColor Yellow
    $createDbCommand = "CREATE DATABASE $dbName;"
    psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c $createDbCommand 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database '$dbName' created" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create database. Please create it manually." -ForegroundColor Red
        exit 1
    }
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
npx prisma migrate dev --name init

# Seed database (optional)
$seedResponse = Read-Host "Do you want to seed the database with test data? (y/n)"
if ($seedResponse -eq 'y' -or $seedResponse -eq 'Y') {
    Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
    npm run prisma:seed
    Write-Host "✅ Database seeded" -ForegroundColor Green
}

Write-Host "🎉 Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the backend server: npm run dev"
Write-Host "  2. Open Prisma Studio: npm run prisma:studio"
Write-Host "  3. Connect your mobile app to the backend API"

# Clean up password from environment
Remove-Item Env:PGPASSWORD




