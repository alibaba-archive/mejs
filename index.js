// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT

'use strict'

var fs = require('fs')
var util = require('util')
var path = require('path')
var glob = require('glob')
var Templates = require('./lib/ejs')
var runInNewContext = require('vm').runInNewContext

var mejsTpl = fs.readFileSync(path.resolve(__dirname, 'lib/mejs.js'), {encoding: 'utf8'})
var tplsTpl = fs.readFileSync(path.resolve(__dirname, 'lib/tpls.js'), {encoding: 'utf8'})

module.exports = mejsCompile

// mejsCompile(pattern, options) => Mejs class
// mejsCompile(mejsFile, options) => Mejs class
//
// Examples:
//
// var Mejs = mejsCompile('views/**/*.ejs')
// var mejs = new Mejs({
//   config: config
// })
//
// ...
// mejs.render('index', {user: req.user})
// ...
function mejsCompile (mejsFile, options) {
  options = options || {}

  if (typeof mejsFile === 'string') {
    options.mini = false
    mejsFile = mejsCompile.precompileFromGlob(mejsFile, options)
  }
  if (!(mejsFile instanceof File)) throw new TypeError(String(mejsFile) + ' is not File object')
  var sandbox = options.sandbox || {console: console}
  sandbox.module = {exports: {}}
  runInNewContext(mejsFile.contents.toString(), sandbox, {filename: mejsFile.path})
  return sandbox.module.exports
}

// Ejs templates engine class
mejsCompile.Templates = Templates

// File class
mejsCompile.File = File

// mejsCompile.initView(pattern, options) => View class
// useful for express
//
// Examples:
//
// var app = express()
// app.set('view', mejs.initView('views/**/*.ejs', {
//   layout: 'layout',
//   locals: app.locals
// })
//
// ...
// res.render('index', {user: req.user})
// ...
mejsCompile.initView = function (pattern, options) {
  function View (tplName) {
    this.tplName = tplName
  }
  var mejs = mejsCompile.initMejs(pattern, options)

  View.prototype.path = 'NONE' // fake for express
  View.mejs = View.prototype.mejs = mejs
  View.prototype.render = function (data, fn) {
    fn(null, mejs.renderEx(this.tplName, data))
  }
  return View
}

// mejsCompile.initMejs(pattern, options) => `mejs` object with `renderEx` method
// useful for server side
//
// Examples: mejsCompile.initView, https://github.com/toajs/toa-mejs
//
mejsCompile.initMejs = function (pattern, options) {
  options = options || {}

  var Mejs = mejsCompile(pattern, options)

  Mejs.prototype.renderEx = function (tplName, data) {
    data = data || {}
    var tpl = this.render(tplName, data)
    var layout = this.locals.layout || data.layout
    if (layout && data.layout !== false && this.templates[layout]) {
      data.body = tpl
      return this.render(layout, data)
    }
    return tpl
  }

  var locals = options.locals || {}
  locals.layout = locals.layout || options.layout
  return new Mejs(locals)
}

// mejsCompile.precompile(files, options) => file object
// useful for gulp
//
// Examples: https://github.com/teambition/gulp-mejs
//
mejsCompile.precompile = function (files, options) {
  options = options || {}

  var isBuffer = true
  var contentTpl = "templates['%s'] = %s;\n\n"
  var templates = files.reduce(function (joined, file) {
    var name = path.relative(file.base, file.path).replace(/\\/g, '/')
    name = name.replace(path.extname(name), '').replace(/^[\.\/]*/, '')

    isBuffer = isBuffer && Buffer.isBuffer(file.contents)
    var tpl = new Templates(stripBOM(file.contents.toString()), options)
    return joined + util.format(contentTpl, name, tpl.compile())
  }, '')

  templates = templates.replace(/^/gm, '  ').replace(/^\s+$/gm, '').trim()
  templates = (options.mini ? tplsTpl : mejsTpl).replace('/* TEMPLATES_PLACEHOLDER */', function () { return templates })

  return new File(isBuffer ? new Buffer(templates) : templates, options.filename || 'mejs.js')
}

mejsCompile.precompileFromGlob = function (pattern, options) {
  options = options || {}
  var globOptions = options.glob || {}
  globOptions.nodir = true
  globOptions.strict = true
  globOptions.matchBase = globOptions.matchBase !== false
  var files = glob.sync(pattern, globOptions)
  if (!files.length) throw new Error('No file matched with ' + pattern)
  if (!options.base) options.base = globBase(pattern, files)
  return mejsCompile.precompile(files.map(function (path) {
    return new File(fs.readFileSync(path), path, options.base)
  }), options)
}

function File (contents, path, base) {
  this.contents = contents
  this.path = path || ''
  this.base = base || ''
}

function globBase (pattern, globFiles) {
  var base = extractGlobBase(pattern, globFiles)
  if (base[base.length - 1] === path.sep) return base.slice(0, -1)
  return path.dirname(base)
}

function extractGlobBase (pattern, globFiles) {
  var base = []
  for (var i = 0; i < pattern.length; i++) {
    for (var j = 0; j < globFiles.length; j++) {
      if (pattern[i] !== globFiles[j][i]) return base.join('')
    }
    base.push(pattern[i])
  }
  return base.join('')
}

function stripBOM (content) {
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1)
  return content
}
