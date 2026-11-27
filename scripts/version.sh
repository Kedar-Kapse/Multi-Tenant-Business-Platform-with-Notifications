#!/usr/bin/env bash
# One version for the whole platform. It is written in ONE place -- the root pom.xml --
# and this script copies it everywhere else, so nothing is forgotten.
#
#   bash scripts/version.sh get            print the version, e.g. 1.1.0-SNAPSHOT
#   bash scripts/version.sh check          fail if any file has a different version
#   bash scripts/version.sh set 1.1.0      set it everywhere (root pom, the services'
#                                          <parent>, service-registry, the 3 portals)
#
# The Java services inherit the version from the root pom (and use platform-core at
# ${project.version}), so they need no change of their own.
# The pipeline tags the Docker images with this version (see docker-publish.yml).

set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PY'
import json, re, sys
from pathlib import Path

ROOT_POM = Path("pom.xml")
CHILD_POMS = [Path(p) for p in ("platform-core/pom.xml", "access-security-service/pom.xml",
              "admin-service/pom.xml", "api-gateway/pom.xml", "business-service/pom.xml",
              "notification-service/pom.xml")]
STANDALONE_POMS = [Path("service-registry/pom.xml")]   # not a module of the root pom
PACKAGES = [Path(p) for p in ("admin-portal/package.json", "provider-portal/package.json",
            "patient-portal/package.json")]
SEMVER = re.compile(r"^\d+\.\d+\.\d+(-SNAPSHOT)?$")

def own_version(text):
    """The project's own <version>: the first one after </parent>."""
    after = text.split("</parent>", 1)[1]
    m = re.search(r"<version>([^<]+)</version>", after)
    return m.group(1).strip() if m else None

def set_own_version(text, version):
    head, after = text.split("</parent>", 1)
    after, n = re.subn(r"<version>[^<]+</version>", f"<version>{version}</version>", after, count=1)
    assert n == 1
    return head + "</parent>" + after

def parent_version(text):
    block = re.search(r"<parent>.*?</parent>", text, re.S).group(0)
    return re.search(r"<version>([^<]+)</version>", block).group(1).strip()

def set_parent_version(text, version):
    def fix(m):
        return re.sub(r"<version>[^<]+</version>", f"<version>{version}</version>", m.group(0), count=1)
    return re.sub(r"<parent>.*?</parent>", fix, text, count=1, flags=re.S)

def package_version(path):
    return json.loads(path.read_text())["version"]

def set_package_version(path, version):
    text = path.read_text()
    text, n = re.subn(r'("version"\s*:\s*")[^"]*(")', rf'\g<1>{version}\2', text, count=1)
    assert n == 1
    path.write_text(text)
    # package-lock.json repeats the project's own version (top level and packages[""])
    lock = path.with_name("package-lock.json")
    if lock.exists():
        data = json.loads(lock.read_text())
        data["version"] = version
        if "" in data.get("packages", {}):
            data["packages"][""]["version"] = version
        lock.write_text(json.dumps(data, indent=2) + "\n")

def current():
    return own_version(ROOT_POM.read_text())

def mismatches():
    want = current()
    bad = []
    for p in CHILD_POMS:
        text = p.read_text()
        if parent_version(text) != want:
            bad.append(f"{p}: parent version {parent_version(text)}")
        # A service must not set its own <version> (right after its artifactId): it inherits the root one.
        m = re.search(r"</parent>\s*(?:<groupId>[^<]*</groupId>\s*)?<artifactId>[^<]+</artifactId>\s*<version>([^<]+)</version>", text)
        if m:
            bad.append(f"{p}: has its own <version>{m.group(1)}</version> (should inherit)")
        # platform-core must be used at the same version as the service
        for dep in re.findall(r"<artifactId>platform-core</artifactId>\s*<version>([^<]+)</version>", text):
            if dep != "${project.version}":
                bad.append(f"{p}: uses platform-core {dep} (should be ${{project.version}})")
    for p in STANDALONE_POMS:
        if own_version(p.read_text()) != want:
            bad.append(f"{p}: version {own_version(p.read_text())}")
    for p in PACKAGES:
        if package_version(p) != want:
            bad.append(f"{p}: version {package_version(p)}")
        lock = p.with_name("package-lock.json")
        if lock.exists() and json.loads(lock.read_text()).get("version") != want:
            bad.append(f"{lock}: version {json.loads(lock.read_text()).get('version')}")
    return want, bad

args = sys.argv[1:]
cmd = args[0] if args else "get"

if cmd == "get":
    print(current())
elif cmd == "check":
    want, bad = mismatches()
    if bad:
        print(f"Version mismatch (root pom.xml says {want}):", file=sys.stderr)
        for b in bad:
            print("  " + b, file=sys.stderr)
        print("Fix with: bash scripts/version.sh set " + want, file=sys.stderr)
        sys.exit(1)
    print(f"All files at version {want}")
elif cmd == "set" and len(args) == 2:
    version = args[1]
    if not SEMVER.match(version):
        sys.exit(f"'{version}' is not a version like 1.2.0 or 1.2.0-SNAPSHOT")
    ROOT_POM.write_text(set_own_version(ROOT_POM.read_text(), version))
    for p in CHILD_POMS:
        p.write_text(set_parent_version(p.read_text(), version))
    for p in STANDALONE_POMS:
        p.write_text(set_own_version(p.read_text(), version))
    for p in PACKAGES:
        set_package_version(p, version)
    print(f"Version set to {version} in {1 + len(CHILD_POMS) + len(STANDALONE_POMS) + len(PACKAGES)} files")
else:
    sys.exit("usage: bash scripts/version.sh get | check | set <x.y.z[-SNAPSHOT]>")
PY
