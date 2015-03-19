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

## Demo


## Installation

```bash
npm install mejs
```

## API

```js
var mejsCompile = require('mejs');
```

### mejsCompile(pattern, [options]) => `Mejs` Class

Compile ejs templates to a `Mejs` Class.

- `pattern`: [Glob](https://github.com/isaacs/node-glob) pattern to read template files.
- `options.glob`: Glob options
- `options.base`: Everything before a glob (same as tplName) starts, default is `''`.
- `options.delimiter`: Character to use with angle brackets for open/close, default is `%`.
- `options.rmWhitespace`: Remove all safe-to-remove whitespace, including leading and trailing whitespace. It also enables a safer version of `-%>` line slurping for all scriptlet tags (it does not strip new lines of tags in the middle of a line).

```js
var Mejs = mejsCompile('views/**/*.html', {base: 'views'});
```

### mejsCompile.initMejs(pattern, [options]) => `renderTpl` function

- `pattern`: `pattern` is same as above.
- `options`: `options` is same as above, and have `options.locals` apply for Mejs class

```js
var app = express();
var renderTpl = mejsCompile.initMejs('views/**/*.ejs', {
  layout: 'layout',
  locals: app.locals
});
app.engine('ejs', renderTpl);
app.set('view engine', 'ejs');

//... render with layout
res.render('index', {user: req.user});

//... disable layout for 'login' view
res.render('login', {layout: false});
```

### mejsCompile.precompile(files, [options]) => `mejs` file object
Precompile ejs templates to a file object, then you can write it to a JS file.

- `files`: Template files array, the file in array must have `path` and `contents`.
- `options`: `options` is same as above.

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

### mejsCompile.precompileFromGlob(pattern, [options]) => `mejs` file object
Precompile ejs teamplates to a file object, then you can write it to a JS file.

- `pattern`: glob pattern.
- `options`: `options` is same as above.

```js
var mejsSource = mejsCompile.precompileFromGlob('views/**/*.js', {base: 'views'});
```

### mejsCompile.Templates(text, [options])
Ejs templates engine.

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
