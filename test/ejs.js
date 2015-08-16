'use strict'

// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT

/*global describe, it*/

// var Ejs = require('../lib/ejs')
var mejsCompile = require('../index')
var fs = require('fs')
var read = fs.readFileSync
var assert = require('assert')
// var path = require('path')

// From https://gist.github.com/pguillory/729616
// function hook_stdio (stream, callback) {
//   var old_write = stream.write
//
//   stream.write = (function () {
//     return function (string, encoding, fd) {
//       callback(string, encoding, fd)
//     }
//   })(stream.write)
//
//   return function () {
//     stream.write = old_write
//   }
// }

/**
 * Load(fixtureFile `name`.
 */

function fixtureMejs (name, options) {
  var Mejs = mejsCompile('test/fixtures/' + name, options)
  return new Mejs(options && options.locals)
}

function tplStr2Mejs (tplStr, options) {
  var file = new mejsCompile.File(new Buffer(tplStr), 'index.ejs')
  var Mejs = mejsCompile(mejsCompile.precompile([file], options), options)
  return new Mejs(options && options.locals)
}

function fixtureFile (name) {
  return read('test/fixtures/' + name, 'utf8').trim()
}

/**
 * User fixtures.
 */

var users = []
users.push({name: 'geddy'})
users.push({name: 'neil'})
users.push({name: 'alex'})

describe('Basic', function () {
  it('compile simple string', function () {
    var mejs = fixtureMejs('simple.ejs')
    assert.strictEqual(mejs.render('simple'), fixtureFile('simple.html'))
  })

  it('compile empty string', function () {
    var mejs = fixtureMejs('empty.ejs')
    assert.strictEqual(mejs.render('empty'), '')
  })

  it('throw if template not exist', function () {
    assert.throws(function () {
      fixtureMejs('simple.ejs').render('none')
    })
  })

  it('throw if there are JS syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('fail-js.ejs').render('fail')
    })
  })

  it('throw if there are ejs syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('fail-ejs.ejs').render('fail')
    })
  })

  it('throw if there are ejs syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('error.ejs').render('no.newlines.error')
    })
  })

  it('throw if there are ejs syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('no.newlines.error.ejs').render('no.newlines.error')
    })
  })

  it('throw if ejs syntax without "it"', function () {
    assert.throws(function () {
      tplStr2Mejs('<p><%= name %></p>').render('index', {name: 'lilei'})
    })
  })

  it('allow customizing delimiter local var', function () {
    var mejs
    mejs = tplStr2Mejs('<p><?= it.name ?></p>', {delimiter: '?'})
    assert.strictEqual(mejs.render('index', {name: 'lilei'}), '<p>lilei</p>')

    mejs = tplStr2Mejs('<p><:= it.name :></p>', {delimiter: ':'})
    assert.strictEqual(mejs.render('index', {name: 'lilei'}), '<p>lilei</p>')

    mejs = tplStr2Mejs('<p><$= it.name $></p>', {delimiter: '$'})
    assert.strictEqual(mejs.render('index', {name: 'lilei'}), '<p>lilei</p>')
  })

  it('allow default local var', function () {
    var mejs
    mejs = tplStr2Mejs('<p><%= it.name %></p>', {locals: {name: 'zhang'}})
    assert.strictEqual(mejs.render('index'), '<p>zhang</p>')
    assert.strictEqual(mejs.render('index', {name: 'li'}), '<p>li</p>')
    assert.strictEqual(mejs.render('index', {name: null}), '<p></p>')
  })

  it('context is mejs', function () {
    var mejs = fixtureMejs('context.ejs')
    assert.strictEqual(mejs.render('context', {ctx: mejs}), fixtureFile('context.html'))
  })
})

describe('Special value', function () {
  it('undefined renders nothing escaped', function () {
    var mejs = tplStr2Mejs('<%= undefined %>')
    assert.strictEqual(mejs.render('index'), '')

    mejs = tplStr2Mejs('<%- undefined %>')
    assert.strictEqual(mejs.render('index'), '')

    mejs = tplStr2Mejs('<%= it.name %>', {})
    assert.strictEqual(mejs.render('index'), '')
  })

  it('null renders nothing escaped', function () {
    var mejs = tplStr2Mejs('<%= null %>')
    assert.strictEqual(mejs.render('index'), '')

    mejs = tplStr2Mejs('<%- null %>')
    assert.strictEqual(mejs.render('index'), '')
  })

  it('zero-value data item renders something escaped', function () {
    var mejs = tplStr2Mejs('<%= 0 %>')
    assert.strictEqual(mejs.render('index'), '0')

    mejs = tplStr2Mejs('<%- 0 %>')
    assert.strictEqual(mejs.render('index'), '0')
  })

  it('false renders something escaped', function () {
    var mejs = tplStr2Mejs('<%= false %>')
    assert.strictEqual(mejs.render('index'), 'false')

    mejs = tplStr2Mejs('<%- false %>')
    assert.strictEqual(mejs.render('index'), 'false')
  })
})

describe('<%', function () {
  it('without semicolons', function () {
    var mejs = fixtureMejs('no.semicolons.ejs')
    assert.strictEqual(mejs.render('no.semicolons'), fixtureFile('no.semicolons.html'))
  })
})

describe('<%=', function () {
  it('escape &amp;<script>', function () {
    var mejs = tplStr2Mejs('<%= it.name %>')
    assert.strictEqual(mejs.render('index', {name: '&nbsp;<script>'}), '&amp;nbsp;&lt;script&gt;')
  })

  it("should escape '", function () {
    var mejs = tplStr2Mejs('<%= it.name %>')
    assert.strictEqual(mejs.render('index', {name: "The Jones's"}), 'The Jones&#39;s')
  })

  it('should escape &foo_bar;', function () {
    var mejs = tplStr2Mejs('<%= it.name %>')
    assert.strictEqual(mejs.render('index', {name: '&foo_bar;'}), '&amp;foo_bar;')
  })
})

