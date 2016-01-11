// **Github:** https://github.com/teambition/mejs
//
// **License:** MIT

/*
 * Modify from: https://github.com/mde/ejs
 *
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

'use strict'

var _REGEX_STRING = '(<%%|<%=|<%-|<%#|<%|%>|-%>)'
var _TRAILING_SEMCOL = /;\s*$/
var _INCLUDE = /\binclude\(/
var _DEFAULT_DELIMITER = '%'
var _MODES = {
  RAW: 'raw',
  EVAL: 'eval',
  COMMENT: 'comment',
  ESCAPED: 'escaped',
  LITERAL: 'literal'
}

module.exports = Template

function Template (text, options) {
  options = options || {}

  this.delimiter = options.delimiter || _DEFAULT_DELIMITER
  this.openTag = '<' + this.delimiter
  this.closeTag = this.delimiter + '>'
  this.rmWhitespace = !!options.rmWhitespace
  this.regex = createRegex(this.delimiter)
  this.templateText = !options.rmWhitespace ? text : text.replace(/\r/g, '').replace(/^\s+|\s+$/gm, '')
  this.truncate = false
  this.currentLine = 1
  this.source = ''
  this.mode = null
}

Template.prototype.compile = function () {
  this.generateSource()
  var src = 'var ctx = this, __output = ""\n  '
  if (_INCLUDE.test(this.source)) {
    src += 'var include = function (tplName, data) { return ctx.render(ctx.resolve(__tplName, tplName), ctx.copy(data, it)) }\n  '
  }
  src += this.source
  src += '\n  return __output.trim()'
  return 'function (it, __tplName) {\n  ' + src + '\n}'
}

Template.prototype.generateSource = function () {
  var matches = this.parseTemplateText()
  while (matches.length) this.scanLine(matches.shift())
}

Template.prototype.parseTemplateText = function () {
  var matches = []
  var opening = ''
  var str = this.templateText
  var res = this.regex.exec(str)

  while (res) {
    if (opening) {
      // opening tag is not closed, break parsing and throw error
      if (res[0] !== this.closeTag && res[0] !== '-' + this.closeTag) break
      opening = ''
    } else if (res[0].indexOf(this.openTag) === 0 && res[0].indexOf(this.openTag + this.delimiter) !== 0) {
      opening = res[0]
    }
    if (res.index) matches.push(str.slice(0, res.index))
    matches.push(res[0])
    str = str.slice(res.index + res[0].length)
    res = this.regex.exec(str)
  }

  if (opening) {
    throw new Error('Could not find matching close tag for "' + opening + '".')
  }
  if (str) matches.push(str)
  return matches
}

Template.prototype.scanLine = function (line) {
  switch (line) {
    case this.openTag:
      this.mode = _MODES.EVAL
      break
    case this.openTag + '=':
      this.mode = _MODES.ESCAPED
      break
    case this.openTag + '-':
      this.mode = _MODES.RAW
      break
    case this.openTag + '#':
      this.mode = _MODES.COMMENT
      break
    case this.openTag + this.delimiter:
      this.mode = _MODES.LITERAL
      this.source += ';__output += "' + this.openTag + '";'
      break
    case this.closeTag:
    case '-' + this.closeTag:
      if (this.mode === _MODES.LITERAL) this.addOutput(line)
      this.mode = null
      this.truncate = line[0] === '-'
      break
    default:
      // In string mode, just add the output
      if (!this.mode) return this.addOutput(line)
      // In script mode, depends on type of tag
      switch (this.mode) {
        // Just executing code
        case _MODES.EVAL:
        // Add a line break for JavaScript comments
          this.source += ';' + line.replace(_TRAILING_SEMCOL, '').trim() + '\n'
          break
        // Exec, esc, and output
        case _MODES.ESCAPED:
          // Add the exec'd, escaped result to the output
          this.source += ';__output += ctx.escape(' + line.replace(_TRAILING_SEMCOL, '').trim() + ')'
          break
        // Exec and output
        case _MODES.RAW:
          // Add the exec'd result to the output
          // Using `join` here prevents string-coercion of `undefined` and `null`
          // without filtering out falsey values like zero
          this.source += ';__output += ctx.stringify(' + line.replace(_TRAILING_SEMCOL, '').trim() + ')'
          break
        case _MODES.COMMENT:
          // Do nothing
          break
        // Literal <%% mode, append as raw output
        case _MODES.LITERAL:
          this.addOutput(line)
          break
      }
  }
}

Template.prototype.addOutput = function (line) {
  if (this.truncate) {
    // Only replace single leading linebreak in the line after
    // -%> tag -- this is the single, trailing linebreak
    // after the tag that the truncation mode replaces
    // Handle Win / Unix / old Mac linebreaks -- do the \r\n
    // combo first in the regex-or
    line = line.replace(/^(?:\r\n|\r|\n)/, '')
    this.truncate = false
  } else if (this.rmWhitespace) {
    // Gotta be more careful here.
    // .replace(/^(\s*)\n/, '$1') might be more appropriate here but as
    // rmWhitespace already removes trailing spaces anyway so meh.
    line = line.replace(/^\n/, '')
  }
  if (!line) return

  // Preserve literal slashes
  line = line.replace(/\\/g, '\\\\')

  // Convert linebreaks
  line = line.replace(/\n/g, '\\n')
  line = line.replace(/\r/g, '\\r')

  // Escape double-quotes
  // - this will be the delimiter during execution
  line = line.replace(/"/g, '\\"')
  this.source += ';__output += "' + line + '";'
}

function createRegex (delimiter) {
  var delim = _REGEX_STRING.replace(/%/g, escapeRegExpChars(delimiter))
  return new RegExp(delim)
}

function escapeRegExpChars (string) {
  if (string == null) return ''
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
