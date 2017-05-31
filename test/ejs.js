'use strict'

// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT

const fs = require('fs')
const tman = require('tman')
const assert = require('assert')
const mejsCompile = require('..')
const read = fs.readFileSync

function fixtureMejs (name, options) {
  let Mejs = mejsCompile('test/fixtures/' + name, options)
  return new Mejs(options && options.locals)
}

function tplStr2Mejs (tplStr, options) {
  let file = new mejsCompile.File(Buffer.from(tplStr), 'index.ejs')
  let Mejs = mejsCompile(mejsCompile.precompile([file], options), options)
  return new Mejs(options && options.locals)
}

function fixtureFile (name) {
  return read('test/fixtures/' + name, 'utf8')
}

/**
 * User fixtures.
 */
let users = []
users.push({name: 'geddy'})
users.push({name: 'neil'})
users.push({name: 'alex'})

tman.suite('Basic', function () {
  tman.it('compile simple string', function () {
    let mejs = fixtureMejs('simple.ejs')
    assert.strictEqual(mejs.render('simple'), fixtureFile('simple.html'))
  })

  tman.it('compile empty string', function () {
    let mejs = fixtureMejs('empty.ejs')
    assert.strictEqual(mejs.render('empty'), '')
  })

  tman.it('throw if template not exist', function () {
    assert.throws(function () {
      fixtureMejs('simple.ejs').render('none')
    })
  })

  tman.it('throw if there are JS syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('fail-js.ejs').render('fail')
    })
  })

  tman.it('throw if there are ejs syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('fail-ejs.ejs').render('fail')
    })
  })

  tman.it('throw if there are ejs syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('error.ejs').render('no.newlines.error')
    })
  })

  tman.it('throw if there are ejs syntax errors', function () {
    assert.throws(function () {
      fixtureMejs('no.newlines.error.ejs').render('no.newlines.error')
    })
  })

  tman.it('throw if ejs syntax without "it"', function () {
    assert.throws(function () {
      tplStr2Mejs('<p><%= name %></p>').render('index', {name: 'lilei'})
    })
  })

  tman.it('allow customizing delimiter local var', function () {
    let mejs
    mejs = tplStr2Mejs('<p><?= it.name ?></p>', {delimiter: '?'})
    assert.strictEqual(mejs.render('index', {name: 'lilei'}), '<p>lilei</p>')

    mejs = tplStr2Mejs('<p><:= it.name :></p>', {delimiter: ':'})
    assert.strictEqual(mejs.render('index', {name: 'lilei'}), '<p>lilei</p>')

    mejs = tplStr2Mejs('<p><$= it.name $></p>', {delimiter: '$'})
    assert.strictEqual(mejs.render('index', {name: 'lilei'}), '<p>lilei</p>')
  })

  tman.it('allow default local var', function () {
    let mejs
    mejs = tplStr2Mejs('<p><%= it.name %></p>', {locals: {name: 'zhang'}})
    assert.strictEqual(mejs.render('index'), '<p>zhang</p>')
    assert.strictEqual(mejs.render('index', {name: 'li'}), '<p>li</p>')
    assert.strictEqual(mejs.render('index', {name: null}), '<p></p>')
  })

  tman.it('context is mejs', function () {
    let mejs = fixtureMejs('context.ejs')
    assert.strictEqual(mejs.render('context', {ctx: mejs}), fixtureFile('context.html'))
  })
})

tman.suite('Special value', function () {
  tman.it('undefined renders nothing escaped', function () {
    let mejs = tplStr2Mejs('<%= undefined %>')
    assert.strictEqual(mejs.render('index'), '')

    mejs = tplStr2Mejs('<%- undefined %>')
    assert.strictEqual(mejs.render('index'), '')

    mejs = tplStr2Mejs('<%= it.name %>', {})
    assert.strictEqual(mejs.render('index'), '')
  })

  tman.it('null renders nothing escaped', function () {
    let mejs = tplStr2Mejs('<%= null %>')
    assert.strictEqual(mejs.render('index'), '')

    mejs = tplStr2Mejs('<%- null %>')
    assert.strictEqual(mejs.render('index'), '')
  })

  tman.it('zero-value data item renders something escaped', function () {
    let mejs = tplStr2Mejs('<%= 0 %>')
    assert.strictEqual(mejs.render('index'), '0')

    mejs = tplStr2Mejs('<%- 0 %>')
    assert.strictEqual(mejs.render('index'), '0')
  })

  tman.it('false renders something escaped', function () {
    let mejs = tplStr2Mejs('<%= false %>')
    assert.strictEqual(mejs.render('index'), 'false')

    mejs = tplStr2Mejs('<%- false %>')
    assert.strictEqual(mejs.render('index'), 'false')
  })
})

