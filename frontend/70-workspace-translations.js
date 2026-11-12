// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ---------------------------------------------------- workspace headers */
	// Section headers on a workspace page ("Reports & Masters") are stored as
	// HTML inside the workspace. v14 shows them untranslated, and v15 and v16
	// look them up with the ampersand still escaped, so many stay English.
	// Gulf translates the words that are shown and, when the workspace is
	// saved, hands back the stored text unchanged unless the user edited the
	// header. Saving a workspace in Arabic then no longer stores the Arabic.
	function ws_header_text(node) {
		var raw = node.nodeValue || "";
		var t = raw.replace(/^\s+|\s+$/g, "");
		if (!t || !/[A-Za-z]/.test(t)) return null;
		var tr = T(t);
		if (tr === t) tr = T(esc(t));
		if (tr === t || tr === esc(t)) return null;
		return raw.replace(t, tr);
	}
	function text_nodes(root) {
		var out = [];
		var walker = document.createTreeWalker(root, 4, null, false);
		while (walker.nextNode()) {
			if (/\S/.test(walker.currentNode.nodeValue || "")) out.push(walker.currentNode);
		}
		return out;
	}
	function patch_ws_headers() {
		var blocks = window.frappe && frappe.workspace_block && frappe.workspace_block.blocks;
		var H = blocks && blocks.header;
		if (!H || !H.prototype || H.prototype._ge_patched || !Object.getOwnPropertyDescriptor) return;
		var desc = Object.getOwnPropertyDescriptor(H.prototype, "data");
		if (!desc || !desc.get || !desc.set) return;
		H.prototype._ge_patched = true;
		// The stored text for what the block shows now.
		function stored_text(blk, text) {
			if (blk._ge_shown == null || typeof text !== "string") return text;
			if (text === blk._ge_shown) return blk._ge_orig;
			// Changed in edit mode (a new size, or new words): put the stored
			// words back wherever the translation is still shown.
			var box = document.createElement("div");
			box.innerHTML = text;
			var nodes = text_nodes(box);
			var back = blk._ge_back || {};
			for (var i = 0; i < nodes.length; i++) {
				var v = nodes[i].nodeValue;
				if (Object.prototype.hasOwnProperty.call(back, v)) nodes[i].nodeValue = back[v];
			}
			return box.innerHTML;
		}
		// The editor saves a block through save(), other code reads .data.
		var save = H.prototype.save;
		if (typeof save === "function") {
			H.prototype.save = function () {
				var out = save.apply(this, arguments);
				if (out && typeof out.text === "string") {
					var shown = this._ge_shown == null ? null : this._ge_shown.replace(/&nbsp;/gi, "");
					out.text = out.text === shown ? this._ge_orig : stored_text(this, out.text);
				}
				return out;
			};
		}
		Object.defineProperty(H.prototype, "data", {
			configurable: true,
			get: function () {
				var d = desc.get.call(this);
				if (d) d.text = stored_text(this, d.text);
				return d;
			},
			set: function (data) {
				desc.set.call(this, data);
				this._ge_shown = null;
				this._ge_back = null;
				var el = this._element;
				if (!el || !data || data.text === undefined) return;
				if (!document.documentElement.classList.contains("gulf")) return;
				var orig = String(data.text || "");
				var probe = document.createElement("div");
				probe.innerHTML = orig;
				var shown = text_nodes(el);
				for (var i = 0; i < shown.length; i++) {
					var tr = ws_header_text(shown[i]);
					if (tr != null) shown[i].nodeValue = tr;
				}
				// Only take over when the words shown differ from the stored ones
				// (translated by Gulf here, or by Frappe itself on v15 and v16).
				if ((el.textContent || "") === (probe.textContent || "")) return;
				var stored = text_nodes(probe);
				var back = {};
				if (stored.length === shown.length) {
					for (var j = 0; j < shown.length; j++) {
						if (shown[j].nodeValue !== stored[j].nodeValue) back[shown[j].nodeValue] = stored[j].nodeValue;
					}
				}
				this._ge_orig = orig;
				this._ge_shown = el.innerHTML;
				this._ge_back = back;
			},
		});
	}
	patch_ws_headers();
