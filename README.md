mejs
====
Moduled and Embedded JavaScript templates, run in node.js and all browsers.

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]

## Features

- Run in node.js and all browsers
- Control flow with `<% %>`
- Escaped output with `<%= %>`
- Unescaped raw output with `<%- %>`
- Trim-mode ('newline slurping') with `-%>` ending tag
- Custom delimiters (e.g., use '<? ?>' instead of '<% %>')
- Full support for `include`
- Full support for `import`(Moduled)
- Support `layout` in server side
- Support [express](https://github.com/strongloop/express), [koa](https://github.com/koajs/koa), [toa](https://github.com/toajs/toa) ...

## Tags

- `<%`: 'Scriptlet' tag, for control-flow, no output
- `<%=`: Outputs the value into the template (HTML escaped)
- `<%-`: Outputs the unescaped value into the template
- `<%#`: Comment tag, no execution, no output
- `<%%`: Outputs a literal '<%'
- `%>`:  Plain ending tag
- `-%>`: Trim-mode ('newline slurp') tag, trims following newline

Implementations:

- [toa-mejs](https://github.com/toajs/toa-mejs)
- [gulp-mejs](https://github.com/teambition/gulp-mejs)

## Demo


## Installation

```bash
npm install mejs
```

## API

```js
var mejsCompile = require('mejs');
```

### mejsCompile(patternOrMejsfile[, options]) => `Mejs` Class

Compile ejs templates to a `Mejs` Class.

- `patternOrMejsfile`: [Glob](https://github.com/isaacs/node-glob) pattern to read template files. Or `mejs` file object.
- `options.glob`: Glob options
- `options.base`: Everything before a glob (same as tplName) starts.
- `options.delimiter`: Character to use with angle brackets for open/close, default is `%`.
- `options.rmWhitespace`: Remove all safe-to-remove whitespace, including leading and trailing whitespace. It also enables a safer version of `-%>` line slurping for all scriptlet tags (it does not strip new lines of tags in the middle of a line).

```js
var Mejs = mejsCompile('views/**/*.html'); // options.base == 'views/'
```

### mejsCompile.initMejs(pattern[, options]) => `mejs` object

`mejs` object have `renderEx` method that support `layout`, it is useful in server side.

- `pattern`: `pattern` is same as above.
- `options`: `options` is same as above, and have `options.locals`, `options.layout` and `options.sandbox` apply for Mejs class.

### mejsCompile.initView(pattern[, options]) => `View` class

It is implemented for express. arguments is same as `mejsCompile.initMejs`.

```js
var app = express();
app.set('view', mejs.initView('views/**/*.ejs', {
  layout: 'layout',
  locals: app.locals
});

//... render with layout
res.render('index', {user: req.user});

//... disable layout for 'login' view
res.render('login', {layout: false});
```

### mejsCompile.precompile(files[, options]) => `mejs` file object
Precompile ejs templates to a file object, then you can write it to a JS file.

- `files`: Template files array, the file in array must have `path` and `contents`.
- `options`: `options` is same as above. but one more:
  - `options.mini`: Precompile a minimum templates module, it is not a Mejs class, should be imported to Mejs class by `Mejs.import`

```js
var mejsSource = mejsCompile.precompile([{
    path: 'index.html',
    contents: 'index content...'
  }, {
    path: 'layout.html',
    contents: 'layout content...'
  }, {
    path: 'lib/index',
    contents: 'lib index content...'
  }
  ...
], {base: 'views'});
```

### mejsCompile.precompileFromGlob(pattern[, options]) => `mejs` file object
Precompile ejs teamplates to a file object, then you can write it to a JS file.

- `pattern`: glob pattern.
- `options`: `options` is same as above.

```js
var mejsSource = mejsCompile.precompileFromGlob('views/**/*.js', {base: 'views'});
```

### mejsCompile.Templates(text[, options])
Ejs templates engine.

### mejsCompile.File(contents[, options][, base])
`mejs` file Class. It is similar to [vinyl](http://github.com/wearefractal/vinyl), AKA gulp file

### new Mejs(locals) => `mejs` object

- `locals`: global locals object, default is `{}`.

```js
// add config, moment and node-i18n to global locals
var mejs = new Mejs({
  config: {
    host: 'www.mejs.com',
    apiHost: 'www.mejs.com/api'
  },
  moment: moment,
  locale: function() {
    return this.locale;
  },
  __: function() {
    return this.__.apply(this, arguments);
  }
});
```

### Class Method: Mejs.import(templates)
Import templates to global from a templates module.

```js
var Mejs = require('Mejs');
var tplsA = require('tplsA');
var tplsB = require('tplsB');

Mejs.import(tplsA).import(tplsB);
```

### mejs.render(tplName, data) => filled view string
Render a template with data

- `tplName`: a full template name
- `data`: data object filled to template

```js
mejs.render('index', userObj);
mejs.render('global/header', headerDate);
//...
```

### mejs.import([namespace], mejsX)
import another mejs object object to `mejs`, then `mejs` will have the templates that from `mejsX`.

- `namespace`: namespace string
- `mejsX`: mejs object for import

```js
mejs.import('common', mejsA);
```

### mejs.add(tplName, tplFn)
Add a template function to current mejs.

### mejs.get(tplName)
Get a template function from current mejs.

### mejs.remove(tplName)
Remove a template function from current mejs.

### mejs.resolve(from, to)
Resolve template path.

### mejs.escape(string)
`escape` function for templates function. You can overwrite it.

[npm-url]: https://npmjs.org/package/mejs
[npm-image]: http://img.shields.io/npm/v/mejs.svg

[travis-url]: https://travis-ci.org/teambition/mejs
[travis-image]: http://img.shields.io/travis/teambition/mejs.svg
