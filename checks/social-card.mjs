// Renders images/social-card.png, the link-preview image the og:image tag names: the page opened on
// Geoffrey Hinton (the name the launch post points at), in a 1200 x 627 desktop viewport, LinkedIn's
// minimum size for its large preview card. His photo's credit is in the panel the card shows.
// Rerun it when the page changes. Serve the folder on port 8793 as for verify.mjs, then:
//   cd checks && node social-card.mjs
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 1 });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console.error: " + m.text()); });
await p.goto("http://127.0.0.1:8793/index.html#hinton");
await p.waitForFunction(() => [...document.querySelectorAll("image.face")].every(i => i.dataset.loaded === "1"), null, { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(1500);
await p.screenshot({ path: new URL("../images/social-card.png", import.meta.url).pathname });
await b.close();
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
console.log("wrote images/social-card.png");
