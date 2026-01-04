#!/bin/bash

# Docker Build Script with Platform and Registry Support
# Usage: ./scripts/build-docker.sh [OPTIONS]
#
# Options:
#   -p, --platform PLATFORM    Target platform (default: linux/amd64,linux/arm64)
#   -r, --registry REGISTRY    Docker registry (e.g., docker.io/myuser)
#   -t, --tag TAG             Image tag (default: latest)
#   -n, --name NAME           Image name (default: nextjs-blog-cms)
#   --push                    Push image to registry after build
#   --no-cache                Build without cache
#   --dev                     Build development image with mounted volumes
#   -h, --help                Show this help message

set -e

# Default values
PLATFORM="linux/amd64,linux/arm64"
REGISTRY=""
TAG="latest"
NAME="nextjs-blog-cms"
PUSH=false
NO_CACHE=false
DEV=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--platform)
      PLATFORM="$2"
      shift 2
      ;;
    -r|--registry)
      REGISTRY="$2"
      shift 2
      ;;
    -t|--tag)
      TAG="$2"
      shift 2
      ;;
    -n|--name)
      NAME="$2"
      shift 2
      ;;
    --push)
      PUSH=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --dev)
      DEV=true
      shift
      ;;
    -h|--help)
      echo "Docker Build Script with Platform and Registry Support"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -p, --platform PLATFORM    Target platform (default: linux/amd64,linux/arm64)"
      echo "  -r, --registry REGISTRY    Docker registry (e.g., docker.io/myuser)"
      echo "  -t, --tag TAG             Image tag (default: latest)"
      echo "  -n, --name NAME           Image name (default: nextjs-blog-cms)"
      echo "  --push                    Push image to registry after build"
      echo "  --no-cache                Build without cache"
      echo "  --dev                     Build development image with mounted volumes"
      echo "  -h, --help                Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Build with defaults"
      echo "  $0 -p linux/amd64 -t v1.0.0          # Build for single platform with tag"
      echo "  $0 -r docker.io/myuser -t latest      # Build and tag for registry"
      echo "  $0 -r ghcr.io/myuser --push          # Build and push to GitHub Container Registry"
      echo "  $0 --dev                              # Build development image"
      echo "  docker-compose -f docker-compose.dev.yml up  # Run with mounted volumes"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Construct full image name
if [[ -n "$REGISTRY" ]]; then
  FULL_IMAGE_NAME="$REGISTRY/$NAME:$TAG"
else
  FULL_IMAGE_NAME="$NAME:$TAG"
fi

# Get current directory (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🐳 Building Docker image..."
echo "📦 Image name: $FULL_IMAGE_NAME"
echo "🏗️  Platform(s): $PLATFORM"
echo "📂 Project root: $PROJECT_ROOT"
echo ""

# Build arguments
BUILD_ARGS=()
if [[ "$NO_CACHE" == "true" ]]; then
  BUILD_ARGS+=(--no-cache)
fi
BUILD_ARGS+=(--platform "$PLATFORM")
BUILD_ARGS+=(-t "$FULL_IMAGE_NAME")

# Add development target if specified
if [[ "$DEV" == "true" ]]; then
  BUILD_ARGS+=(--target builder)
  echo "🔧 Building development image with builder target..."
fi

# Check if docker buildx is available
if ! docker buildx version >/dev/null 2>&1; then
  echo "❌ Docker buildx is not available. Please install Docker Buildx."
  echo "   For multi-platform builds, Docker Buildx is required."
  exit 1
fi

# Use buildx for multi-platform builds
echo "🔨 Using Docker Buildx for multi-platform build..."
docker buildx build \
  "${BUILD_ARGS[@]}" \
  --load \
  .

if [[ "$PUSH" == "true" ]]; then
  echo ""
  echo "📤 Pushing image to registry..."
  docker buildx build \
    "${BUILD_ARGS[@]}" \
    --push \
    .
  echo "✅ Image pushed successfully: $FULL_IMAGE_NAME"
else
  echo "✅ Image built successfully: $FULL_IMAGE_NAME"
  echo ""
  echo "💡 To push to registry, run:"
  echo "   docker push $FULL_IMAGE_NAME"
  echo "   or use --push flag with this script"
fi

echo ""
echo "🎉 Build completed!"
echo ""
echo "Available commands:"
echo "  docker run -p 3000:3000 $FULL_IMAGE_NAME    # Run the container"
echo "  docker images | grep $NAME                   # List built images"
