# Entire CLI: local and Codex cloud

## Local branch

Entire is configured for Codex on branch `feat/invis-fielding-workflow` in the WSL checkout. The settings are clone-local (`.entire/settings.local.json`), not global. Git hooks preserve/chains the pre-existing pre-push hook. Analytics and automatic checkpoint/transcript uploads are disabled because this repository is public. Entire does not import prior conversations as part of this setup.

The installed version is 0.11.3. Verify from the repository:

```sh
entire version
entire status --json
entire agent list
```

Codex project hooks live in `.codex/hooks.json`. Windows command overrides invoke the WSL binary through `wsl.exe`; Linux commands use `entire` on PATH. On another Windows machine, install Entire natively or regenerate hooks for that machine instead of reusing these WSL-specific overrides.

Codex requires review/trust for non-managed hooks. In the Codex CLI, run `/hooks` to review the installed Entire handlers; review all seven events. Restart or resume a session afterward and check `entire status --json`. `enabled: true` alone does not prove capture is active: the `codex_hooks` state and `active_sessions` must confirm it. This setup does not write trust approvals or bypass the trust requirement.

## Codex cloud environment

Open https://chatgpt.com/codex/cloud/settings/environments and create an environment for `kenn20/Invis-Fielding` (or edit an existing environment for that repo). This runs code in an OpenAI-hosted container, separate from the local WSL checkout. No GitHub Codespaces machine is needed.

Configure:

- Runtime: Node.js 22 or later.
- Manual setup script: `bash scripts/setup-entire-cloud.sh`.
- Maintenance script: `bash scripts/setup-entire-cloud.sh` (reinstalls Git hooks in refreshed checkouts and refreshes npm dependencies).
- The installer uses `/usr/local/bin` when writable, which is normally already on the cloud PATH. For a non-root container it uses `~/.local/bin`; add that directory to the environment's existing PATH without removing its Node/runtime paths. Setup-session exports alone do not persist to the agent phase.
- Setup needs HTTPS access to `github.com` and its release-download domains, and the npm registry. Agent internet can remain off for local capture and tests.
- Use branch `feat/invis-fielding-workflow` for tasks after the setup script has been pushed to that branch. Setup/cache warmup may check out the default branch; if the setup script is unavailable there, use the bootstrap below until it is merged.

Bootstrap setup/maintenance script that can fetch the script from `feat/invis-fielding-workflow` even during default-branch cache warmup:

```sh
set -euo pipefail
setup_file="$(mktemp)"
curl -fsSL --retry 3 https://raw.githubusercontent.com/kenn20/Invis-Fielding/feat/invis-fielding-workflow/scripts/setup-entire-cloud.sh -o "$setup_file"
bash "$setup_file"
rm -f -- "$setup_file"
```

The installer pins Entire 0.11.3, verifies the downloaded archive against its release checksums, installs Entire plus its Git remote helper, enables Codex hooks, and runs `npm ci`. It does not sign in to Entire, inject credentials, enable transcript uploads, or fabricate hook trust. Cloud hooks remain subject to the host's trust/review policy; confirm support and approvals in a real cloud session before claiming capture works.

## Verify in a real cloud task

Ask the task to run:

```sh
entire version
entire status --json
npm test
npm run build
```

Verify the CLI is installed, repository tracking is enabled, Codex hooks are recognized/trusted, and an actual session is visible. After a normal authorized code commit, inspect `entire checkpoint list`. Cloud containers are temporary; captured metadata must be explicitly saved to an approved private destination if it needs to survive the task. Automatic uploads remain disabled.

## References

- Entire CLI: https://github.com/entireio/cli
- Codex cloud setup: https://learn.chatgpt.com/docs/environments/cloud-environment
- Codex hook trust: https://learn.chatgpt.com/docs/hooks
