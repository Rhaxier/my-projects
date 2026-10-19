// ==UserScript==
// @name         Atomic Titled Players titles
// @match        https://lichess.org/*
// @grant        none
// ==/UserScript==
(() => {
  const TEAM = 'the-atomic-titled-players-team';
  const KEY = 'at-titles-v2', TTL = 3600e3, MIN_ENTRIES = 30;

  const style = document.createElement('style');
style.textContent = `
  #powerTip .upt__info__top {
    display: flex; align-items: center; justify-content: space-between; gap: .5em;
  }
  #powerTip .upt__info__top .user-link { flex: 0 1 auto; white-space: nowrap; overflow: visible; }
  #powerTip .upt__info__top__flag { flex: none; font-size: 0; }
  #powerTip .upt__info__top__flag .flag { font-size: 1rem; }
`;
document.head.appendChild(style);

// keep the country name available as a tooltip
new MutationObserver(() => {
  document.querySelectorAll('#powerTip .upt__info__top__flag:not([title])')
    .forEach(f => { f.title = f.textContent.trim(); });
}).observe(document.body, { childList: true, subtree: true });
  const TITLES = {
    ATCM:  { short: 'ATCM',  full: 'Atomic Candidate Master', rank: 1 },
    ATPM:  { short: 'ATPM',  full: "Atomic Players' Master", rank: 2 },
    ATIM:  { short: 'ATIM',  full: 'Atomic International Master', rank: 3 },
    ATGM:  { short: 'ATGM',  full: 'Atomic Grandmaster', rank: 4 },
    ATSGM: { short: 'ATSGM', full: 'Atomic Super Grandmaster (honorary)', rank: 5 },
  };
  // header text on the team page -> TITLES key
  const HEADERS = { ATCM: 'ATCM', ATPM: 'ATPM', ATIM: 'ATIM', ATGM: 'ATGM', 'HATGM/ATSGM': 'ATSGM' };

  // Fallback snapshot (Oct 18, 2026), used only if the live list can't be read.
  const SEED = {
    ATCM: 'Jesse10 AtomicBlunder E_Y_E_S OgnennyZmey KNIGHTBLADE_123 Fettuccini mike-bear JurrYan Rapida-Atomic Diceroller_Is_Fire grswish Equanimity8 Paul8900 imjustanotherbot RabbieR JanMeLons squiggliey F55555 MmAaxxxxx17 levi_blythe ARM64 bishoy125 bishoy125-alt Blackjack84 naomi9Q MarcotheTiger MarcotheWhale cycl1one EgorShamaev gage12 Leon1001 Francothefalcon Superprosper kakuluffy JakeStateFarm GemXJewelry The-White-Tower I_want_to_be_ninja BoilingWaffle AbsolutelyTrash Surletoit Nathlxchess gooliver10 kevinlel applauchew mdunlop BetrayedBySomeone B4_Bomber Atomic_chess_only atomic_4_ever HOT-ORANGE Pillowcat peaches3 TJMorley sile314 EzraTgreat iamplayingchesshere IBerserkAtomic Burak-T t-chesss Keshavsarada45 FORTCRAFTxdRATITA olivercoolster Big_Guy_Simba HappyPanda22 z8drc Tatum_goat Maracker leon_de_Professional HenningLueders IagoLuedersVega devrimgunes2 zaablesk Sl0thyy17 leon2567 Exce-N2 aeonneiro Mr-Best robik_2013 Quotet Basilegg CTreacts BobbyOppenheimer1945 A_Final_Gambit divagueur nrizwan KarmaMaster LaosWarrior signoflight Atomic-Salami OrthodoxParadox Emma2pO',
    ATPM: 'TimeToPlayAtomic Quasabianth Milky_Way12 hypercamel ekulxam Orcinus_Orca always_play_atomic StealYourKidney vmalinovsky2009 StUdIeB accaesar sircachetes JULIAN_FF Biggest_Floppa228 RenaudMerle SauceCooker7598 Ylcta atcly nanasquare VenusaurBeedrill MasterIKD GoRoArmeT PLZbeatme',
    ATIM: 'ReChesster RKROUNIT JudeBaeTorrens arinor0109 Henk_DeKleerkast AtomicOverseer New_Life14',
    ATGM: 'sutcunuri chrisrapid',
    ATSGM: 'JakeStateFarm JudeBaeTorrens ReChesster',
  };

  const put = (map, name, key) => {
    const k = name.toLowerCase(), t = TITLES[key];
    if (!map[k] || map[k].rank < t.rank) map[k] = t; // highest title wins
  };
  const fromSeed = () => {
    const map = {};
    for (const [key, names] of Object.entries(SEED)) names.split(' ').forEach(n => put(map, n, key));
    return map;
  };

  // Parse the member-only description on the team page.
  function parseTeamDoc(doc) {
    const map = {};
    doc.querySelectorAll('.team-show__desc p').forEach(p => {
      let cur = null;
      p.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          const h = HEADERS[n.textContent.trim()];
          if (h) cur = h;
        } else if (n.nodeName === 'A' && cur) {
          const m = (n.getAttribute('href') || '').match(/^\/@\/([^/?#]+)/);
          if (m) put(map, m[1], cur);
        }
      });
    });
    return Object.keys(map).length >= MIN_ENTRIES ? map : null; // non-members get null
  }

  const readCache = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const writeCache = map => { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), map })); } catch {} };

  let map = readCache()?.map || fromSeed();

  // ---- atomic context detection (page level) ----
  const ctx = { atomic: false };
  async function variantIsAtomic(url) {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    if (!r.ok) return null; // unknown, don't cache
    const j = await r.json();
    const v = typeof j.variant === 'string' ? j.variant : j.variant?.key;
    return v === 'atomic';
  } catch { return null; }
}

