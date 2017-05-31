// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT

'use strict'

const fs = require('fs')
const util = require('util')
const path = require('path')
const glob = require('glob')
const Template = require('./ejs')
const runInNewContext = require('vm').runInNewContext

const mejsTpl = fs.readFileSync(path.join(__dirname, 'mejs.js'), {encoding: 'utf8'})
const tplsTpl = fs.readFileSync(path.join(__dirname, 'tpls.js'), {encoding: 'utf8'})

module.exports = mejsCompile

// mejsCompile(pattern, options) => Mejs class
// mejsCompile(mejsFile, options) => Mejs class
//
// Examples:
//
// const Mejs = mejsCompile('views/**/*.ejs')
// const mejs = new Mejs({
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
  const sandbox = options.sandbox || {console: console}
  sandbox.module = {exports: {}}
  runInNewContext(mejsFile.contents.toString(), sandbox, {filename: mejsFile.path})
  return sandbox.module.exports
}

// Ejs templates engine class
mejsCompile.Template = mejsCompile.Templates = Template

// File class
mejsCompile.File = File

// mejsCompile.initView(pattern, options) => View class
// useful for express
//
// Examples:
//
// const app = express()
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
  const mejs = mejsCompile.initMejs(pattern, options)

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

  const Mejs = mejsCompile(pattern, options)

  Mejs.prototype.renderEx = function (tplName, data) {
    data = data || {}
    let tpl = this.render(tplName, data)
    let layout = this.locals.layout || data.layout
    if (layout && data.layout !== false && this.templates[layout]) {
      data.body = tpl
      return this.render(layout, data)
    }
    return tpl
  }

  let locals = options.locals || {}
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

  let isBuffer = true
  let contentTpl = "templates['%s'] = %s;\n\n"
  let templates = files.reduce(function (joined, file) {
    let name = path.relative(file.base, file.path).replace(/\\/g, '/')
    name = name.replace(path.extname(name), '').replace(/^[./]*/, '')

    isBuffer = isBuffer && Buffer.isBuffer(file.contents)
    let str = stripBOM(file.contents.toString())
    if (options.rmComment) str = str.replace(/<!--([\s\S]*?)-->/g, '')
    if (options.rmLinefeed) str = str.replace(/\n+[\s]*/g, '')

    let tpl = new Template(str, options)
    return joined + util.format(contentTpl, name, tpl.compile())
  }, '')

  templates = templates.replace(/^/gm, '  ').replace(/^\s+$/gm, '').trim()
  templates = (options.mini ? tplsTpl : mejsTpl).replace('/* TEMPLATES_PLACEHOLDER */', function () { return templates })

  return new File(isBuffer ? Buffer.from(templates) : templates, options.filename || 'mejs.js')
}

mejsCompile.precompileFromGlob = function (pattern, options) {
  options = options || {}
  let globOptions = options.glob || {}
  globOptions.nodir = true
  globOptions.strict = true
  globOptions.matchBase = globOptions.matchBase !== false
  let files = glob.sync(pattern, globOptions)
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
  let base = extractGlobBase(pattern, globFiles)
  if (base[base.length - 1] === path.sep) return base.slice(0, -1)
  return path.dirname(base)
}

function extractGlobBase (pattern, globFiles) {
  const base = []
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < globFiles.length; j++) {
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