describe('<%-', function () {
  it('not escape', function () {
    var mejs = tplStr2Mejs('<%- it.name %>')
    assert.strictEqual(mejs.render('index', {name: '<script>'}), '<script>')
  })
})

describe('%>', function () {
  it('produce newlines', function () {
    var mejs = fixtureMejs('newlines.ejs')
    assert.strictEqual(mejs.render('newlines', {users: users}), fixtureFile('newlines.html'))
  })
  it('works with `-%>` interspersed', function () {
    var mejs = fixtureMejs('newlines.mixed.ejs')
    assert.strictEqual(mejs.render('newlines.mixed', {users: users}), fixtureFile('newlines.mixed.html'))
  })
  it('consecutive tags work', function () {
    var mejs = fixtureMejs('consecutive-tags.ejs')
    assert.strictEqual(mejs.render('consecutive-tags'), fixtureFile('consecutive-tags.html'))
  })
})

describe('-%>', function () {
  it('not produce newlines', function () {
    var mejs = fixtureMejs('no.newlines.ejs')
    assert.strictEqual(mejs.render('no.newlines', {users: users}), fixtureFile('no.newlines.html'))
  })
})

describe('<%%', function () {
  it('produce literals', function () {
    var mejs = tplStr2Mejs('<%%- "foo" %>')
    assert.strictEqual(mejs.render('index'), '<%- "foo" %>')
  })

  it('work without an end tag', function () {
    var mejs = tplStr2Mejs('<%%')
    assert.strictEqual(mejs.render('index'), '<%')

    mejs = fixtureMejs('literal.ejs', {delimiter: ' '})
    assert.strictEqual(mejs.render('literal'), fixtureFile('literal.html'))
  })
})

describe('single quotes', function () {
  it('not mess up the constructed function', function () {
    var mejs = fixtureMejs('single-quote.ejs')
    assert.strictEqual(mejs.render('single-quote'), fixtureFile('single-quote.html'))
  })
})

describe('double quotes', function () {
  it('not mess up the constructed function', function () {
    var mejs = fixtureMejs('double-quote.ejs')
    assert.strictEqual(mejs.render('double-quote'), fixtureFile('double-quote.html'))
  })
})

describe('backslashes', function () {
  it('escape', function () {
    var mejs = fixtureMejs('backslash.ejs')
    assert.strictEqual(mejs.render('backslash'), fixtureFile('backslash.html'))
  })
})

describe('messed up whitespace', function () {
  it('work', function () {
    var mejs = fixtureMejs('messed.ejs')
    assert.strictEqual(mejs.render('messed', {users: users}), fixtureFile('messed.html'))
  })
})

describe('rmWhitespace', function () {
  it('works', function () {
    var mejs = fixtureMejs('rmWhitespace.ejs', {rmWhitespace: true})
    assert.strictEqual(mejs.render('rmWhitespace'), fixtureFile('rmWhitespace.html'))
  })
})

describe('include()', function () {
  it('include ejs', function () {
    var mejs = fixtureMejs('include-simple.ejs')
      .import(fixtureMejs('hello-world.ejs'))
    assert.strictEqual(mejs.render('include-simple'), fixtureFile('include-simple.html'))
  })

  it('include ejs fails if not exist', function () {
    assert.throws(function () {
      fixtureMejs('include-simple.ejs').render('include-simple')
    })
  })

  it('strips BOM', function () {
    var mejs = tplStr2Mejs('<%- include("includes/bom") %>')
      .import(fixtureMejs('includes/bom.ejs', {base: 'test/fixtures'}))
    assert.strictEqual(mejs.render('index'), '<p>This is a file with BOM.</p>')
  })

  it('include ejs with locals', function () {
    var mejs = fixtureMejs('include.ejs', {delimiter: '@'})
      .import(fixtureMejs('pet.ejs', {delimiter: '@'}))
    assert.strictEqual(mejs.render('include', {pets: users}), fixtureFile('include.html'))
  })

  it('work when nested', function () {
    var mejs = fixtureMejs('menu.ejs')
      .import(fixtureMejs('includes/menu-item.ejs', {base: 'test/fixtures'}))
      .import(fixtureMejs('includes/menu/item.ejs', {base: 'test/fixtures'}))
    assert.strictEqual(mejs.render('menu', {pets: users}), fixtureFile('menu.html'))
  })

  it('work with a variable path', function () {
    var includePath = 'includes/menu-item'
    var mejs = fixtureMejs('menu_var.ejs')
      .import(fixtureMejs('includes/menu-item.ejs', {base: 'test/fixtures'}))
      .import(fixtureMejs('includes/menu/item.ejs', {base: 'test/fixtures'}))
    assert.strictEqual(mejs.render('menu_var', {pets: users, varPath: includePath}), fixtureFile('menu.html'))
  })

  it('include arbitrary files as-is', function () {
    var mejs = fixtureMejs('include.css.ejs')
      .import(fixtureMejs('style.css'))
    assert.strictEqual(mejs.render('include.css'), fixtureFile('include.css.html'))
  })

  it('no false positives', function () {
    var mejs = tplStr2Mejs('<p><% %> include foo <% %></p>')
    assert.strictEqual(mejs.render('index'), '<p> include foo </p>')
  })
})

describe('comments', function () {
  it('fully render with comments removed', function () {
    var mejs = fixtureMejs('comments.ejs')
    assert.strictEqual(mejs.render('comments'), fixtureFile('comments.html'))
  })
})
