// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT
/* global module, define, window */

// minimum templates module, should be imported to Mejs class by `Mejs.import`

;(function (root, factory) {
  'use strict'

  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define([], factory)
  else {
    var templates = factory()
    var hasOwn = Object.prototype.hasOwnProperty
    if (!root.templates) root.templates = templates
    else {
      for (var key in templates) {
        if (hasOwn.call(templates, key) && !hasOwn.call(root.templates, key)) {
          root.templates[key] = templates[key]
        }
      }
    }
  }
}(typeof window === 'object' ? window : this, function () {
  'use strict'

  var templates = {}

  /* TEMPLATES_PLACEHOLDER */

  return templates
}))
