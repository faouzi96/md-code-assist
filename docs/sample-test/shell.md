# Shell / Bash / Zsh — Formatter + Diagnostics Test

Press `Shift+Alt+F` to format all blocks. Formatting uses the [mkhl.shfmt](https://marketplace.visualstudio.com/items?itemName=mkhl.shfmt) extension (auto-installed, no system shfmt needed). Diagnostics use [timonwong.shellcheck](https://marketplace.visualstudio.com/items?itemName=timonwong.shellcheck) (auto-installed).
Check **View → Output → Markdown Code Assistant** if blocks are skipped.

---

## Formatting — basic script (shfmt will fix indentation and spacing)

```sh
#!/bin/sh
NAME=$1
if [ -z "$NAME" ]; then
  echo "Usage: $0 <name>"
  exit 1

fi
echo "Hello, $NAME!"
```

## Formatting — bash functions

```bash
#!/usr/bin/env bash
set -euo pipefail

log() {
  local level=$1
  shift
  echo "[$level] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >&2
}

retry() {

  local attempts=$1
  local delay=$2
  shift 2
  local i

  for i in $(seq 1 "$attempts"); do
    "$@" && return 0
    log WARN "Attempt $i/$attempts failed, retrying in ${delay}s..."
    sleep "$delay"
  done
  log ERROR "All $attempts attempts failed"
  return 1
}
```

## Formatting — conditionals and loops

```bash
#!/usr/bin/env bash

DIRS=(/tmp /var/log /home)

for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "$dir exists"
  elif [ -f "$dir" ]; then
    echo "$dir is a file, not a directory"
  else
    echo "$dir does not exist"
  fi
done

# C-style loop
for ((i = 0; i < 10; i++)); do
  echo "Index: $i"
done
```

## Formatting — here-docs and subshells

```bash
#!/usr/bin/env bash

generate_config() {
  local host=$1
  local port=$2
  cat << EOF
server {
    listen ${port};
    server_name ${host};

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF
}

VERSION=$(git describe --tags --always 2> /dev/null || echo "unknown")
COMMIT=$(git rev-parse --short HEAD 2> /dev/null || echo "unknown")
echo "Version: $VERSION ($COMMIT)"
```

## Formatting — zsh-specific features

```zsh
#!/usr/bin/env zsh
setopt ERR_EXIT PIPE_FAIL NO_UNSET

autoload -U colors && colors

info(){ print -P "%F{green}[INFO]%f $*" }
warn(){ print -P "%F{yellow}[WARN]%f $*" }
error(){ print -P "%F{red}[ERROR]%f $*" >&2 }

typeset -A CONFIG
CONFIG=(host localhost port 8080 debug false)

for key val in ${(kv)CONFIG};do
info "$key = $val"
done
```

## Formatting — case statements and arrays

```bash
#!/usr/bin/env bash

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      -h | --help)
        echo "Usage: script.sh [options]"
        exit 0
        ;;
      -v | --verbose)
        VERBOSE=true
        shift
        ;;
      -o | --output)
        OUTPUT="$2"
        shift 2
        ;;
      *)
        echo "Unknown option: $1"
        exit 1
        ;;
    esac
  done
}
```
