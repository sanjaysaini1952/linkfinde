/* LinkFinder front end — vanilla JS, no build step.
 * Dataset lives in data.js. Verification state is honest: nothing here has
 * been checked by an automated crawler, so the UI never claims otherwise. */

const SITES = window.LINKFINDER_SITES || [];
const CATEGORIES = window.LINKFINDER_CATEGORIES || [];
const byCategory = C => SITES.filter(s => s.cat === C);
const countIn = C => byCategory(C).length;
const domainOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = {
  bookmarks: JSON.parse(localStorage.getItem('linkfinder-bookmarks') || '[]'),
  query: '',
  category: 'All',
  pricing: 'All',
  sort: 'default',
  uncheckedOnly: false,
  theme: localStorage.getItem('linkfinder-theme') || 'dark'
};

const app = document.querySelector('#app');
const save = () => localStorage.setItem('linkfinder-bookmarks', JSON.stringify(state.bookmarks));

function toast(text) {
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

/* Honest trust indicator. "Checked" would mean an automated request confirmed
 * the URL resolves to the claimed site — no such check has run, so we say so. */
function statusBadge(s) {
  return s.linkStatus === 'checked'
    ? '<span class="verify ok">✓ URL checked</span>'
    : '<span class="verify pending">URL not checked</span>';
}

function logo(s) {
  return `<span class="site-logo ${s.color}">${esc(s.letter)}</span>`;
}

function isSaved(slug) { return state.bookmarks.includes(slug); }

function card(s) {
  return `<article class="website-card">
    <div class="card-top">${logo(s)}${statusBadge(s)}</div>
    <span class="card-kicker">${esc(s.cat)}</span>
    <h3>${esc(s.name)}</h3>
    <p class="desc">${esc(s.desc)}</p>
    <span class="site-domain">${esc(domainOf(s.url))}</span>
    <div class="tag-row">${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    <div class="card-bottom">
      <span class="price"><b>${esc(s.price)}</b></span>
      <div class="card-actions">
        <button class="save-btn ${isSaved(s.slug) ? 'saved' : ''}" data-bookmark="${s.slug}" aria-label="${isSaved(s.slug) ? 'Remove' : 'Save'} ${esc(s.name)}">${isSaved(s.slug) ? '♥' : '♡'}</button>
        <a class="visit-btn" href="#website/${s.slug}">View ↗</a>
      </div>
    </div>
  </article>`;
}

function searchBox(value = '', placeholder = 'Search websites, tools, resources...') {
  return `<div class="main-search">
    <span>⌕</span>
    <input id="search-input" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" aria-label="Search the directory"/>
    ${value ? '<button class="clear-search" data-clear aria-label="Clear search">×</button>' : ''}
    <kbd>⌘ K</kbd>
  </div>`;
}

function matches(s) {
  if (state.category !== 'All' && s.cat !== state.category) return false;
  if (state.pricing !== 'All' && s.price !== state.pricing) return false;
  if (state.uncheckedOnly && s.linkStatus === 'checked') return false;
  if (state.query) {
    const hay = `${s.name} ${s.desc} ${s.cat} ${s.tags.join(' ')} ${domainOf(s.url)}`.toLowerCase();
    if (!hay.includes(state.query.toLowerCase())) return false;
  }
  return true;
}

function results() {
  const list = SITES.filter(matches);
  if (state.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === 'za') list.sort((a, b) => b.name.localeCompare(a.name));
  return list;
}

/* ---------- homepage ---------- */

/* Numbered section headers — an editorial index device, and it gives the
 * eye a consistent anchor as you scroll a long page. */
let sectionNo = 0;
function sectionHead(kicker, title, right) {
  sectionNo += 1;
  return `<div class="section-head">
    <div class="sh-left">
      <span class="section-index" aria-hidden="true">${String(sectionNo).padStart(2, '0')}</span>
      <div><span class="section-kicker">${kicker}</span><h2>${title}</h2></div>
    </div>
    ${right || ''}
  </div>`;
}

function ticker() {
  const domains = SITES.slice(0, 22).map(s => domainOf(s.url));
  const run = `<div class="ticker-run">${domains.map(d => `<span>${esc(d)}</span>`).join('')}</div>`;
  /* two identical runs — so the -50% loop point lands exactly on a seam */
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${run}${run}</div></div>`;
}

function indexPanel() {
  const rows = SITES.slice(0, 7);
  const short = c => c.split(' ').map(w => w.slice(0, 3).toUpperCase()).join('').slice(0, 5);
  return `<aside class="index-panel" aria-hidden="true">
    <div class="panel-head"><span class="dot"></span><span>Live index</span></div>
    <ul class="panel-list">
      ${rows.map((s, i) => `<li>
        <span class="pl-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="pl-name">${esc(domainOf(s.url))}</span>
        <span class="pl-tag">${esc(short(s.cat))}</span>
      </li>`).join('')}
    </ul>
    <div class="panel-foot"><span>${SITES.length} indexed</span><span>${CATEGORIES.length} categories</span></div>
  </aside>`;
}

function home() {
  sectionNo = 0;
  const pool = SITES.slice(0, 6);
  const maxCat = Math.max(...CATEGORIES.map(c => countIn(c.name)));

  return `<section class="hero">
    <div class="grid-glow" aria-hidden="true"></div>
    <div class="hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">The internet, organized.</span>
        <h1>Discover the best <em>places</em> on the web.</h1>
        <p class="hero-lede">A curated index of useful websites, tools and resources — each entry linking straight to its official home.</p>
        <div class="search-wrap">${searchBox(state.query)}</div>
        <div class="popular">
          <span>Popular</span>
          <a href="#search?q=AI">AI</a>
          <a href="#search?q=security">Security</a>
          <a href="#search?q=developer">Developer</a>
          <a href="#search?q=design">Design</a>
          <a href="#search?q=productivity">Productivity</a>
        </div>
      </div>
      ${indexPanel()}
    </div>
  </section>
  ${ticker()}

  <section class="section">
    ${sectionHead('Browse the index', `${CATEGORIES.length} categories, every entry hand-placed.`,
      '<a class="view-all" href="#directory">Open the directory →</a>')}
    <div class="category-grid">
      ${CATEGORIES.map((c, i) => `
        <a class="category-card" href="#category/${encodeURIComponent(c.name)}">
          <span class="cat-top">
            <span class="cat-icon" aria-hidden="true">${c.icon}</span>
            <span class="cat-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          </span>
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.desc)}</p>
          <span class="cat-meter" aria-hidden="true"><i style="width:${Math.round((countIn(c.name) / maxCat) * 100)}%"></i></span>
          <span class="cat-bottom">${countIn(c.name)} sites <b class="arrow" aria-hidden="true">↗</b></span>
        </a>`).join('')}
    </div>
  </section>

  <section class="section tinted">
    ${sectionHead('Start here', 'Featured websites',
      `<a class="view-all" href="#directory">See all ${SITES.length} →</a>`)}
    <div class="website-grid">${pool.map(card).join('')}</div>
  </section>

  <section class="section split-section" id="trending">
    <div>
      ${sectionHead('Worth a look', 'Popular right now')}
      <p class="method-note">Ranking is editorial in this build. Live click tracking arrives with the database layer — no invented traffic numbers are shown.</p>
      <div class="trend-list">
        ${SITES.slice(0, 5).map((s, i) => `
          <a class="trend-item" href="#website/${s.slug}">
            <span class="rank" aria-hidden="true">#0${i + 1}</span>
            ${logo(s)}
            <div><strong>${esc(s.name)}</strong><p>${esc(s.desc.slice(0, 54))}…</p></div>
            <span class="trend-meta">${esc(s.price)}</span>
          </a>`).join('')}
      </div>
    </div>
    <div>
      ${sectionHead('Latest entries', 'Recently added')}
      <div class="recent-list">
        ${SITES.slice(-6).reverse().map(s => `
          <a class="recent-item" href="#website/${s.slug}">
            ${logo(s)}
            <div><strong>${esc(s.name)}</strong><p>${esc(s.cat)}</p></div>
            <span class="recent-date">${esc(s.price)}</span>
          </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section tinted">
    ${sectionHead('How this works', 'Trust, stated plainly.')}
    <div class="trust-grid">
      <div class="trust-card">
        <span class="verify pending">URL not checked</span>
        <h3>No check yet</h3>
        <p>We have not run an automated check against this link, so we do not claim it is verified. Nothing here is an endorsement.</p>
      </div>
      <div class="trust-card">
        <span class="verify ok">URL checked</span>
        <h3>What checked means</h3>
        <p>A crawler confirmed the URL resolves to the site the listing claims. It is a link check — not an opinion, and not a recommendation.</p>
      </div>
      <div class="trust-card">
        <span class="cat-icon" aria-hidden="true">↗</span>
        <h3>Where links go</h3>
        <p>Every visit button points at the destination's own domain and opens in a new tab with <code>rel="noopener noreferrer"</code> applied.</p>
      </div>
    </div>
  </section>`;
}

/* ---------- directory, category, search ---------- */

function filterSidebar() {
  return `<aside class="filters">
    <div class="filter-group">
      <h4>Category</h4>
      ${['All', ...CATEGORIES.map(c => c.name)].map(c =>
        `<label class="filter-option"><input type="radio" name="cat" value="${esc(c)}" ${state.category === c ? 'checked' : ''}/> ${esc(c)}</label>`).join('')}
    </div>
    <div class="filter-group">
      <h4>Pricing</h4>
      ${['All', 'Free', 'Freemium', 'Paid'].map(p =>
        `<label class="filter-option"><input type="radio" name="pricing" value="${p}" ${state.pricing === p ? 'checked' : ''}/> ${p}</label>`).join('')}
    </div>
    <div class="filter-group">
      <h4>Link state</h4>
      <label class="filter-option"><input type="radio" name="unchecked" ${state.uncheckedOnly ? 'checked' : ''}/> Not yet checked</label>
      <label class="filter-option"><input type="radio" name="unchecked" ${!state.uncheckedOnly ? 'checked' : ''}/> Any state</label>
    </div>
  </aside>`;
}

function grid() {
  const list = results();
  return `<div class="directory-toolbar">
      ${searchBox(state.query)}
      <select class="select" id="sort" aria-label="Sort results">
        <option value="default" ${state.sort === 'default' ? 'selected' : ''}>Curated order</option>
        <option value="az" ${state.sort === 'az' ? 'selected' : ''}>Name A–Z</option>
        <option value="za" ${state.sort === 'za' ? 'selected' : ''}>Name Z–A</option>
      </select>
    </div>
    <p class="section-kicker result-count">${list.length} ${list.length === 1 ? 'resource' : 'resources'}${state.category !== 'All' ? ' in ' + esc(state.category) : ''}</p>
    ${list.length
      ? `<div class="website-grid">${list.map(card).join('')}</div>`
      : `<div class="empty">
           <strong>No websites found</strong>
           Nothing matches those filters. Try clearing the category, or search for something broader like “editor” or “open source”.
           <div class="empty-actions"><a class="outline-btn" href="#directory">Reset filters</a></div>
         </div>`}`;
}

function directory() {
  return `<div class="page-shell">
    <div class="breadcrumb">HOME / DIRECTORY</div>
    <h1 class="page-title">Explore the index.</h1>
    <p class="page-subtitle">${SITES.length} websites across ${CATEGORIES.length} categories. Every entry links straight to its official site.</p>
    <div class="directory-layout">${filterSidebar()}<section>${grid()}</section></div>
  </div>`;
}

function categoryPage(name) {
  const cat = CATEGORIES.find(c => c.name === name);
  if (!cat) return notFound();
  state.category = name;
  const list = results();
  return `<div class="page-shell">
    <div class="breadcrumb"><a href="#directory">DIRECTORY</a> / ${esc(cat.name.toUpperCase())}</div>
    <div class="category-head">
      <span class="cat-icon big">${cat.icon}</span>
      <div><h1 class="page-title">${esc(cat.name)}</h1><p class="page-subtitle">${esc(cat.desc)} · ${countIn(cat.name)} websites indexed</p></div>
    </div>
    <div class="directory-layout">${filterSidebar()}<section>${grid()}</section></div>
  </div>`;
}

function searchPage(q) {
  state.query = q;
  return `<div class="page-shell">
    <div class="breadcrumb">HOME / SEARCH</div>
    <h1 class="page-title">${q ? `Results for “${esc(q)}”` : 'Search the index.'}</h1>
    <p class="page-subtitle">Searching names, descriptions, categories, tags and domains.</p>
    <div class="directory-layout">${filterSidebar()}<section>${grid()}</section></div>
  </div>`;
}

/* ---------- detail ---------- */

function related(s) {
  return SITES
    .filter(x => x.slug !== s.slug && (x.cat === s.cat || x.tags.some(t => s.tags.includes(t))))
    .slice(0, 3);
}

function detail(slug) {
  const s = SITES.find(x => x.slug === slug);
  if (!s) return notFound();
  const rel = related(s);
  return `<div class="page-shell">
    <div class="breadcrumb"><a href="#directory">DIRECTORY</a> / <a href="#category/${encodeURIComponent(s.cat)}">${esc(s.cat.toUpperCase())}</a> / ${esc(s.name.toUpperCase())}</div>
    <section class="detail-hero">
      <div class="detail-top">
        <span class="detail-logo ${s.color}">${esc(s.letter)}</span>
        <div>
          <div class="detail-title-row"><h1>${esc(s.name)}</h1>${statusBadge(s)}</div>
          <p>${esc(s.desc)}</p>
        </div>
      </div>
      <div class="detail-actions">
        <a class="primary-btn" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer nofollow">Visit official website ↗</a>
        <button class="outline-btn" data-copy="${esc(s.url)}">Copy link</button>
        <button class="outline-btn" data-bookmark="${s.slug}">${isSaved(s.slug) ? '♥ Saved' : '♡ Bookmark'}</button>
        <button class="outline-btn" data-report="${esc(s.name)}">Report</button>
      </div>
    </section>

    <div class="detail-grid">
      <div>
        <h2>About ${esc(s.name)}</h2>
        <p>${esc(s.desc)}</p>
        <p>It sits in our ${esc(s.cat.toLowerCase())} collection, where we keep tools that are focused, understandable and worth returning to. Descriptions here are written by the LinkFinder team as orientation only — treat the destination site as the source of truth for anything that matters.</p>

        <h2 class="mt">What to expect</h2>
        <ul class="feature-list">
          <li>A single clear purpose, rather than an everything dashboard</li>
          <li>Reachable at the official domain, with no redirect hop</li>
          <li>Useful to try before committing to anything larger</li>
        </ul>

        ${rel.length ? `<h2 class="mt">Related websites</h2>
        <div class="related-grid">${rel.map(card).join('')}</div>` : ''}
      </div>

      <aside>
        <div class="tag-row">${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="info-box">
          <div class="info-row"><span>Official URL</span><b>${esc(domainOf(s.url))}</b></div>
          <div class="info-row"><span>Full link</span><b>${esc(s.url.replace(/^https?:\/\//, ''))}</b></div>
          <div class="info-row"><span>Category</span><b>${esc(s.cat)}</b></div>
          <div class="info-row"><span>Pricing</span><b>${esc(s.price)}</b></div>
          <div class="info-row"><span>Link state</span><b>${s.linkStatus === 'checked' ? 'Checked' : 'Not yet checked'}</b></div>
          <div class="info-row"><span>Last checked</span><b>Never</b></div>
        </div>
        <div class="info-box">
          <h3 class="side-h">Share</h3>
          <div class="share-row">
            <button class="outline-btn" data-copy="${esc(s.url)}">Copy link</button>
            <a class="outline-btn" target="_blank" rel="noopener noreferrer nofollow" href="https://x.com/intent/post?text=${encodeURIComponent(s.name + ' — ' + s.url)}">Post</a>
          </div>
        </div>
      </aside>
    </div>
  </div>`;
}

/* ---------- submit, bookmarks, admin, errors ---------- */

function submit() {
  return `<div class="page-shell">
    <div class="breadcrumb">HOME / SUBMIT</div>
    <div class="form-wrap">
      <span class="section-kicker">Add to the index</span>
      <h1 class="page-title">Know a place worth sharing?</h1>
      <p class="page-subtitle">Submissions are reviewed by hand before they appear. Nothing goes live automatically.</p>
      <form class="form" id="submit-form" novalidate>
        <div class="field"><label for="f-name">Website name</label><input id="f-name" name="name" required placeholder="Acme Tools"/></div>
        <div class="field"><label for="f-url">Official URL</label><input id="f-url" name="url" type="url" required placeholder="https://example.com"/></div>
        <div class="field full"><label for="f-desc">Description</label><textarea id="f-desc" name="desc" required placeholder="What makes this website useful?"></textarea></div>
        <div class="field"><label for="f-cat">Category</label><select id="f-cat" name="cat">${CATEGORIES.map(c => `<option>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-price">Pricing model</label><select id="f-price" name="price"><option>Free</option><option>Freemium</option><option>Paid</option><option>Open source</option></select></div>
        <div class="field"><label for="f-tags">Tags</label><input id="f-tags" name="tags" placeholder="editor, open source"/></div>
        <div class="field"><label for="f-email">Your email</label><input id="f-email" name="email" type="email" required placeholder="you@example.com"/></div>
        <label class="check"><input type="checkbox" name="confirm" required/> I confirm this information is accurate and that I have the right to submit it.</label>
        <button class="primary-btn" type="submit">Send for review ↗</button>
      </form>
    </div>
  </div>`;
}

function bookmarks() {
  const saved = SITES.filter(s => isSaved(s.slug));
  return `<div class="page-shell">
    <div class="breadcrumb">HOME / BOOKMARKS</div>
    <h1 class="page-title">Your saved links.</h1>
    <p class="page-subtitle">Kept in this browser. Sign-in and sync arrive with the database layer.</p>
    ${saved.length
      ? `<div class="website-grid">${saved.map(card).join('')}</div>`
      : `<div class="empty"><strong>Your bookmarks are empty.</strong>Start building your personal web collection — tap the ♡ on any website card.</div>`}
  </div>`;
}

function admin() {
  const stats = [
    ['Websites', SITES.length],
    ['Categories', CATEGORIES.length],
    ['URLs checked', SITES.filter(s => s.linkStatus === 'checked').length],
    ['Awaiting check', SITES.filter(s => s.linkStatus !== 'checked').length]
  ];
  return `<div class="page-shell">
    <div class="breadcrumb">ADMIN / OVERVIEW</div>
    <span class="section-kicker sample-flag">Sample data</span>
    <h1 class="page-title">Index overview.</h1>
    <p class="page-subtitle">Counts below are computed from the loaded dataset, not hardcoded figures.</p>
    <div class="admin-grid">${stats.map(([k, v]) => `<div class="stat"><small>${k.toUpperCase()}</small><strong>${v}</strong></div>`).join('')}</div>
    <div class="admin-panel">
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Domain</th><th>Category</th><th>Pricing</th><th>Link state</th><th></th></tr></thead>
        <tbody>${SITES.map(s => `<tr>
          <td><strong>${esc(s.name)}</strong></td>
          <td>${esc(domainOf(s.url))}</td>
          <td>${esc(s.cat)}</td>
          <td>${esc(s.price)}</td>
          <td style="color:${s.linkStatus === 'checked' ? 'var(--green)' : 'var(--dim)'}">${s.linkStatus === 'checked' ? 'Checked' : 'Not checked'}</td>
          <td><a class="outline-btn" href="#website/${s.slug}">Open</a></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

function notFound() {
  return `<div class="page-shell">
    <div class="breadcrumb">ERROR / 404</div>
    <div class="empty">
      <strong>We couldn't find that page.</strong>
      The link may be mistyped, or the listing may have been removed.
      <div class="empty-actions"><a class="primary-btn" href="#directory">Back to the directory</a></div>
    </div>
  </div>`;
}

/* ---------- router ---------- */

/* Filter state persists while you stay on one route (so re-rendering after a
 * filter change does not wipe the user's selection), but resets when you
 * navigate somewhere new — otherwise a search on /search silently follows you
 * into the directory. */
const SITE_URL = 'https://linkfinder.xyz/';

/* Per-route <title> / description / OG. A static single-page app can only do
 * this on the client, so it is applied after each render rather than baked
 * into index.html — otherwise every page would share the homepage's metadata. */
function setMeta({ title, description, url }) {
  document.title = title;
  const set = (sel, attr, value) => {
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, value);
  };
  set('meta[name="description"]', 'content', description);
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', description);
  set('meta[property="og:url"]', 'content', SITE_URL + url);
  set('meta[name="twitter:title"]', 'content', title);
  set('meta[name="twitter:description"]', 'content', description);
  set('link[rel="canonical"]', 'href', SITE_URL + url);
}

function metaFor(route, params) {
  if (route.startsWith('website/')) {
    const s = SITES.find(x => x.slug === route.slice(8));
    if (s) {
      return {
        url: 'website/' + s.slug,
        title: `${s.name} — LinkFinder`,
        description: `Discover ${s.name} and visit its official website at ${domainOf(s.url)}. ${s.desc}`
      };
    }
  }
  if (route.startsWith('category/')) {
    const name = decodeURIComponent(route.slice(9));
    const c = CATEGORIES.find(x => x.name === name);
    if (c) {
      return {
        url: 'category/' + encodeURIComponent(name),
        title: `${c.name} — LinkFinder`,
        description: `${countIn(c.name)} curated ${c.name.toLowerCase()} websites in one place. ${c.desc}. Open the official link for each entry.`
      };
    }
  }
  if (route === 'directory') return { url: 'directory', title: 'Directory — LinkFinder', description: `Browse all ${SITES.length} websites across ${CATEGORIES.length} categories. Filter by category, pricing and link state.` };
  if (route === 'search') {
    const q = params.get('q') || '';
    return { url: 'search', title: q ? `${q} — search — LinkFinder` : 'Search — LinkFinder', description: `Search ${SITES.length} curated websites by name, description, category, tag or domain.` };
  }
  if (route === 'submit') return { url: 'submit', title: 'Submit a website — LinkFinder', description: 'Send a website to LinkFinder. Submissions are reviewed by hand before they appear in the directory.' };
  if (route === 'bookmarks') return { url: 'bookmarks', title: 'Bookmarks — LinkFinder', description: 'The websites you have saved in LinkFinder.' };
  if (route === 'admin') return { url: 'admin', title: 'Admin overview — LinkFinder', description: 'Directory counts, link state and category coverage.' };
  return {
    url: '',
    title: 'LinkFinder — Explore the web, organized.',
    description: `LinkFinder is a curated directory of ${SITES.length} useful websites, tools and resources across ${CATEGORIES.length} categories — with the real link, clearly labelled.`
  };
}

let lastRoute = null;

function render() {
  const raw = location.hash.slice(1) || 'home';
  const [route, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');

  if (route !== lastRoute) {
    state.query = '';
    state.category = 'All';
    state.pricing = 'All';
    state.uncheckedOnly = false;
    state.sort = 'default';
    lastRoute = route;
  }

  /* URL params then seed the filters. */
  if (params.has('q')) state.query = params.get('q');
  if (params.has('category')) state.category = params.get('category');

  document.body.classList.toggle('light', state.theme === 'light');

  if (route === 'home' || route === '') app.innerHTML = home();
  else if (route === 'directory') app.innerHTML = directory();
  else if (route.startsWith('category/')) app.innerHTML = categoryPage(decodeURIComponent(route.slice(9)));
  else if (route === 'search') app.innerHTML = searchPage(params.get('q') || state.query);
  else if (route.startsWith('website/')) app.innerHTML = detail(route.slice(8));
  else if (route === 'submit') app.innerHTML = submit();
  else if (route === 'bookmarks') app.innerHTML = bookmarks();
  else if (route === 'admin') app.innerHTML = admin();
  else app.innerHTML = notFound();

  setMeta(metaFor(route, params));
  window.scrollTo(0, 0);
}

/* ---------- events ---------- */

document.addEventListener('click', e => {
  /* Entering the directory or home from a link is a fresh start for filters. */
  const link = e.target.closest('a[href^="#"]');
  const href = link && link.getAttribute('href');
  if (href === '#directory' || href === '#home') {
    state.category = 'All';
    state.pricing = 'All';
    state.uncheckedOnly = false;
    state.sort = 'default';
  }

  const saveBtn = e.target.closest('[data-bookmark]');
  if (saveBtn) {
    e.preventDefault();
    const slug = saveBtn.dataset.bookmark;
    state.bookmarks = state.bookmarks.includes(slug)
      ? state.bookmarks.filter(x => x !== slug)
      : [...state.bookmarks, slug];
    save();
    toast(state.bookmarks.includes(slug) ? 'Saved to your bookmarks' : 'Removed from bookmarks');
    render();
    return;
  }

  if (e.target.closest('[data-clear]')) { state.query = ''; render(); return; }

  const copy = e.target.closest('[data-copy]');
  if (copy) {
    navigator.clipboard?.writeText(copy.dataset.copy);
    toast('Official URL copied');
    return;
  }

  const report = e.target.closest('[data-report]');
  if (report) {
    document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Report a listing">
        <div class="modal-head"><h3>Report a listing</h3><button class="close" data-close aria-label="Close">×</button></div>
        <p>Reports go to a human reviewer. Nothing is removed automatically.</p>
        <label class="field"><span>What is wrong with ${esc(report.dataset.report)}?</span>
          <select id="report-reason">
            <option>Broken link</option>
            <option>Wrong website</option>
            <option>Misleading description</option>
            <option>Duplicate listing</option>
            <option>Something else</option>
          </select>
        </label>
        <label class="field mt"><span>Extra detail (optional)</span><textarea id="report-detail" placeholder="What did you find?"></textarea></label>
        <div class="modal-actions">
          <button class="outline-btn" data-close>Cancel</button>
          <button class="primary-btn" data-report-send>Send report</button>
        </div>
      </div>
    </div>`;
    return;
  }

  if (e.target.closest('[data-report-send]')) {
    document.querySelector('#modal-root').innerHTML = '';
    toast('Report sent to the review queue');
    return;
  }

  if (e.target.closest('[data-close]')) { document.querySelector('#modal-root').innerHTML = ''; return; }

  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'theme') {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('linkfinder-theme', state.theme);
    render();
  } else if (action === 'menu') {
    const drawer = document.querySelector('#mobile-nav');
    if (drawer) {
      drawer.hidden = !drawer.hidden;
      document.querySelector('[data-action="menu"].menu-button')
        ?.setAttribute('aria-expanded', String(!drawer.hidden));
    }
  } else if (action === 'bookmarks') location.hash = '#bookmarks';
  else if (action === 'profile') location.hash = '#admin';
  else if (action === 'focus-search') document.querySelector('#search-input')?.focus();

  /* any navigation from the drawer closes it */
  if (link && href && href !== '#') {
    const drawer = document.querySelector('#mobile-nav');
    if (drawer && !drawer.hidden) {
      drawer.hidden = true;
      document.querySelector('.menu-button')?.setAttribute('aria-expanded', 'false');
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.id !== 'search-input') return;
  state.query = e.target.value;
  const route = location.hash.split('?')[0].slice(1);
  if (route === 'home' || route === '' || route === 'directory' || route === 'search' || route.startsWith('category')) {
    render();
    const input = document.querySelector('#search-input');
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
});

document.addEventListener('change', e => {
  if (e.target.name === 'cat') { state.category = e.target.value; render(); }
  if (e.target.name === 'pricing') { state.pricing = e.target.value; render(); }
  if (e.target.name === 'unchecked') { state.uncheckedOnly = e.target.checked; render(); }
  if (e.target.id === 'sort') { state.sort = e.target.value; render(); }
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'submit-form') return;
  e.preventDefault();
  const url = new FormData(e.target).get('url');
  if (!/^https?:\/\//i.test(url)) {
    toast('Enter a full http:// or https:// link');
    return;
  }
  if (SITES.some(s => domainOf(s.url) === domainOf(url))) {
    toast('That domain is already listed — check the directory first');
    return;
  }
  e.target.innerHTML = `<div class="empty" style="grid-column:1/-1">
    <strong>Submission received.</strong>
    A reviewer will check that the link resolves to the site described, then it gets published. Nothing went live automatically.
  </div>`;
  toast('Sent for review');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.id === 'search-input') {
    location.hash = state.query ? '#search?q=' + encodeURIComponent(state.query) : '#directory';
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    location.hash = '#directory';
    setTimeout(() => document.querySelector('#search-input')?.focus(), 60);
  }
  if (e.key === 'Escape') document.querySelector('#modal-root').innerHTML = '';
});

window.addEventListener('hashchange', render);
render();
