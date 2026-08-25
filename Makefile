.PHONY: init dev lint typecheck test coverage check build compose-config compose-config-db up up-db down logs migrate seed

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
	npm run coverage

check:
	npm run check

build:
	npm run build

compose-config:
	docker compose -f compose.yml config

compose-config-db:
	docker compose -f compose.yml -f compose.postgres.yml config

up:
	docker compose -f compose.yml up -d --build

up-db:
	docker compose -f compose.yml -f compose.postgres.yml up -d --build

down:
	docker compose -f compose.yml -f compose.postgres.yml down

logs:
	docker compose -f compose.yml logs -f app

migrate:
	npm run db:migrate

seed:
	npm run seed:production
