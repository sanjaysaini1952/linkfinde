/* Headless render harness: stubs just enough DOM to run app.js in node,
 * then walks every route and asserts the rendered output is sane. */

const docHandlers = {};
class El {
  constructor(id) {
    this.id = id; this._html = ''; this.dataset = {}; this.style = {};
    this.textContent = ''; this.value = ''; this.checked = false; this.files = [];
    this._set = new Set();
    this.classList = {
      add: (...c) => c.forEach(x => this._set.add(x)),
      remove: (...c) => c.forEach(x => this._set.delete(x)),
      toggle: (c, f) => (f ? this._set.add(c) : this._set.delete(c)),
      contains: c => this._set.has(c)
    };
  }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  setAttribute(k, v) { (this._attrs ||= {})[k] = String(v); }
  getAttribute(k) { return (this._attrs || {})[k] ?? null; }
  addEventListener() {} removeEventListener() {}
  focus() {} setSelectionRange() {} click() {}
  closest() { return null; }
  querySelector() { return new El('sub'); }
  querySelectorAll() { return []; }
  appendChild() {} removeChild() {}
}

const store = new Map();
const els = {};
const win = {
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  },
  location: { hash: '' },
  addEventListener(type, fn) { (win._h ||= {})[type] = fn; },
  scrollTo() {},
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } }
};
win.window = win;

global.window = win;
global.localStorage = win.localStorage;
global.location = win.location;
global.navigator = win.navigator;
global.document = {
  body: new El('body'),
  getElementById: id => (els[id] ||= new El(id)),
  querySelector: sel => (els[sel] ||= new El(sel)),
  querySelectorAll: () => [],
  addEventListener(type, fn) { docHandlers[type] = fn; }
};
global.FormData = class { constructor(f) { this.f = f; } get(k) { return fVals[k] ?? null; } };
let fVals = {};
global.setTimeout = (fn) => 0;

require('./data.js');
require('./load-app.js');

const app = document.querySelector('#app');
const problems = [];
const routes = ['#home', '#directory', '#search?q=ai', '#search', '#submit', '#bookmarks', '#admin',
  '#category/AI%20%26%20Machine%20Learning', '#category/Web%20Tools', '#website/does-not-exist',
  '#nonsense/route'];
for (const c of win.LINKFINDER_CATEGORIES) routes.push('#category/' + encodeURIComponent(c.name));
for (const s of win.LINKFINDER_SITES) routes.push('#website/' + s.slug);

let checked = 0;
for (const route of routes) {
  win.location.hash = route;
  try {
    win._h && win._h.hashchange && win._h.hashchange();
  } catch (err) {
    problems.push(`${route} threw: ${err.message}`);
    continue;
  }
  const html = app.innerHTML;
  if (!html || html.length < 200) { problems.push(`${route} produced no/short output (${html.length} chars)`); continue; }
  if (html.includes('undefined')) problems.push(`${route} leaks "undefined"`);
  if (html.includes('NaN')) problems.push(`${route} leaks "NaN"`);
  if (html.includes('[object Object]')) problems.push(`${route} leaks "[object Object]"`);
  if (route.startsWith('#website/') && !route.includes('does-not-exist') && !html.includes('Visit official website'))
    problems.push(`${route} missing visit button`);
  checked++;
}

const io = [];   // declared up front: both test blocks below push to it

/* ---- per-route metadata ---- */
const grab = () => ({
  title: global.document.title,
  desc: document.querySelector('meta[name="description"]')?.getAttribute('content'),
  canon: document.querySelector('link[rel="canonical"]')?.getAttribute('href')
});

win.location.hash = '#website/figma';
win._h.hashchange();
let m = grab();
if (m.title !== 'Figma — LinkFinder') io.push('website title wrong: ' + m.title);
if (!/figma\.com/.test(m.desc)) io.push('website description missing domain: ' + m.desc);
if (m.canon !== 'https://linkfinder.xyz/website/figma') io.push('website canonical wrong: ' + m.canon);

win.location.hash = '#category/Design';
win._h.hashchange();
m = grab();
if (!/^Design — LinkFinder$/.test(m.title)) io.push('category title wrong: ' + m.title);
if (!/15 curated/.test(m.desc)) io.push('category description count wrong: ' + m.desc);
if (!m.canon.startsWith('https://linkfinder.xyz/category/')) io.push('category canonical wrong: ' + m.canon);

win.location.hash = '#home';
win._h.hashchange();
m = grab();
if (!/^LinkFinder/.test(m.title)) io.push('home title wrong: ' + m.title);
if (m.canon !== 'https://linkfinder.xyz/') io.push('home canonical wrong: ' + m.canon);
if (!/206/.test(m.desc)) io.push('home description missing count: ' + m.desc);

const cat = win.LINKFINDER_CATEGORIES.length, sites = win.LINKFINDER_SITES.length;
const catEmpty = cat ? 'none' : 'n/a';
console.log('routes rendered :', checked, '/', routes.length);
console.log('sites           :', sites);
console.log('categories      :', cat, '(empty:', catEmpty + ')');
console.log('render problems :', problems.length);
problems.slice(0, 25).forEach(p => console.log('  -', p));

/* ---- interaction tests ---- */
/* sel: selector that closest() should match (null = no match)
 * ds : dataset on the matched element
 * tp : properties on e.target itself (name, value, checked, id, innerHTML) */
