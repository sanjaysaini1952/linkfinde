/* Debug loader: evaluates app.js with `state` exported, so tests can inspect
 * internal filter state without adding test-only code to the app itself. */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const src = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8')
  .replace('window.addEventListener(\'hashchange\', render);',
    'window.addEventListener(\'hashchange\', render); global.__state = state;');

const m = new Module(path.join(__dirname, 'app.debugged.js'), null);
m.filename = path.join(__dirname, 'app.debugged.js');
m.paths = Module._nodeModulePaths(__dirname);
m._compile(src, m.filename);
module.exports = m;
