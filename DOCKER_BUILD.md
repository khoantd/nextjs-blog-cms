# Docker Build Script

This project includes a flexible Docker build script that supports multi-platform builds, registry pushing, and database file mutation.

## Files Created

- **`Dockerfile`** - Multi-stage Docker build optimized for Next.js production with mutable database support
- **`scripts/build-docker.sh`** - Build script with platform and registry support
- **`.dockerignore`** - Excludes unnecessary files from Docker context
- **`docker-compose.yml`** - Production compose file with persistent database volumes
- **`docker-compose.dev.yml`** - Development compose file with mounted volumes
- **NPM scripts** - Added convenient Docker commands to package.json

## Database Mutation Support

The Docker setup is configured to handle mutable database files:

### Key Features:
- **Persistent data volume**: `/app/data` directory mounted for database persistence
- **Database URL**: Configured to use `file:./data/dev.db` for SQLite
- **Runtime database creation**: Database can be created and modified at runtime
- **Volume mounting**: Both production and development setups persist database changes

### Production Database Handling:
```bash
# Run with persistent database
docker-compose up -d

# Database file will be stored in ./data/dev.db
# Changes persist across container restarts
```

### Development Database Handling:
```bash
# Run with live development and database persistence
docker-compose -f docker-compose.dev.yml up

# Database persists in ./data/dev.db
# Code changes are reflected live
```

## Usage

### Basic Build

```bash
# Build with default settings (linux/amd64,linux/arm64, tag: latest)
npm run docker:build
# or
./scripts/build-docker.sh
```

### Platform-Specific Build

```bash
# Build for single platform
./scripts/build-docker.sh -p linux/amd64

# Build for ARM64 only
./scripts/build-docker.sh -p linux/arm64

# Build for multiple platforms
./scripts/build-docker.sh -p "linux/amd64,linux/arm64,linux/arm/v7"
```

### Registry Builds

```bash
# Build for Docker Hub
./scripts/build-docker.sh -r docker.io/username -t v1.0.0

# Build for GitHub Container Registry
./scripts/build-docker.sh -r ghcr.io/username -t latest

# Build and push to registry
./scripts/build-docker.sh -r docker.io/username --push
```

### Advanced Options

```bash
# Build without cache
./scripts/build-docker.sh --no-cache

# Custom image name and tag
./scripts/build-docker.sh -n my-app -t v2.0.0

# Production build with registry and push
./scripts/build-docker.sh -r ghcr.io/myorg -t production --push

# Development build with mounted volumes
./scripts/build-docker.sh --dev
```

## NPM Scripts

- `npm run docker:build` - Basic build with defaults
- `npm run docker:build:prod` - Build with production tag
- `npm run docker:build:dev` - Build development image
- `npm run docker:push` - Build and push (requires registry configuration)
- `npm run docker:up` - Start production containers
- `npm run docker:up:dev` - Start development containers with live reload
- `npm run docker:down` - Stop and remove containers

## Script Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--platform` | `-p` | Target platform(s) | `linux/amd64,linux/arm64` |
| `--registry` | `-r` | Docker registry | (none) |
| `--tag` | `-t` | Image tag | `latest` |
| `--name` | `-n` | Image name | `nextjs-blog-cms` |
| `--push` | | Push to registry after build | `false` |
| `--no-cache` | | Build without cache | `false` |
| `--dev` | | Build development image with mounted volumes | `false` |
| `--help` | `-h` | Show help message | |

## Examples

### Local Development

```bash
# Build for local testing
npm run docker:build

# Run with persistent database
npm run docker:up

# Run development with live reload
npm run docker:up:dev

# Stop containers
npm run docker:down
```

### Production Deployment

```bash
# Build and push to production registry
./scripts/build-docker.sh \
  -r ghcr.io/myorg \
  -t v1.2.3 \
  -p linux/amd64 \
  --push

# Deploy with persistent database
docker-compose up -d
```

### Multi-Platform Build

```bash
# Build for multiple architectures and push
./scripts/build-docker.sh \
  -r docker.io/myuser \
  -t multi-arch \
  -p "linux/amd64,linux/arm64,linux/arm/v7" \
  --push
```

## Requirements

- Docker with Buildx support (for multi-platform builds)
- Sufficient disk space for multi-platform builds
- Registry credentials (when pushing)

## Docker Features

- **Multi-stage build** for optimized image size
- **Non-root user** for security
- **Prisma support** with generated client
- **Next.js standalone output** for minimal runtime
- **Mutable database support** with persistent volumes
- **Health checks** and proper signal handling
- **Environment variable support**
- **Development mode** with mounted volumes for live coding

## Database Persistence

The Docker setup ensures your SQLite database file can be mutated and persisted:

- **Production**: Database stored in `./data/dev.db` on host
- **Development**: Same location with additional code mounting
- **Container restarts**: Database changes persist across restarts
- **Runtime creation**: Database created automatically if it doesn't exist
- **Prisma migrations**: Applied automatically on container start
