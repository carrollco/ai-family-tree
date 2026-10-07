import { chromium } from "/home/cagst/projects/whereisit/node_modules/playwright/index.mjs";
import fs from "fs";
const BASE = "http://127.0.0.1:8793/index.html";
const verified = new Set(fs.readFileSync("verified-urls.txt", "utf8").split("\n").filter(Boolean));
const results = [];
const check = (name, ok, detail) => { results.push({name, ok, detail}); console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " :: " + detail : "")); };
const b = await chromium.launch();
async function page(w, hgt, url){
  const p = await b.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: w < 500 ? 2 : 1, hasTouch: w < 500, isMobile: w < 500 });
  p.errs = [];
  p.on("pageerror", e => p.errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") p.errs.push("console.error: " + m.text()); });
  await p.goto(url || BASE); await p.waitForTimeout(700);
  return p;
}
const overflow = p => p.evaluate(() => {
  const cw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
  const bad = [];
  if (sw > cw) for (const el of document.querySelectorAll("body *")){
    if (el.closest(".canvas")) continue;
    const r = el.getBoundingClientRect();
    if (r.right > cw + 0.5 && r.width > 0) bad.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${el.className && el.className.baseVal === undefined ? el.className : ""} right=${Math.round(r.right)}`);
  }
  return {cw, sw, bad: bad.slice(0, 8)};
});
const sel = p => p.evaluate(() => { const g = document.querySelector(".node.sel"); return g ? g.dataset.id : null; });
const dimmed = p => p.evaluate(() => [...document.querySelectorAll(".node.dim")].map(g => g.dataset.id));
for (const [w, hgt] of [[1280, 900], [390, 844]]){
  const tag = w + "px";
  let p = await page(w, hgt);
  const ov = await overflow(p);
  check(`${tag} no horizontal page overflow`, ov.sw <= ov.cw, JSON.stringify(ov));
  await p.screenshot({ path: `../tmp/final-${w}-default.png` });
  // search
  await p.fill("#q", "Hinton"); await p.waitForTimeout(250);
  const s = await p.evaluate(() => ({ first: document.querySelector("#results li .rn")?.textContent, match: document.querySelector('.node[data-id="hinton"]').classList.contains("match"), dim: document.querySelectorAll(".node.dim").length, matchCount: document.querySelectorAll(".node.match").length }));
  check(`${tag} search "Hinton" highlights his node and dims the rest`, s.match && s.dim > 0 && s.first === "Geoffrey Hinton", JSON.stringify(s));
  if (w < 500) await p.screenshot({ path: `../tmp/final-${w}-search.png` });
  await p.press("#q", "Enter"); await p.waitForTimeout(500);
  const afterEnter = await p.evaluate(() => ({ sel: document.querySelector(".node.sel")?.dataset.id, hash: location.hash, title: document.querySelector("#pTitle")?.textContent }));
  check(`${tag} Enter in search selects Hinton`, afterEnter.sel === "hinton" && afterEnter.hash === "#hinton" && afterEnter.title === "Geoffrey Hinton", JSON.stringify(afterEnter));
  // clear, then click a node
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  check(`${tag} Escape clears the selection`, (await sel(p)) === null);
  const lecun = p.locator('.node[data-id="lecun"]');
  await lecun.scrollIntoViewIfNeeded(); await lecun.click(); await p.waitForTimeout(500);
  const pan = await p.evaluate(() => { const hs = [...document.querySelectorAll("#panel h3")].map(x => x.textContent); const lists = [...document.querySelectorAll("#panel ul.links")].map(u => u.children.length); const open = getComputedStyle(document.getElementById("panel")).visibility; return {hs, lists, open, title: document.querySelector("#pTitle")?.textContent}; });
  check(`${tag} clicking a node opens the panel with influenced-by and influenced lists`, pan.title === "Yann LeCun" && pan.hs.includes("Influenced by") && pan.hs.includes("Influenced") && pan.lists.length === 2 && pan.lists.every(n => n > 0) && pan.open === "visible", JSON.stringify(pan));
  if (w < 500) await p.screenshot({ path: `../tmp/final-${w}-lecun-sheet.png` });
  // lineage modes
  const modes = {};
  for (const m of ["both", "up", "down"]){
    await p.evaluate(m => document.querySelector(`#seg button[data-mode="${m}"]`).click(), m); await p.waitForTimeout(150);
    modes[m] = (await dimmed(p)).length;
  }
  check(`${tag} lineage modes change what is dimmed`, modes.both < modes.up && modes.both < modes.down && modes.up !== modes.down, JSON.stringify(modes));
  await p.evaluate(() => document.querySelector('#seg button[data-mode="both"]').click());
  // edge toggles
  const visEdges = () => p.evaluate(() => ({ off: document.querySelectorAll(".edge.off").length, lit: document.querySelectorAll(".edge:not(.dim):not(.off)").length, dimNodes: document.querySelectorAll(".node.dim").length }));
  const before = await visEdges();
  await p.evaluate(() => document.querySelector('#types input[data-type="idea"]').click()); await p.waitForTimeout(150);
  const after = await visEdges();
  await p.evaluate(() => document.querySelector('#types input[data-type="idea"]').click()); await p.waitForTimeout(150);
  check(`${tag} edge-type toggle hides that type and changes the lineage dimming`, after.off > 0 && after.lit < before.lit && after.dimNodes !== before.dimNodes, JSON.stringify({before, after}));
  // edge hover / focus tooltip
  await p.keyboard.press("Escape");
  if (w >= 500){
    const hovered = await p.evaluate(() => {
      const cr = document.getElementById("canvas").getBoundingClientRect();
      for (const hit of document.querySelectorAll('.edge:not(.off) .hit')){
        const len = hit.getTotalLength(), pt = hit.getPointAtLength(len / 2), m = hit.getScreenCTM();
        const x = pt.x * m.a + m.e, y = pt.y * m.d + m.f;
        if (x > cr.left + 5 && x < cr.right - 5 && y > Math.max(cr.top, 0) + 5 && y < Math.min(cr.bottom, innerHeight) - 5 && document.elementFromPoint(x, y) === hit) return {x, y};
      }
      return {x: 0, y: 0};
    });
    // scroll the canvas so the point is visible
    await p.mouse.move(hovered.x - 4, hovered.y); await p.mouse.move(hovered.x, hovered.y, {steps: 3}); await p.waitForTimeout(200);
    const tip = await p.evaluate(() => ({ hidden: document.getElementById("tip").hidden, text: document.getElementById("tip").textContent }));
    check(`${tag} hovering a connection shows its note`, !tip.hidden && tip.text.length > 20, tip.text.slice(0, 120));
    if (!tip.hidden) await p.screenshot({ path: `../tmp/final-${w}-edge-hover.png` });
  }
  const focusTip = await p.evaluate(() => { const f = document.querySelector(".efocus"); f.focus(); const t = document.getElementById("tip"); return {hidden: t.hidden, text: t.textContent}; });
  check(`${tag} focusing a connection with the keyboard shows its note`, !focusTip.hidden && focusTip.text.length > 20, focusTip.text.slice(0, 120));
  await p.evaluate(() => document.activeElement.blur());
  // year slider
  await p.evaluate(() => { const y = document.getElementById("year"); y.value = 1990; y.dispatchEvent(new Event("input", {bubbles: true})); }); await p.waitForTimeout(150);
  const yr = await p.evaluate(() => { const D = JSON.parse(document.getElementById("data").textContent); const dim = new Set([...document.querySelectorAll(".node.dim")].map(g => g.dataset.id)); const late = D.nodes.filter(n => n.year > 1990).map(n => n.id), early = D.nodes.filter(n => n.year <= 1990).map(n => n.id); return {late: late.length, lateDim: late.filter(i => dim.has(i)).length, earlyDim: early.filter(i => dim.has(i)).length, label: document.getElementById("yearOut").textContent}; });
  check(`${tag} year slider at 1990 dims every later name and no earlier one`, yr.late === yr.lateDim && yr.earlyDim === 0, JSON.stringify(yr));
  if (w >= 500) await p.screenshot({ path: `../tmp/final-${w}-year1990.png` });
  await p.click("#resetBtn"); await p.waitForTimeout(200);
  // tour
  await p.click("#tourBtn"); await p.waitForTimeout(600);
  const t1 = await p.evaluate(() => ({ k: document.querySelector("#tourcard:not([hidden]) .tk")?.textContent, sel: document.querySelector(".node.sel")?.dataset.id }));
  await p.click("#tNext"); await p.waitForTimeout(500);
  const t2 = await p.evaluate(() => ({ k: document.querySelector("#tourcard:not([hidden]) .tk")?.textContent, sel: document.querySelector(".node.sel")?.dataset.id }));
  await p.evaluate(() => document.activeElement.blur()); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(500);
  const t3 = await p.evaluate(() => ({ k: document.querySelector("#tourcard:not([hidden]) .tk")?.textContent, sel: document.querySelector(".node.sel")?.dataset.id }));
  await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(400);
  const t4 = await p.evaluate(() => document.querySelector("#tourcard:not([hidden]) .tk")?.textContent);
  const midBtn = await p.evaluate(() => document.getElementById("tourBtn").textContent);
  check(`${tag} during the tour the top button reads Exit tour and the card has Play`, /Exit tour/.test(midBtn) && !!(await p.$("#tPlay")), midBtn);
  check(`${tag} guided tour starts, advances with Next and ArrowRight, goes back with ArrowLeft`, /stop 1 of 14/.test(t1.k) && t1.sel === "turing" && /stop 2 of/.test(t2.k) && t2.sel === "mccarthy" && /stop 3 of/.test(t3.k) && t3.sel === "rosenblatt" && /stop 2 of/.test(t4), JSON.stringify({t1, t2, t3, t4}));
  await p.screenshot({ path: `../tmp/final-${w}-tour.png` });
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  const tourOff = await p.evaluate(() => !document.querySelector("#tourcard:not([hidden])") && /Guided tour/.test(document.getElementById("tourBtn").textContent));
  check(`${tag} Escape exits the tour and the top button reads Guided tour again`, tourOff);
  // click empty space clears selection
  await p.evaluate(() => { location.hash = "#bert"; }); await p.waitForTimeout(500);
  const hashSel = await sel(p);
  await p.evaluate(() => { const r = document.querySelector('rect[data-bg]'); r.dispatchEvent(new MouseEvent("click", {bubbles: true})); }); await p.waitForTimeout(200);
  check(`${tag} changing the hash selects a node, clicking empty space clears it`, hashSel === "bert" && (await sel(p)) === null, `hash->${hashSel}`);
  check(`${tag} no page errors or console errors`, p.errs.length === 0, p.errs.join(" | "));
  await p.close();
  // deep link #hinton with quote card
  p = await page(w, hgt, BASE + "#hinton");
  const q = await p.evaluate(() => { const f = document.querySelector("#panel .quote"); const a = f?.querySelector("a"); return {sel: document.querySelector(".node.sel")?.dataset.id, quote: f?.querySelector("blockquote")?.textContent, href: a?.getAttribute("href"), label: a?.textContent, cap: f?.querySelector("figcaption")?.textContent}; });
  check(`${tag} #hinton opens Hinton with the quote card`, q.sel === "hinton" && q.quote === "“It's a trillion real numbers and nobody quite knows how they work.”" && q.href === "https://www.youtube.com/watch?v=l6ZcFa8pybE&t=3121s" && /StarTalk video at 52:01/.test(q.label) && /28 February 2026/.test(q.cap) && /captions/.test(q.cap), JSON.stringify(q));
  await p.screenshot({ path: `../tmp/final-${w}-hinton.png` });
  if (w < 500){ await p.evaluate(() => { document.getElementById("panel").scrollTop = 400; }); await p.waitForTimeout(150); await p.screenshot({ path: `../tmp/final-${w}-hinton-scrolled.png` }); }
  // every link in the page (collect panel links for every node)
  const hrefs = await p.evaluate(async () => {
    const D = JSON.parse(document.getElementById("data").textContent); const all = new Set();
    for (const a of document.querySelectorAll("a[href]")) all.add(a.getAttribute("href"));
    for (const n of D.nodes){ location.hash = "#" + n.id; await new Promise(r => setTimeout(r, 30)); for (const a of document.querySelectorAll("a[href]")) all.add(a.getAttribute("href")); }
    return [...all];
  });
  const external = hrefs.filter(hh => /^https?:/.test(hh)), internal = hrefs.filter(hh => !/^https?:/.test(hh));
  const bad = external.filter(hh => !verified.has(hh));
  check(`${tag} every external link resolved during the fact check (${external.length} links)`, bad.length === 0 && internal.every(x => x.startsWith("#")), JSON.stringify({bad, internal}));
  check(`${tag} deep-link page has no errors`, p.errs.length === 0, p.errs.join(" | "));
  await p.close();
}
// geometry: overlaps, text overflow, lines behind boxes (desktop)
{
  const p = await page(1280, 900);
  const g = await p.evaluate(() => {
    const boxes = [...document.querySelectorAll(".node")].map(n => { const r = n.querySelector(".box").getBBox(); const m = n.transform.baseVal.consolidate().matrix; return {id: n.dataset.id, x: m.e, y: m.f, w: r.width, h: r.height, t: n.querySelector(".t").getBBox().width, s: n.querySelector(".s").getBBox().width}; });
    const over = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++){ const a = boxes[i], c = boxes[j]; if (a.x < c.x + c.w + 6 && c.x < a.x + a.w + 6 && a.y < c.y + c.h && c.y < a.y + a.h) over.push(a.id + "/" + c.id); }
    const textOver = boxes.filter(bx => Math.max(bx.t, bx.s) > bx.w - 16).map(bx => bx.id);
    const behind = [];
    for (const e of document.querySelectorAll(".edge")){
      const path = e.querySelector(".line"), len = path.getTotalLength(), D = JSON.parse(document.getElementById("data").textContent), ed = D.edges[Number(e.dataset.i)];
      for (const bx of boxes){ if (bx.id === ed.from || bx.id === ed.to) continue;
        for (let k = 2; k < 60; k++){ const pt = path.getPointAtLength(len * k / 62); if (pt.x > bx.x - 2 && pt.x < bx.x + bx.w + 2 && pt.y > bx.y - 2 && pt.y < bx.y + bx.h + 2){ behind.push(`${ed.from}->${ed.to} behind ${bx.id}`); break; } } }
    }
    return {n: boxes.length, over, textOver, behind};
  });
  check("node boxes do not overlap each other", g.over.length === 0, g.over.join(", "));
  check("node text fits inside its box", g.textOver.length === 0, g.textOver.join(", "));
  check("no connection line passes behind an unrelated box", g.behind.length === 0, g.behind.join(", "));
  await p.close();
}
// reduced motion and no dark-mode block
{
  const html = fs.readFileSync("/home/cagst/projects/ai-family-tree/index.html", "utf8");
  check("no prefers-color-scheme block in the page", !/prefers-color-scheme/.test(html));
  check("respects prefers-reduced-motion", /prefers-reduced-motion:\s*reduce/.test(html));
  check("no em or en dashes in the page", !/[–—]/.test(html));
  check("no external scripts, styles, fonts or images", !/<script[^>]+src=|<link[^>]+stylesheet|@import|url\(http|<img/i.test(html));
}
await b.close();
fs.writeFileSync("verify-results.json", JSON.stringify(results, null, 1));
console.log(`\n${results.filter(r => r.ok).length}/${results.length} checks passed`);
