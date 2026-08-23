# Contributing to ErrorLens

Thank you for considering contributing to ErrorLens — a self-hosted,
AI-native error tracking system. This document explains how to contribute
and the conventions this codebase follows.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node version, OS, etc.)

### Suggesting Enhancements

1. Check if the enhancement has been suggested
2. Create a new issue with:
   - Clear use case description
   - Proposed solution (if any)
   - Why this benefits ErrorLens's users

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes following the code style below
4. Test your changes locally against the docker-compose stack
5. Commit with conventional commit messages:
   - `feat: add new feature`
   - `fix: resolve bug`
   - `docs: update README`
   - `refactor: improve code structure`
6. Push to your fork
7. Open a pull request

## Code Style

All conventions are defined in `CLAUDE.md` — read it before opening a PR.
The essentials:

- **No comments.** Zero inline comments, block comments, JSDoc. Code must
  be self-explanatory through naming, not annotated. A PR that adds
  comments to explain what code does (rather than a rare, genuinely
  non-obvious why) will be asked to remove them.
- **No N+1 queries, ever.** Batch with `$in`/`createMany`, use
  `Promise.all` for independent parallel queries, and never query inside a
  loop.
- **Every project-scoped query needs its index.** If you add a query
  filtered by `projectId` (or any field), the corresponding compound index
  must exist in `prisma/schema.prisma` in the same PR.
- Follow the module structure in `src/modules/_template` — see
  `CLAUDE.md` for the exact module boundaries and the two auth chains
  (API-key ingestion vs. JWT control-plane).
- Anything that isn't fast and synchronous-safe (LLM calls, git
  correlation, webhook delivery) belongs in an Inngest function, not the
  request path.
- Run `npm run lint` and `npm run format` before pushing.

## Local Development

```bash
cp docker-compose.yml docker-compose.dev.yml
# then remove the `app` service from docker-compose.dev.yml — you're
# running the app on the host with hot-reload instead, not in a container
docker compose -f docker-compose.dev.yml up -d   # postgres, redis, inngest
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

`docker-compose.yml` itself is the production file — `docker compose up -d`
with no `-f` flag runs the full stack, app included, which is what a
company deploys on a VPS. `docker-compose.dev.yml` is gitignored, a local,
personal file — not something every contributor needs to keep identical.

## Testing

- Test changes locally before submitting, including against the
  docker-compose stack (not just unit-level)
- Ensure existing functionality isn't broken
- Add tests for new features where the project has a test setup for them

## Documentation

- Update `README.md` for user-facing changes
- Keep documentation concise — no comment-style padding, same rule as code

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

## Questions?

Open a discussion in GitHub Discussions or contact the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