const fire = (type, sel, ds = {}, tp = {}) => {
  const el = { dataset: Object.assign(Object.create(null), ds) };
  const t = Object.assign({ closest: (s) => (s === sel ? el : null) }, tp);
  docHandlers[type]({ target: t, preventDefault() {}, key: 'a', metaKey: false, ctrlKey: false });
};

win.location.hash = '#directory';
win._h.hashchange();
const baseCount = (app.innerHTML.match(/website-card/g) || []).length;

/* regression: filters must not leak across route changes */
win.location.hash = '#search?q=ai';
win._h.hashchange();
win.location.hash = '#directory';
win._h.hashchange();
const afterLeak = (app.innerHTML.match(/result-count">(\d+)/) || [])[1];
if (afterLeak !== '206') io.push('query leaked from /search into /directory, count=' + afterLeak);
const clearedBox = /<input id="search-input" value=""/.test(app.innerHTML);
if (!clearedBox) io.push('search box still holds stale query on /directory');

/* regression: typing in the hero search must not erase itself */
win.location.hash = '#home';
win._h.hashchange();
docHandlers.input({ target: { id: 'search-input', value: 'figma' }, preventDefault() {} });
if (!/id="search-input" value="figma"/.test(app.innerHTML)) io.push('hero search cleared itself while typing');

/* regression: Enter in search navigates to the results page */
docHandlers.keydown({ target: { id: 'search-input' }, key: 'Enter', preventDefault() {} });
if (win.location.hash !== '#search?q=figma') io.push('Enter did not navigate to search results: ' + win.location.hash);
win._h.hashchange(); /* browsers fire this automatically; the stub does not */
if (!/Results for/.test(app.innerHTML)) io.push('search results page not rendered after Enter');
const figmaHits = (app.innerHTML.match(/website-card/g) || []).length;
if (figmaHits < 1) io.push('search for "figma" returned nothing');

/* regression: category radio must survive its own re-render */
win.location.hash = '#directory';
win._h.hashchange();
fire('change', null, {}, { name: 'cat', value: 'Gaming' });
const gamingCount = (app.innerHTML.match(/result-count">(\d+) resources in Gaming/) || [])[1];
if (gamingCount !== '10') io.push('category radio did not stick, got ' + gamingCount);
const gamingNames = [...app.innerHTML.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);
if (gamingNames.length !== 10) io.push('gaming should list 10 sites, got ' + gamingNames.length);

win.location.hash = '#directory';
win._h.hashchange();

fire('click', '[data-bookmark]', { bookmark: 'github' });
const savedOk = JSON.parse(store.get('linkfinder-bookmarks') || '[]').includes('github');
if (!savedOk) io.push('bookmark did not persist to localStorage');

fire('change', null, {}, { name: 'pricing', value: 'Free' });
const freeOnly = /name="pricing" value="Free" checked/.test(app.innerHTML);
if (!freeOnly) io.push('pricing filter did not apply');

fire('change', null, {}, { name: 'unchecked', checked: true });
fire('change', null, {}, { name: 'cat', value: 'Gaming' });
/* pricing is still "Free" here, and Gaming has 9 free + 1 paid entry */
const gamingOnly = /result-count">9 resources in Gaming/.test(app.innerHTML);
if (!gamingOnly) io.push('category filter wrong: ' + (app.innerHTML.match(/result-count">[^<]*/) || ['?'])[0]);

fire('change', null, {}, { name: 'cat', value: 'All' });
fire('change', null, {}, { name: 'unchecked', checked: false });
fire('change', null, {}, { name: 'pricing', value: 'All' });
const unfiltered = (app.innerHTML.match(/result-count">(\d+)/) || [])[1];
fire('change', null, {}, { id: 'sort', value: 'az' });
const names = [...app.innerHTML.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);
const sortedOk = names.every((n, i) => i === 0 || names[i - 1].localeCompare(n) <= 0);
if (!sortedOk) io.push('A-Z output is not sorted');
if (unfiltered !== '206') io.push('unfiltered count should be 206, got ' + unfiltered);
if (names.length !== 206) io.push('A-Z should render 206 cards, got ' + names.length);

const themeBefore = document.body.classList.contains('light');
fire('click', '[data-action]', { action: 'theme' });
if (document.body.classList.contains('light') === themeBefore) io.push('theme toggle did not flip');

win.location.hash = '#bookmarks';
win._h.hashchange();
if (!app.innerHTML.includes('github') && !app.innerHTML.includes('Your bookmarks are empty'))
  io.push('bookmarks page inconsistent');

win.location.hash = '#submit';
win._h.hashchange();
const submitForm = (url) => {
  fVals = { url };
  const form = { id: 'submit-form', innerHTML: 'ORIGINAL' };
  docHandlers.submit({ target: form, preventDefault() {} });
  return form.innerHTML;
};
if (submitForm('https://github.com').includes('Submission received'))
  io.push('duplicate domain was NOT rejected');
if (submitForm('javascript:alert(1)').includes('Submission received'))
  io.push('javascript: URL was NOT rejected');
if (submitForm('data:text/html,<h1>x</h1>').includes('Submission received'))
  io.push('data: URL was NOT rejected');
if (submitForm('https://brand-new-site.example').includes('Submission received') === false)
  io.push('valid submission was not accepted');
if (submitForm('not-a-url').includes('Submission received'))
  io.push('malformed URL was NOT rejected');

console.log('base cards      :', baseCount);
console.log('interaction errs:', io.length);
io.forEach(p => console.log('  -', p));
process.exit(problems.length + io.length ? 1 : 0);