tman.suite('<%', function () {
  tman.it('without semicolons', function () {
    let mejs = fixtureMejs('no.semicolons.ejs')
    assert.strictEqual(mejs.render('no.semicolons'), fixtureFile('no.semicolons.html'))
  })
})

tman.suite('<%=', function () {
  tman.it('escape &amp;<script>', function () {
    let mejs = tplStr2Mejs('<%= it.name %>')
    assert.strictEqual(mejs.render('index', {name: '&nbsp;<script>'}), '&amp;nbsp;&lt;script&gt;')
  })

  tman.it("should escape '", function () {
    let mejs = tplStr2Mejs('<%= it.name %>')
    assert.strictEqual(mejs.render('index', {name: "The Jones's"}), 'The Jones&#39;s')
  })

  tman.it('should escape &foo_bar;', function () {
    let mejs = tplStr2Mejs('<%= it.name %>')
    assert.strictEqual(mejs.render('index', {name: '&foo_bar;'}), '&amp;foo_bar;')
  })
})

tman.suite('<%-', function () {
  tman.it('not escape', function () {
    let mejs = tplStr2Mejs('<%- it.name %>')
    assert.strictEqual(mejs.render('index', {name: '<script>'}), '<script>')
  })
})

tman.suite('%>', function () {
  tman.it('produce newlines', function () {
    let mejs = fixtureMejs('newlines.ejs')
    assert.strictEqual(mejs.render('newlines', {users: users}), fixtureFile('newlines.html'))
  })
  tman.it('works with `-%>` interspersed', function () {
    let mejs = fixtureMejs('newlines.mixed.ejs')
    assert.strictEqual(mejs.render('newlines.mixed', {users: users}), fixtureFile('newlines.mixed.html'))
  })
  tman.it('consecutive tags work', function () {
    let mejs = fixtureMejs('consecutive-tags.ejs')
    assert.strictEqual(mejs.render('consecutive-tags'), fixtureFile('consecutive-tags.html'))
  })
})

tman.suite('-%>', function () {
  tman.it('not produce newlines', function () {
    let mejs = fixtureMejs('no.newlines.ejs')
    assert.strictEqual(mejs.render('no.newlines', {users: users}), fixtureFile('no.newlines.html'))
  })

  tman.it('works with unix style', function () {
    let mejs = tplStr2Mejs('<ul><% -%>\n' +
      '<% it.users.forEach(function(user){ -%>\n' +
      '<li><%= user.name -%></li>\n' +
      '<% }) -%>\n' +
      '</ul><% -%>\n')

    let expectedResult = '<ul><li>geddy</li>\n<li>neil</li>\n<li>alex</li>\n</ul>'
    assert.equal(mejs.render('index', {users: users}), expectedResult)
  })

  tman.it('works with windows style', function () {
    let mejs = tplStr2Mejs('<ul><% -%>\r\n' +
      '<% it.users.forEach(function(user){ -%>\r\n' +
      '<li><%= user.name -%></li>\r\n' +
      '<% }) -%>\r\n' +
      '</ul><% -%>\r\n')

    let expectedResult = '<ul><li>geddy</li>\r\n<li>neil</li>\r\n<li>alex</li>\r\n</ul>'
    assert.equal(mejs.render('index', {users: users}), expectedResult)
  })
})

tman.suite('<%%', function () {
  tman.it('produce literals', function () {
    let mejs = tplStr2Mejs('<%%- "foo" %>')
    assert.strictEqual(mejs.render('index'), '<%- "foo" %>')
  })

  tman.it('work without an end tag', function () {
    let mejs = tplStr2Mejs('<%%')
    assert.strictEqual(mejs.render('index'), '<%')

    mejs = fixtureMejs('literal.ejs', {delimiter: ' '})
    assert.strictEqual(mejs.render('literal'), fixtureFile('literal.html'))
  })
})

tman.suite('%%>', function () {
  tman.it('produce literal', function () {
    let mejs = tplStr2Mejs('%%>')
    assert.strictEqual(mejs.render('index'), '%>')

    mejs = tplStr2Mejs('  >', {delimiter: ' '})
    assert.strictEqual(mejs.render('index'), ' >')
  })
})