async function detectContext() {
  const p = location.pathname;
  const cacheKey = 'at-ctx:' + p;
  try { const c = sessionStorage.getItem(cacheKey); if (c !== null) return c === '1'; } catch {}
  let atomic = false, m;
  if ((m = p.match(/^\/tournament\/(\w{8})/))) atomic = await variantIsAtomic(`/api/tournament/${m[1]}`);
  else if ((m = p.match(/^\/swiss\/(\w{8})/))) atomic = await variantIsAtomic(`/api/swiss/${m[1]}`);
  else if ((m = p.match(/^\/(\w{8})(?:\w{4})?(?:\/(?:white|black))?\/?$/))) {
    const meta = document.querySelector('.game__meta')?.textContent || '';
    atomic = /\bAtomic\b/.test(meta)
      ? true
      : await variantIsAtomic(`/game/export/${m[1]}?moves=false&tags=false&clocks=false&evals=false&opening=false`);
  }
  if (atomic !== null) { try { sessionStorage.setItem(cacheKey, atomic ? '1' : '0'); } catch {} }
  return atomic === true;
}

  // ---- rendering ----
  function apply() {
      const SHORTS = new Set(Object.values(TITLES).map(x => x.short));

// Lichess TV channel list: plain-text champion rows
document.querySelectorAll('.tv-channel .champion').forEach(ch => {
  const node = [...ch.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
  if (!node) return;
  const tokens = node.textContent.trim().split(/\s+/);   // [title?] name
  const name = tokens[tokens.length - 1];
  const t = map[name.toLowerCase()];
  if (!t) return;
  const hasAtomic = SHORTS.has(tokens[0]);
  if (hasAtomic && tokens[0] === t.short) return;        // already correct
  const hasReal = tokens.length > 1 && !hasAtomic;
  const atomicRow = ch.closest('.tv-channel')?.classList.contains('atomic');
  if (hasReal && !atomicRow) return;                     // standard title stays outside the Atomic row
  node.textContent = `${t.short} ${name}`;
  ch.title = `${t.full} (unofficial)`;
});
  document.querySelectorAll('.user-link').forEach(el => {
  if (el.closest('#dasher_app')) return;
  const box = el.querySelector(':scope > .name') || el;   // arena standings wrap content in span.name
  if (box.querySelector(':scope > .utitle.at-title')) return;
  const m = (el.getAttribute('href') || el.dataset.href || '').match(/\/@\/([^/?#]+)/);
  const t = m && map[m[1].toLowerCase()];
  if (!t) return;
  const markLong = () => { if (box !== el && (t.short + m[1]).length > 15) el.classList.add('long'); };
  const real = box.querySelector(':scope > .utitle');
  if (real) {
    if (!ctx.atomic) return;
    const hadNbsp = real.textContent.includes('\u00a0');
    real.classList.add('at-title');
    real.textContent = t.short + (hadNbsp ? '\u00a0' : '');
    real.title = `${t.full} (unofficial)`;
    real.removeAttribute('data-bot');
    markLong();
    return;
  }
  const s = document.createElement('span');
  s.className = 'utitle at-title';
  s.title = `${t.full} (unofficial)`;
  s.textContent = t.short + '\u00a0';
  const line = box.querySelector(':scope > .line');
  line ? line.after(s) : box.prepend(s);
  markLong();
});
}

  // ---- list refresh (works only when you're a team member) ----
  async function refreshList() {
    const c = readCache();
    if (c && Date.now() - c.t < TTL) return;
    try {
      const r = await fetch(`/team/${TEAM}`, { credentials: 'same-origin' });
      const fresh = r.ok ? parseTeamDoc(new DOMParser().parseFromString(await r.text(), 'text/html')) : null;
      if (fresh) { map = fresh; writeCache(fresh); apply(); }
      else writeCache(c?.map || null); // not a member / layout changed: keep what we have, retry in an hour
    } catch {}
  }

  // On the team page itself, read the live DOM directly.
  if (location.pathname.startsWith(`/team/${TEAM}`)) {
    const live = parseTeamDoc(document);
    if (live) { map = live; writeCache(live); }
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  }).observe(document.body, { childList: true, subtree: true });

  detectContext().then(a => { ctx.atomic = a; apply(); });
  refreshList();
})();
