// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT
/* global module, define, window */

// Mejs is a compiled templates class, it can be run in node.js or browers

;(function (root, factory) {
  'use strict'

  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define([], factory)
  else root.Mejs = factory()
}(typeof window === 'object' ? window : this, function () {
  'use strict'

  var hasOwn = Object.prototype.hasOwnProperty
  var templates = {}
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  }

  function Mejs (locals) {
    this.locals = locals || {}
    this.templates = copy({}, templates, true)
  }

  Mejs.import = function (tpls) {
    copy(templates, tpls, true)
    return this
  }

  var proto = Mejs.prototype
  proto.copy = copy

  proto.render = function (tplName, data) {
    var template = this.get(tplName)
    if (typeof template !== 'function') throw new Error(tplName + ' is not found')

    var _data = this.copy(data, this.locals)
    try {
      return template.call(this, _data, tplName)
    } catch (err) {
      if (!err.tplName) {
        err.tplName = tplName
        err.tplFn = template.toString()
        err.tplData = _data
      }
      throw err
    }
  }

  proto.get = function (tplName) {
    return hasOwn.call(this.templates, tplName) ? this.templates[tplName] : null
  }

  proto.add = function (tplName, tplFn, overwrite) {
    if (!overwrite && hasOwn.call(this.templates, tplName)) throw new Error(tplName + ' exist')
    this.templates[tplName] = tplFn
    return this
  }

  proto.remove = function (tplName) {
    delete this.templates[tplName]
    return this
  }

  proto.import = function (ns, mejs, overwrite) {
    if (typeof ns !== 'string') {
      overwrite = mejs
      mejs = ns
      ns = '/'
    } else ns = ns.replace(/\/?$/, '/')
    for (var tplName in mejs.templates) {
      if (hasOwn.call(mejs.templates, tplName)) {
        this.add(this.resolve(ns, tplName), mejs.get(tplName), overwrite)
      }
    }
    return this
  }

  proto.resolve = function (parent, current) {
    parent = this.stringify(parent)
    current = this.stringify(current).replace(/^([^./])/, '/$1')
    current = /^\//.test(current) && !/\/$/.test(parent)
      ? current : (parent.replace(/[^/]*\.?[^/]*$/, '').replace(/\/?$/, '/') + current)
    current = current.replace(/\/\.?\/+/g, '/')
    while (/\/\.\.\//.test(current)) current = current.replace(/[^/]*\/\.\.\//g, '')
    return current.replace(/^[./]*/, '')
  }

  proto.escape = function (str) {
    return this.stringify(str).replace(/[&<>"'`]/g, function (match) {
      return htmlEscapes[match]
    })
  }

  proto.stringify = function (str) {
    return str == null ? '' : String(str)
  }

  function copy (dst, src, overwrite) {
    dst = dst || {}
    for (var key in src) {
      if (hasOwn.call(src, key) && (overwrite || !hasOwn.call(dst, key))) dst[key] = src[key]
    }
    return dst
  }

  /* TEMPLATES_PLACEHOLDER */

  return Mejs
}))