tman.suite('<%_ and _%>', function () {
  tman.it('slurps spaces and tabs', function () {
    let mejs = fixtureMejs('space-and-tab-slurp.ejs')
    assert.strictEqual(mejs.render('space-and-tab-slurp', {users: users}),
      fixtureFile('space-and-tab-slurp.html'))
  })
})

tman.suite('single quotes', function () {
  tman.it('not mess up the constructed function', function () {
    let mejs = fixtureMejs('single-quote.ejs')
    assert.strictEqual(mejs.render('single-quote'), fixtureFile('single-quote.html'))
  })
})

tman.suite('double quotes', function () {
  tman.it('not mess up the constructed function', function () {
    let mejs = fixtureMejs('double-quote.ejs')
    assert.strictEqual(mejs.render('double-quote'), fixtureFile('double-quote.html'))
  })
})

tman.suite('backslashes', function () {
  tman.it('escape', function () {
    let mejs = fixtureMejs('backslash.ejs')
    assert.strictEqual(mejs.render('backslash'), fixtureFile('backslash.html'))
  })
})

tman.suite('messed up whitespace', function () {
  tman.it('work', function () {
    let mejs = fixtureMejs('messed.ejs')
    assert.strictEqual(mejs.render('messed', {users: users}), fixtureFile('messed.html'))
  })
})

tman.suite('rmWhitespace', function () {
  tman.it('works', function () {
    let mejs = fixtureMejs('rmWhitespace.ejs', {rmWhitespace: true})
    assert.strictEqual(mejs.render('rmWhitespace'), fixtureFile('rmWhitespace.html'))
  })
})

tman.suite('include()', function () {
  tman.it('include ejs', function () {
    let mejs = fixtureMejs('include-simple.ejs')
      .import(fixtureMejs('hello-world.ejs'))
    assert.strictEqual(mejs.render('include-simple'), fixtureFile('include-simple.html'))
  })

  tman.it('include ejs fails if not exist', function () {
    assert.throws(function () {
      fixtureMejs('include-simple.ejs').render('include-simple')
    })
  })

  tman.it('strips BOM', function () {
    let mejs = tplStr2Mejs('<%- include("includes/bom") %>')
      .import(fixtureMejs('includes/bom.ejs', {base: 'test/fixtures'}))
    assert.strictEqual(mejs.render('index'), '<p>This is a file with BOM.</p>')
  })

  tman.it('include ejs with locals', function () {
    let mejs = fixtureMejs('include.ejs', {delimiter: '@'})
      .import(fixtureMejs('pet.ejs', {delimiter: '@'}))
    assert.strictEqual(mejs.render('include', {pets: users}), fixtureFile('include.html'))
  })

  tman.it('work when nested', function () {
    let mejs = fixtureMejs('menu.ejs')
      .import(fixtureMejs('includes/menu-item.ejs', {base: 'test/fixtures'}))
      .import(fixtureMejs('includes/menu/item.ejs', {base: 'test/fixtures'}))
    assert.strictEqual(mejs.render('menu', {pets: users}), fixtureFile('menu.html'))
  })

  tman.it('work with a variable path', function () {
    let includePath = 'includes/menu-item'
    let mejs = fixtureMejs('menu_var.ejs')
      .import(fixtureMejs('includes/menu-item.ejs', {base: 'test/fixtures'}))
      .import(fixtureMejs('includes/menu/item.ejs', {base: 'test/fixtures'}))
    assert.strictEqual(mejs.render('menu_var', {pets: users, varPath: includePath}), fixtureFile('menu.html'))
  })

  tman.it('include arbitrary files as-is', function () {
    let mejs = fixtureMejs('include.css.ejs')
      .import(fixtureMejs('style.css'))
    assert.strictEqual(mejs.render('include.css'), fixtureFile('include.css.html'))
  })

  tman.it('no false positives', function () {
    let mejs = tplStr2Mejs('<p><% %> include foo <% %></p>')
    assert.strictEqual(mejs.render('index'), '<p> include foo </p>')
  })
})

tman.suite('comments', function () {
  tman.it('fully render with comments removed', function () {
    let mejs = fixtureMejs('comments.ejs')
    assert.strictEqual(mejs.render('comments'), fixtureFile('comments.html'))
  })
})
