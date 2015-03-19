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
  var mejs = mejsCompile.precompileFromGlob(pattern, options);
  var sandbox = {module: {exports: {}}};
  runInNewContext(mejs.contents.toString(), sandbox, {filename: mejs.path});
  return sandbox.module.exports;
}


// Ejs templates engine class
//
mejsCompile.Templates = Templates;


// mejsCompile.initMejs(pattern, options) => render function
// useful for express
//
// Examples:
//
// var app = express();
// var renderTpl = mejsCompile.initMejs('views/**/*.ejs', {
//   locals: app.locals
// });
// app.engine('ejs', renderTpl);
// app.set('view engine', 'ejs');
//
// ...
// res.render('index', {user: req.user});
// ...
mejsCompile.initMejs = function(pattern, options) {
  options = options || {};

  var Mejs = mejsCompile(pattern, options);
  var mejs = new Mejs(options.locals);

  function renderTpl(tplName, data) {
    return mejs.render(tplName, data);
  }

  renderTpl.Mejs = Mejs;
  renderTpl.mejs = mejs;
  return renderTpl;
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

  templates = templates.replace(/^/gm, '    ').replace(/^\s+$/gm, '').trim();
  templates = mejsTpl.replace('/*TEMPLATES_PLACEHOLDER*/', templates);

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
