"""Build the checked-in browser asset; no Node packages or network required."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
fragments = sorted((root / "frontend").glob("*.js"))
content = "/* Gulf ERP Theme. See THIRD_PARTY_NOTICES.md. SPDX-License-Identifier: AGPL-3.0-only */\n(function () {\n\"use strict\";\n"
content += "\n".join(path.read_text(encoding="utf-8") for path in fragments)
content += "\n})();\n"
target = root / "gulf_erp_theme/public/js/gulf_erp_theme.js"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(content, encoding="utf-8")
print("Built", target.name, "from", len(fragments), "feature sources")
