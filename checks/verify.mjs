// Playwright from the usual place, or from PLAYWRIGHT_MODULE (a path to its index.mjs).
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import fs from "fs";
const BASE = "http://127.0.0.1:8793/index.html";
const verified = new Set(fs.readFileSync("verified-urls.txt", "utf8").split("\n").filter(Boolean));
const results = [];
const check = (name, ok, detail) => { results.push({name, ok, detail}); console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " :: " + detail : "")); };
const b = await chromium.launch();
const requests = [];   // every URL any page asked for, checked at the end against the same-origin rule
async function page(w, hgt, url){
  const p = await b.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: w < 500 ? 2 : 1, hasTouch: w < 500, isMobile: w < 500 });
  p.errs = [];
  p.on("pageerror", e => p.errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") p.errs.push("console.error: " + m.text()); });
  p.on("request", r => requests.push(r.url()));
  await p.goto(url || BASE); await p.waitForTimeout(700);
  return p;
}
const FACES_DIR = new URL("../images/faces/", import.meta.url);
/* For every person: the map and the panel each show one circle per person named, a photo that loads
   (with alt text) or an aria-hidden initials badge; and each photo's panel credit has the license link
   and the Commons file link, as data says, both among the fetched-and-verified URLs. */
async function faceChecks(p, tag){
  await p.waitForFunction(() => [...document.querySelectorAll("image.face")].every(i => i.dataset.loaded === "1"), null, {timeout: 8000}).catch(() => {});
  const r = await p.evaluate(async () => {
    const D = JSON.parse(document.getElementById("data").textContent), people = D.nodes.filter(n => n.kind === "person");
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const loads = src => new Promise(res => { const im = new Image(); im.onload = () => res(im.naturalWidth); im.onerror = () => res(0); im.src = src; });
    const bad = [], credits = []; let photos = 0, badges = 0;
    for (const n of people){
      const faces = n.faces || [], g = document.querySelector(`.node[data-id="${n.id}"]`);
      const ims = [...g.querySelectorAll("image.face")], bs = [...g.querySelectorAll(".badge")];
      if (!faces.length || ims.length + bs.length !== faces.length) bad.push(`${n.id}: map shows ${ims.length} photos and ${bs.length} badges for ${faces.length} people`);
      for (const im of ims){ const src = im.getAttribute("href"), nw = await loads(src); photos++;
        if (!(nw > 0) || im.dataset.loaded !== "1" || !/^images\/faces\//.test(src)) bad.push(`${n.id}: map photo ${src} loaded=${im.dataset.loaded} naturalWidth=${nw}`); }
      for (const x of bs){ badges++; if (x.getAttribute("aria-hidden") !== "true" || !/^[A-Z]{1,2}$/.test(x.textContent)) bad.push(`${n.id}: map badge "${x.textContent}" aria-hidden=${x.getAttribute("aria-hidden")}`); }
      location.hash = "#" + n.id; await sleep(40);
      const pims = [...document.querySelectorAll("#panel img.pface")], pbs = [...document.querySelectorAll("#panel .pface.badge")];
      for (const im of pims) if (!im.complete) await new Promise(res => { im.addEventListener("load", res); im.addEventListener("error", res); });
      const wantAlt = faces.filter(f => f.img).map(f => "Photo of " + f.name);
      if (pims.length + pbs.length !== faces.length) bad.push(`${n.id}: panel shows ${pims.length + pbs.length} faces for ${faces.length} people`);
      if (JSON.stringify(pims.map(i => i.alt)) !== JSON.stringify(wantAlt)) bad.push(`${n.id}: panel alt text ${JSON.stringify(pims.map(i => i.alt))}`);
      for (const im of pims) if (!(im.naturalWidth > 0) || !/^images\/faces\//.test(im.getAttribute("src"))) bad.push(`${n.id}: panel photo ${im.getAttribute("src")} naturalWidth=${im.naturalWidth}`);
      if (pbs.some(x => x.getAttribute("aria-hidden") !== "true")) bad.push(`${n.id}: a panel badge is not aria-hidden`);
      if (document.getElementById("pTitle")?.textContent !== n.name) bad.push(`${n.id}: panel title is not the name`);
      credits.push({id: n.id, want: faces.filter(f => f.img), none: faces.filter(f => !f.img).map(f => f.name),
        got: [...document.querySelectorAll("#panel .credit:not(.nophoto)")].map(c => ({text: c.textContent, links: [...c.querySelectorAll("a")].map(a => ({href: a.getAttribute("href"), text: a.textContent, target: a.target}))})),
        nophoto: [...document.querySelectorAll("#panel .credit.nophoto")].map(c => c.textContent)});
    }
    location.hash = ""; await sleep(40);
    return {people: people.length, photos, badges, bad, credits};
  });
  check(`${tag} every person shows a photo that loads or an initials badge, in the map and the panel (${r.people} people, ${r.photos} photos, ${r.badges} badges)`, r.bad.length === 0 && r.people > 0 && r.photos > 0, r.bad.join(" | "));
  const cbad = [];
  for (const c of r.credits){
    if (c.got.length !== c.want.length) cbad.push(`${c.id}: ${c.got.length} credits for ${c.want.length} photos`);
    c.want.forEach((f, i) => {
      const g = c.got[i]; if (!g) return;
      const [lic, file] = g.links;
      if (g.links.length !== 2) cbad.push(`${c.id}: credit has ${g.links.length} links`);
      if (!g.text.startsWith("Photo") || !g.text.includes(f.author) || !g.text.includes("via Wikimedia Commons") || !g.text.includes("cropped and resized")) cbad.push(`${c.id}: credit text "${g.text}"`);
      if (!lic || lic.href !== f.licenseUrl || !lic.text.includes(f.license) || !/\((creativecommons\.org|license section on Wikimedia Commons)\) ↗/.test(lic.text) || !verified.has(lic.href)) cbad.push(`${c.id}: license link ${JSON.stringify(lic)}`);
      if (!file || file.href !== f.file || !file.href.startsWith("https://commons.wikimedia.org/wiki/File:") || !file.text.includes("Wikimedia Commons file ↗") || !verified.has(file.href)) cbad.push(`${c.id}: file link ${JSON.stringify(file)}`);
      if (g.links.some(l => l.target !== "_blank")) cbad.push(`${c.id}: a credit link does not open a new tab`);
    });
    if (c.none.length && !c.nophoto.some(t => c.none.every(nm => t.includes(nm)))) cbad.push(`${c.id}: no line says why ${c.none.join(", ")} has no photo`);
  }
  const nCred = r.credits.reduce((s, c) => s + c.got.length, 0);
  check(`${tag} every photo is credited in its panel with a license link and a Commons file link, all fetched and verified (${nCred} credits)`, cbad.length === 0 && nCred === r.photos, cbad.join(" | "));
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
  const worst = await p.evaluate(() => {
    const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const ratio = col => { const m = col.match(/\d+/g).map(Number); return 1.05 / (0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]) + 0.05); };
    const fills = [...document.querySelectorAll("#tree circle")].filter(c => c.parentNode.querySelector("text") && /^[A-Z]{1,2}$/.test(c.parentNode.querySelector("text").textContent)).map(c => getComputedStyle(c).fill).filter(f => /^rgb/.test(f) && f !== "rgb(255, 255, 255)");
    return fills.length ? Math.min(...fills.map(ratio)) : null;
  });
  check(`${tag} initials badges reach 4.5:1 contrast with their white letters`, worst === null || worst >= 4.5, String(worst));
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
  await faceChecks(p, tag);
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
    /* a person's name and date start right of the faces at the left end of the pill */
    const faceClash = [...document.querySelectorAll(".node.person")].map(n => {
      const right = Math.max(...[...n.querySelectorAll("image.face")].map(i => i.x.baseVal.value + i.width.baseVal.value), ...[...n.querySelectorAll(".badge circle")].map(c => c.cx.baseVal.value + c.r.baseVal.value));
      const left = Math.min(n.querySelector(".t").getBBox().x, n.querySelector(".s").getBBox().x);
      return {id: n.dataset.id, ok: Number.isFinite(right) && left >= right + 3};
    }).filter(x => !x.ok).map(x => x.id);
    const behind = [];
    for (const e of document.querySelectorAll(".edge")){
      const path = e.querySelector(".line"), len = path.getTotalLength(), D = JSON.parse(document.getElementById("data").textContent), ed = D.edges[Number(e.dataset.i)];
      for (const bx of boxes){ if (bx.id === ed.from || bx.id === ed.to) continue;
        for (let k = 2; k < 60; k++){ const pt = path.getPointAtLength(len * k / 62); if (pt.x > bx.x - 2 && pt.x < bx.x + bx.w + 2 && pt.y > bx.y - 2 && pt.y < bx.y + bx.h + 2){ behind.push(`${ed.from}->${ed.to} behind ${bx.id}`); break; } } }
    }
    return {n: boxes.length, over, textOver, faceClash, behind};
  });
  check("node boxes do not overlap each other", g.over.length === 0, g.over.join(", "));
  check("node text fits inside its box", g.textOver.length === 0, g.textOver.join(", "));
  check("every person's name and date clear the faces at the start of the pill", g.faceClash.length === 0, g.faceClash.join(", "));
  check("no connection line passes behind an unrelated box", g.behind.length === 0, g.behind.join(", "));
  await p.close();
}
// reduced motion and no dark-mode block
{
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  check("no prefers-color-scheme block in the page", !/prefers-color-scheme/.test(html));
  check("respects prefers-reduced-motion", /prefers-reduced-motion:\s*reduce/.test(html));
  check("no em or en dashes in the page", !/[–—]/.test(html));
  /* The one relaxation: same-origin face photos under images/faces/. Checked in the source (any img or
     image tag, and every face path in the data) and at run time (every request any page made). */
  const D = JSON.parse(html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)[1]);
  const facePaths = D.nodes.flatMap(n => (n.faces || []).filter(f => f.img).map(f => f.img));
  const tagSrcs = [...html.matchAll(/<(?:img|image)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']*)/gi)].map(m => m[1]);
  const okPath = x => /^images\/faces\/[a-z0-9-]+\.(jpg|webp)$/.test(x);
  const origin = new URL(BASE).origin, offRule = [...new Set(requests)].filter(u => { const x = new URL(u); return x.origin !== origin || !(x.pathname === "/index.html" || /^\/images\/faces\/[a-z0-9-]+\.(jpg|webp)$/.test(x.pathname)); });
  check("no external scripts, styles, fonts or images (the only images are same-origin files under images/faces/)",
    !/<script[^>]+src=|<link[^>]+stylesheet|@import|url\(http/i.test(html) && tagSrcs.every(okPath) && facePaths.length > 0 && facePaths.every(okPath) && offRule.length === 0,
    JSON.stringify({tagSrcs: tagSrcs.filter(x => !okPath(x)), facePaths: facePaths.filter(x => !okPath(x)), offRule}));
}
// face files: each small, the folder under 600 KB, and exactly the files the data uses
{
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const D = JSON.parse(html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)[1]);
  const used = new Set(D.nodes.flatMap(n => (n.faces || []).filter(f => f.img).map(f => f.img.replace(/^images\/faces\//, ""))));
  const files = fs.readdirSync(FACES_DIR).map(f => ({f, bytes: fs.statSync(new URL(f, FACES_DIR)).size}));
  const total = files.reduce((s, x) => s + x.bytes, 0), big = files.filter(x => x.bytes > 20 * 1024).map(x => `${x.f} ${x.bytes} B`);
  const unused = files.map(x => x.f).filter(f => !used.has(f)), missing = [...used].filter(f => !files.some(x => x.f === f));
  check(`images/faces/ is under 600 KB (${(total / 1024).toFixed(1)} KB in ${files.length} files, each under 20 KB) and holds exactly the photos the page uses`,
    total < 600 * 1024 && big.length === 0 && unused.length === 0 && missing.length === 0, JSON.stringify({big, unused, missing}));
}
await b.close();
fs.writeFileSync(new URL("../tmp/verify-results.json", import.meta.url), JSON.stringify(results, null, 1));
console.log(`\n${results.filter(r => r.ok).length}/${results.length} checks passed`);
