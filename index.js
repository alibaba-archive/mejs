// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT

'use strict';

var fs = require('fs');
var util = require('util');
var path = require('path');
var glob = require('glob');
var Ejs = require('./lib/ejs');
var runInThisContext = require('vm').runInThisContext;

var mejsTpl = stripBOM(fs.readFileSync('./lib/mejs.js', {encoding: 'utf8'}));

module.exports = mejsCompile;

function mejsCompile(pattern, options) {
  var mejs = mejsCompile.precompileFromGlob(pattern, options);
  return runInThisContext(mejs, {filename: 'mejs.js'});
}

mejsCompile.Ejs = Ejs;
mejsCompile.precompile = function(files, options) {
  options = options || {};

  var baseReg = '';
  if (options.base)
    baseReg = new RegExp('^' + options.base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  var contentTpl = 'templates[\'%s\'] = %s;\n\n';
  var templates = files.reduce(function(joined, file) {
    var name = path.relative(file.base, file.path)
      .replace(/\\/g, '/')
      .replace(baseReg, '');
    name = name.replace(path.extname(name), '').replace(/^[\.\/]*/, '');

    var tpl = new Ejs(stripBOM(file.contents.toString('utf8')), options);
    return joined + util.format(contentTpl, name, tpl.compile());
  }, '');

  templates = templates.trim().replace(/^/gm, '  ');
  return mejsTpl.replace('/*TEMPLATES_PLACEHOLDER*/', templates);
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
      contents: fs.readFileSync(path)
    });
  }), options);
};

// TODO watch and update templates for development
mejsCompile.watch = function(mejs, pattern) {};

function File(file) {
  this.path = file.path;
  this.base = file.base || '';
  this.contents = file.contents;
}

function fullName(name) {
  return name.replace(/\\/g, '/');
}

function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}
