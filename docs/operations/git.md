# Работа с Git

- Статус: актуально
- Обновлено: 2026-08-26

## Репозиторий

- Основная ветка: `main`.
- Remote: `origin`.
- URL: `ssh://git@git.onepricecoffee.com:65022/ogc-vibecode/ONEPRICES.git`.
- Приватные SSH-ключи хранятся только у пользователей и вне репозитория.

## Обязательные правила

- `main` должна оставаться развёртываемой;
- задачи выполняются в коротких тематических ветках;
- перед pull request обязательны `make check`, `make coverage` и `make build`;
- миграции добавляются новыми файлами и не редактируются после применения;
- `.env`, дампы и временные архивы запрещены в Git; по явному решению владельца
  единственным исключением является `.env.production` в закрытом репозитории;
- значения `.env.production` запрещено копировать в документацию, логи и ответы;
- изменения инфраструктуры и модели данных описываются в pull request и ADR.

Заголовки коммитов пишутся только по-русски, короткой повелительной формулировкой.
Опубликованная история не переписывается, force-push без согласования запрещён.

## Проверка перед коммитом

```bash
npm run check
npm run test:coverage
npm run build
docker compose --env-file .env -f compose.yml config --quiet
docker compose --env-file .env -f compose.yml -f compose.postgres.yml config --quiet
git diff --check
git status --short
```

## Публикация

```bash
git push -u origin main
```
