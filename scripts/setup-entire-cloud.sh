#!/usr/bin/env bash
# Use from the repository root in a Codex cloud setup/maintenance script.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"
entire_version="0.11.3"
case "$(uname -m)" in
  x86_64) entire_arch="amd64" ;;
  aarch64|arm64) entire_arch="arm64" ;;
  *) printf 'Unsupported architecture: %s\n' "$(uname -m)" >&2; exit 1 ;;
esac
if [[ "$(uname -s)" != "Linux" ]]; then
  printf 'This setup script targets Linux cloud containers.\n' >&2
  exit 1
fi

if [[ -w /usr/local/bin ]]; then
  entire_bin_dir="/usr/local/bin"
else
  entire_bin_dir="$HOME/.local/bin"
  mkdir -p "$entire_bin_dir"
fi
export PATH="$entire_bin_dir:$PATH"
entire_installed_version="$(entire version 2>/dev/null | head -n 1 || true)"
if [[ "$entire_installed_version" != "Entire CLI $entire_version" ]]; then
  entire_tmp="$(mktemp -d)"
  trap 'rm -rf -- "$entire_tmp"' EXIT
  entire_archive="entire_linux_${entire_arch}.tar.gz"
  entire_release="https://github.com/entireio/cli/releases/download/v${entire_version}"
  curl --fail --silent --show-error --location --retry 3 "$entire_release/$entire_archive" -o "$entire_tmp/$entire_archive"
  curl --fail --silent --show-error --location --retry 3 "$entire_release/checksums.txt" -o "$entire_tmp/checksums.txt"
  entire_checksum="$(awk -v file="$entire_archive" '$2 == file { print $1 }' "$entire_tmp/checksums.txt")"
  [[ "$entire_checksum" =~ ^[[:xdigit:]]{64}$ ]] || { printf 'Missing valid release checksum.\n' >&2; exit 1; }
  (cd "$entire_tmp" && printf '%s  %s\n' "$entire_checksum" "$entire_archive" | sha256sum --check --status)
  tar -xzf "$entire_tmp/$entire_archive" -C "$entire_tmp"
  install -m 0755 "$entire_tmp/entire" "$entire_bin_dir/entire"
  install -m 0755 "$entire_tmp/git-remote-entire" "$entire_bin_dir/git-remote-entire"
fi

# Setup exports do not persist to the agent phase. Set PATH in environment
# settings too; absolute Git-hook paths do not depend on shell startup files.
entire enable --agent codex --local --telemetry=false --skip-push-sessions --absolute-git-hook-path
entire version
entire status --json
npm ci
printf '\nSetup complete. Review Codex hooks before expecting session capture.\n'
