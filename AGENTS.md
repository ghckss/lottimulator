
# Agent Development Guide

## Development Loop

1. Inspect the relevant route, component, state, API, and test files.
2. Make the smallest coherent change.
3. Run the project harness.
4. Fix every harness error and warning.
5. Run lint and typecheck.
6. Report changed files, verification, and residual risk.

## Required Commands

```bash
pnpm harness
pnpm lint
pnpm typecheck
```

Harness errors and warnings are mandatory fixes.

## Subagents

Subagents are allowed.

Use this flow for substantial work:

```text
planner -> worker + tester in parallel -> reviewer -> worker/tester fixes -> parent final integration
```

Roles:

- `planner`: creates the implementation plan.
- `worker`: implements the feature or fix.
- `tester`: writes or updates tests for the worker scope.
- `reviewer`: reviews accessibility, visual risk, test gaps, and harness results.

The parent agent owns final integration, final harness execution, and the final report.

## Boundaries

- Do not make unrelated refactors.
- Do not bypass the local component system.
- Do not add dependencies without explicit approval.
- Do not delete tests to make checks pass.
- Do not ignore harness results.

## Frontend Conventions

- Follow the generated ESLint config.
- Keep TypeScript strict.
- Do not use explicit `any`.
- Import from `src` through the `@` alias.
- Preserve the generated folder structure unless the product shape clearly requires a change.
