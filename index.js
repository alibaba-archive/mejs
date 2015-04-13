// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT

'use strict';

var fs = require('fs');
var util = require('util');
var path = require('path');
var glob = require('glob');
var Templates = require('./lib/ejs');
var runInNewContext = require('vm').runInNewContext;

var mejsTpl = stripBOM(fs.readFileSync(path.resolve(__dirname, 'lib/mejs.js'), {encoding: 'utf8'}));
var tplsTpl = stripBOM(fs.readFileSync(path.resolve(__dirname, 'lib/tpls.js'), {encoding: 'utf8'}));

module.exports = mejsCompile;


// mejsCompile(pattern, options) => Mejs class
//
// Examples:
//
// var Mejs = mejsCompile('views/**/*.ejs');
// var mejs = new Mejs({
//   config: config
// });
//
// ...
// mejs.render('index', {user: req.user});
// ...
function mejsCompile(pattern, options) {
  options = options || {};
  options.mini = false;
  var mejs = mejsCompile.precompileFromGlob(pattern, options);
  var sandbox = options.sandbox || {console: console};
  sandbox.module = {exports: {}};
  runInNewContext(mejs.contents.toString(), sandbox, {filename: mejs.path});
  return sandbox.module.exports;
}


// Ejs templates engine class
//
mejsCompile.Templates = Templates;


// mejsCompile.initView(pattern, options) => View class
// useful for express
//
// Examples:
//
// var app = express();
// app.set('view', mejs.initView('views/**/*.ejs', {
//   layout: 'layout',
//   locals: app.locals
// });
//
// ...
// res.render('index', {user: req.user});
// ...
mejsCompile.initView = function(pattern, options) {

  function View(tplName) {
    this.tplName = tplName;
  }

  View.prototype.path = 'NO_NEED'; //fake for express
  View.prototype.mejs = mejsCompile.initMejs(pattern, options);
  View.prototype.render = function(data, fn) {
    fn(null, this.mejs.renderEx(this.tplName, data));
  };
  return View;
};


// mejsCompile.initMejs(pattern, options) => `mejs` object with `renderEx` method
// useful for server side
//
// Examples: mejsCompile.initView, https://github.com/toajs/toa-mejs
//
mejsCompile.initMejs = function(pattern, options) {
  options = options || {};

  var Mejs = mejsCompile(pattern, options);

  Mejs.prototype.renderEx = function(tplName, data) {
    data = data || {};
    var tpl = this.render(tplName, data);
    var layout = this.locals.layout || data.layout;
    if (layout && data.layout !== false && this.templates[layout]) {
      data.body = tpl;
      return this.render(layout, data);
    }
    return tpl;
  };

  var locals = options.locals || {};
  locals.layout = locals.layout || options.layout;
  return new Mejs(locals);
};


// mejsCompile.precompile(files, options) => file object
// useful for gulp
//
// Examples: https://github.com/teambition/gulp-mejs
//
mejsCompile.precompile = function(files, options) {
  options = options || {};

  var isBuffer = true;
  var contentTpl = 'templates[\'%s\'] = %s;\n\n';
  var templates = files.reduce(function(joined, file) {
    var name = path.relative(file.base, file.path).replace(/\\/g, '/');
    name = name.replace(path.extname(name), '').replace(/^[\.\/]*/, '');

    isBuffer = isBuffer && Buffer.isBuffer(file.contents);
    var tpl = new Templates(stripBOM(file.contents.toString()), options);
    return joined + util.format(contentTpl, name, tpl.compile());
  }, '');

  templates = templates.replace(/^/gm, '  ').replace(/^\s+$/gm, '').trim();
  templates = (options.mini ? tplsTpl : mejsTpl).replace('/*TEMPLATES_PLACEHOLDER*/', templates);

  return new File({
    base: '',
    path: options.filename || 'mejs.js',
    contents: isBuffer ? new Buffer(templates) : templates
  });
};

mejsCompile.precompileFromGlob = function(pattern, options) {
  options = options || {};
  var globOptions = options.glob || {};
  globOptions.nodir = true;
  globOptions.strict = true;
  globOptions.matchBase = globOptions.matchBase !== false;
  var files = glob.sync(pattern, globOptions);
  if (!files.length) throw new Error('No file matched with ' + pattern);
  if (!options.base) options.base = pattern.replace(/\*.*$/, '');
  return mejsCompile.precompile(files.map(function(path) {
    return new File({
      path: path,
      base: options.base,
      contents: fs.readFileSync(path)
    });
  }), options);
};

function File(file) {
  this.path = file.path;
  this.base = file.base || '';
  this.contents = file.contents;
}

function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  return content;
}
