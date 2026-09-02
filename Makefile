COMPOSE ?= docker compose
ENV_FILE ?= .env

.PHONY: init dev lint typecheck test coverage check build compose-config compose-config-db docker-build up up-db down logs migrate seed

init:
	npm ci
	@test -f .env || cp .env.example .env

dev:
	npm run dev

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

coverage:
	npm run test:coverage

check:
	npm run check

build:
	npm run build

compose-config:
	$(COMPOSE) --env-file $(ENV_FILE) -f compose.yml config --quiet

compose-config-db:
	$(COMPOSE) --env-file $(ENV_FILE) -f compose.yml -f compose.postgres.yml config --quiet

docker-build:
	$(COMPOSE) --env-file $(ENV_FILE) -f compose.yml build

up:
	$(COMPOSE) --env-file $(ENV_FILE) -f compose.yml up -d --build

up-db:
	$(COMPOSE) --env-file $(ENV_FILE) -f compose.yml -f compose.postgres.yml up -d --build

down:
	$(COMPOSE) --env-file $(ENV_FILE) -f compose.yml -f compose.postgres.yml down

logs:
	$(COMPOSE) --env-file $(ENV_FILE) -f compose.yml logs --tail=100 -f app

migrate:
	npm run db:migrate

seed:
	npm run seed:production
