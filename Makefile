SHELL := /bin/bash

PORT ?= 8030
export PORT

LOCAL := docker compose -f docker-compose.yml -f docker-compose.local.yml
PROD  := docker compose -f docker-compose.yml -f docker-compose.prod.yml

.PHONY: help up-local down-local restart-local build-local logs-local ps-local shell-local \
        typecheck-local test-local build-check-local npm-local \
        up-prod down-prod restart-prod build-prod logs-prod ps-prod shell-prod \
        check clean

# Default target
help:
	@echo "╔════════════════════════════════════════════════════════════════╗"
	@echo "║          Docker Compose Commands - Font Desk                   ║"
	@echo "╚════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📦 LOCAL DEVELOPMENT (Vite HMR, source mounted):"
	@echo "  make up-local          - Start local development environment"
	@echo "  make down-local        - Stop local development environment"
	@echo "  make restart-local     - Restart local environment"
	@echo "  make build-local       - Rebuild local container"
	@echo "  make logs-local        - Follow local logs"
	@echo "  make ps-local          - Show local service status"
	@echo "  make shell-local       - Shell into the dev container"
	@echo ""
	@echo "🧪 CHECKS (inside the dev container):"
	@echo "  make typecheck-local   - Run tsc --noEmit"
	@echo "  make test-local        - Run the test suite"
	@echo "  make build-check-local - Run the production Vite build"
	@echo "  make check             - typecheck + test + build"
	@echo "  make npm-local CMD='…' - Run an npm command (e.g. CMD='install zod')"
	@echo ""
	@echo "🏭 PRODUCTION (built dist/ served by Node):"
	@echo "  make up-prod           - Start production container"
	@echo "  make down-prod         - Stop production container"
	@echo "  make restart-prod      - Restart production container"
	@echo "  make build-prod        - Rebuild and start production container"
	@echo "  make logs-prod         - Follow production logs"
	@echo "  make ps-prod           - Show production service status"
	@echo "  make shell-prod        - Shell into the production container"
	@echo ""
	@echo "🧹 CLEANUP:"
	@echo "  make clean             - Remove containers and volumes (saved defaults too)"
	@echo ""
	@echo "💡 Open http://localhost:$(PORT) — change the port with PORT=8080 make up-local"
	@echo ""

# ============================================================================
# LOCAL DEVELOPMENT
# ============================================================================

up-local:
	@echo "🚀 Starting local development environment..."
	$(LOCAL) up -d
	@echo "✅ Local environment started!"
	@echo "📍 Application: http://localhost:$(PORT)"

down-local:
	@echo "🛑 Stopping local development environment..."
	$(LOCAL) down
	@echo "✅ Local environment stopped!"

restart-local:
	@echo "🔄 Restarting local environment..."
	$(LOCAL) restart
	@echo "✅ Local environment restarted!"

build-local:
	@echo "🔨 Rebuilding local container..."
	$(LOCAL) up -d --build --renew-anon-volumes
	@echo "✅ Local container rebuilt! http://localhost:$(PORT)"

logs-local:
	@echo "📋 Viewing local logs (Ctrl+C to exit)..."
	$(LOCAL) logs -f

ps-local:
	@echo "📊 Local services status:"
	$(LOCAL) ps

shell-local:
	@echo "⚡ Accessing dev container..."
	$(LOCAL) exec app sh

typecheck-local:
	@echo "🔎 Type-checking..."
	$(LOCAL) run --rm --no-deps -T app npm run typecheck

test-local:
	@echo "🧪 Running tests..."
	$(LOCAL) run --rm --no-deps -T app npm test

build-check-local:
	@echo "🔨 Building frontend..."
	$(LOCAL) run --rm --no-deps -T app npm run build

check: typecheck-local test-local build-check-local
	@echo "✅ All checks passed!"

npm-local:
	@if [ -z "$(CMD)" ]; then \
		echo "❌ Error: Please provide a command. Example: make npm-local CMD='install zod'"; \
		exit 1; \
	fi
	@echo "📦 Running npm $(CMD)..."
	$(LOCAL) run --rm --no-deps app npm $(CMD)

# ============================================================================
# PRODUCTION
# ============================================================================

up-prod:
	@echo "🚀 Starting production environment..."
	$(PROD) up -d
	@echo "✅ Production environment started! http://localhost:$(PORT)"

down-prod:
	@echo "🛑 Stopping production environment..."
	$(PROD) down
	@echo "✅ Production environment stopped!"

restart-prod:
	@echo "🔄 Restarting production environment..."
	$(PROD) restart
	@echo "✅ Production environment restarted!"

build-prod:
	@echo "🔨 Rebuilding production container..."
	$(PROD) up -d --build
	@echo "✅ Production container rebuilt! http://localhost:$(PORT)"

logs-prod:
	@echo "📋 Viewing production logs (Ctrl+C to exit)..."
	$(PROD) logs -f

ps-prod:
	@echo "📊 Production services status:"
	$(PROD) ps

shell-prod:
	@echo "🏭 Accessing production container..."
	$(PROD) exec app sh

# ============================================================================
# CLEANUP
# ============================================================================

clean:
	@echo "⚠️  WARNING: This will remove all containers and volumes (including saved defaults)!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "🧹 Cleaning up..."; \
		$(LOCAL) down -v --remove-orphans; \
		$(PROD) down -v --remove-orphans; \
		echo "✅ Cleanup complete!"; \
	else \
		echo "❌ Cleanup cancelled"; \
	fi
