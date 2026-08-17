// dsh-eye-upload web client: a "📷" button in the composer tool row
// (conversation.input.left slot). Picks an image, uploads it to
// /dsh-eye-upload, and fills the draft with the saved path so the agent
// can view it with the image_understand tool.
window.__ModuleLoader__.load({ id: "dsh-eye-upload", factory: (require) => {
  var module = { exports: {} };
  var exports = module.exports;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  const react = require("react");

  const NS = "eye-upload";
  const name = "eye-upload";
  const inject = ["slots"];

  const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

  function base64FromBuffer(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  function EyeUploadButton(props) {
    // Framework session kit: props.inputActions (InputActions), owner share
    // props.input (InputState with .draft).
    const inputRef = react.useRef(null);
    const [busy, setBusy] = react.useState(false);
    const [error, setError] = react.useState("");
    const actions = props.inputActions;
    const input = props.input;

    const onFile = async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (!ACCEPT.split(",").includes(file.type)) {
        setError("仅支持 PNG / JPG / WebP / GIF");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const buf = await file.arrayBuffer();
        const res = await fetch("/dsh-eye-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaType: file.type, name: file.name, data: base64FromBuffer(buf) }),
        });
        const body = await res.json().catch(() => ({}));
        if (!body || body.ok !== true) throw new Error((body && body.error) || ("HTTP " + res.status));
        const text = "请用 image_understand 查看这张图片：" + body.path;
        const current = input && typeof input.draft === "string" ? input.draft : "";
        actions.setDraft(current.trim() ? current + "\n" + text : text);
      } catch (err) {
        setError(String((err && err.message) || err));
      } finally {
        setBusy(false);
      }
    };

    return react.createElement("span", { style: st.wrap, title: "发图给眼睛（image_understand）" },
      react.createElement("input", {
        ref: inputRef, type: "file", accept: ACCEPT,
        style: { display: "none" }, onChange: onFile,
      }),
      react.createElement("button", {
        type: "button",
        disabled: busy || !actions,
        onClick: () => inputRef.current && inputRef.current.click(),
        style: st.button,
        "aria-label": "发图给眼睛",
      }, busy ? "⏳" : "📷"),
      error
        ? react.createElement("span", { style: st.error, title: error }, "⚠")
        : null,
    );
  }

  const st = {
    wrap: { display: "inline-flex", alignItems: "center", gap: 4, marginRight: 2 },
    button: {
      width: 28, height: 28, border: "1px solid #3d444d", borderRadius: 6,
      background: "transparent", color: "#e6edf3", cursor: "pointer",
      fontSize: 14, lineHeight: 1, display: "inline-flex", alignItems: "center",
      justifyContent: "center",
    },
    error: { color: "#f85149", fontSize: 12 },
  };

  function apply(ctx) {
    ctx.slots.inject("conversation.input.left", () =>
      ctx.slots.register({
        name: "conversation.input.left",
        id: "eye-upload",
        order: 50,
        locale: NS,
        inject: () => ({}),
      }, EyeUploadButton));
  }

  Object.defineProperty(exports, "name", { value: name });
  Object.defineProperty(exports, "inject", { value: inject });
  Object.defineProperty(exports, "apply", { value: apply });
  module.exports = exports;
  return module.exports;
}});
