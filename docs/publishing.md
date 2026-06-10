# Publishing

Skillrouter is published through GitHub Actions and npm Trusted Publishing.

The repository does not store an npm publish token. Publishing should happen from GitHub-hosted runners using OIDC.

## Workflows

- `.github/workflows/ci.yml` runs `pnpm test:release` on pull requests and pushes to `main`.
- `.github/workflows/publish.yml` runs when a GitHub Release is published.
- The publish job requires OIDC permission through `id-token: write`.
- The publish command uses `npm publish --provenance`.

## GitHub Setup

Publishing is triggered by publishing a GitHub Release. Normal pushes and pull requests only run CI.

No GitHub Environment is required for the default release flow. The GitHub Release publish action is treated as the explicit deployment approval.

## npm Setup

After the package exists on npm, configure Trusted Publishing for the package:

```txt
Provider: GitHub Actions
Organization or user: nbsp1221
Repository: skillrouter
Workflow filename: publish.yml
Environment name: <leave blank>
Allowed action: npm publish
```

The package `repository.url` in `package.json` must match the GitHub repository.

If the project later needs an additional approval gate before npm publishing, add a GitHub Environment to `.github/workflows/publish.yml` and enter the same environment name in npm's Trusted Publisher settings.

## First Publish

npm Trusted Publishing is configured from package settings. If npm does not allow trusted-publisher setup before the package exists, publish the first version manually from a logged-in local npm session, then configure Trusted Publishing for future releases.

The first local publish should still use the same local release gate:

```bash
pnpm test:release
npm publish --access public --provenance
```

After Trusted Publishing is configured, use GitHub Releases for subsequent publishes.

## Release Flow

1. Ensure `main` is green.
2. Update `package.json` version.
3. Commit and push.
4. Create a GitHub Release for the version.
5. Let `.github/workflows/publish.yml` run `pnpm test:release`.
6. Let `.github/workflows/publish.yml` publish to npm.
