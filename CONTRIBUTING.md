# Contributing to Thenar

Thank you for contributing to the **Thenar** smart-safe handle project! As this is a private graduation project repository, please follow these team development guidelines.

---

## 🌿 Branching Strategy

- **`main`**: Production and demonstration branch. Always deployable and passing all tests. Protected against direct pushes.
- **`develop`**: Integration branch for current iteration work.
- **Feature Branches**: Branch from `develop` using the format:
  - `feat/feature-name`
  - `fix/bug-description`
  - `docs/documentation-update`
  - `hw/hardware-sensor-update`

---

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(scope): add new capability`
- `fix(scope): resolve bug or calculation error`
- `docs(scope): update documentation or diagrams`
- `test(scope): add or update unit/golden-vector tests`
- `refactor(scope): internal code restructuring`
- `chore(scope): dependencies or tooling adjustments`

### Co-authorship
When pairing or collaborating across disciplines, include trailers:
```
Co-authored-by: Name <id+username@users.noreply.github.com>
```

---

## 🧪 Testing Before Submitting PRs

Ensure all quality gates pass locally before opening a pull request:

```bash
# 1. Typecheck and build all TypeScript packages & apps
npm run build

# 2. Run all unit and gateway integration tests
npm run test:all

# 3. Run Python enrollment calibration tests
apps\enrollment\.venv\Scripts\python.exe -m pytest apps/enrollment/tests
```

---

## 🔍 Pull Request Process

1. Open a PR against `develop` (or `main` for release tags).
2. Fill out the provided pull request template.
3. Request review from at least one teammate.
4. Ensure all CI checks and tests pass.
5. Squash or rebase merge once approved.
