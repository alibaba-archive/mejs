// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT
/* global module, define, setImmediate, window */

;(function(root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.moduleName = factory();
}(typeof window === 'object' ? window : this, function() {
  'use strict';

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  function Mejs(locals) {
    var templates = {};
    this.locals = locals || {};
    this.templates = templates;
    /*TEMPLATES_PLACEHOLDER*/
  }

  var proto = Mejs.prototype;

  proto.render = function(tplName, data) {
    var it  = copy({}, this.locals);
    return this.get(tplName).call(this, copy(it, data), tplName);
  };

  proto.add = function(tplName, tplFn) {
    if (hasOwnProperty.call(this.templates, tplName))
      throw new Error(tplName + ' is exist');
    this.templates[tplName] = tplFn;
    return this;
  };

  proto.get = function(tplName) {
    if (!hasOwnProperty.call(this.templates, tplName))
      throw new Error(tplName + ' is not found');
    return this.templates[tplName];
  };

  proto.remove = function(tplName) {
    delete this.templates[tplName];
    return this;
  };

  proto.import = function(ns, mejs) {
    if (typeof ns !== 'string') {
      mejs = ns;
      ns = '';
    }
    ns = ns.replace(/^\//, '').replace(/\/?$/, '\/');
    for (var tplName in mejs.templates) {
      if (hasOwnProperty.call(mejs.templates, tplName))
        this.add(this.resolve(ns, tplName), mejs.get(tplName));
    }
  };

  proto.resolve = function(from, to) {
    from = (from || '')
      .replace(/[^\/]*\.?[^\/]*$/, '')
      .replace(/\/?$/, '\/');
    return (from + to)
      .replace(/\/\.?\/+/g, '\/')
      .replace(/[^\/]+\/\.\.\//g, '')
      .replace(/^[\.\/]*/, '');
  };

  proto.escape = function(string) {
    if (!string) return '';
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&quot;');
  };

  function copy(to, from) {
    from = from || {};
    for (var key in from) {
      if (hasOwnProperty.call(from, key)) to[key] = from[key];
    }
    return to;
  }

  return Mejs;
}));
