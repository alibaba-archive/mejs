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

const _REGEX_STRING = '(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)'
const _TRAILING_SEMCOL = /;\s*$/
const _INCLUDE = /\binclude\(/
const _DEFAULT_DELIMITER = '%'
const _MODES = {
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
  this.regex = createReg(this.delimiter)
  this.templateText = text
  this.truncate = false
  this.currentLine = 1
  this.source = ''
  this.mode = null
}

Template.prototype.compile = function () {
  this.generateSource()
  let src = 'var ctx = this, __output = [], __append = __output.push.bind(__output);\n  '
  if (_INCLUDE.test(this.source)) {
    src += 'var include = function (tplName, data) { '
    src += 'return ctx.render(ctx.resolve(__tplName, tplName), ctx.copy(data, it)) }\n  '
  }
  src += this.source
  src += '\n  return __output.join("")'
  return 'function (it, __tplName) {\n  ' + src + '\n}'
}

Template.prototype.generateSource = function () {
  let matches = this.parseTemplateText()
  while (matches.length) this.scanLine(matches.shift())
}

Template.prototype.parseTemplateText = function () {
  let str = this.templateText
  if (this.rmWhitespace) {
    // Have to use two separate replace here as `^` and `$` operators don't
    // work well with `\r`.
    str = str.replace(/\r/g, '').replace(/^\s+|\s+$/gm, '')
  }
  // str.replace(/[ \t]*<%_/gm, '<%_').replace(/_%>[ \t]*/gm, '_%>')
  let openClearTag = this.openTag + '_'
  let closeClearTag = '_' + this.closeTag
  str = str
    .replace(new RegExp('[ \t]*' + escapeRegChars(openClearTag), 'gm'), openClearTag)
    .replace(new RegExp(escapeRegChars(closeClearTag) + '[ \t]*', 'gm'), closeClearTag)

  let matches = []
  let opening = ''
  let res = this.regex.exec(str)
  let closeTags = [this.closeTag, '-' + this.closeTag, '_' + this.closeTag]
  let openLiteralTag = this.openTag + this.delimiter

  while (res) {
    if (opening) {
      // opening tag is not closed, break parsing and throw error
      if (closeTags.indexOf(res[0]) === -1) break
      opening = ''
    } else if (res[0].indexOf(this.openTag) === 0 && res[0] !== openLiteralTag) {
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
    case this.openTag + '_':
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
      this.source += ';__append("' + this.openTag + '");'
      break
    case this.delimiter + this.closeTag:
      this.mode = _MODES.LITERAL
      this.source += ';__append("' + this.closeTag + '");'
      break
    case this.closeTag:
    case '-' + this.closeTag:
    case '_' + this.closeTag:
      if (this.mode === _MODES.LITERAL) this.addOutput(line)
      this.mode = null
      this.truncate = line[0] === '-' || line[0] === '_'
      break
    default:
      // In string mode, just add the output
      if (!this.mode) return this.addOutput(line)
      // If '//' is found without a line break, add a line break.
      switch (this.mode) {
        case _MODES.EVAL:
        case _MODES.ESCAPED:
        case _MODES.RAW:
          if (line.lastIndexOf('//') > line.lastIndexOf('\n')) line += '\n'
      }
      // In script mode, depends on type of tag
      switch (this.mode) {
        // Just executing code
        case _MODES.EVAL:
        // Add a line break for JavaScript comments
          this.source += ';' + line + '\n'
          break
        // Exec, esc, and output
        case _MODES.ESCAPED:
          // Add the exec'd, escaped result to the output
          this.source +=
            ';__append(ctx.escape(' + line.replace(_TRAILING_SEMCOL, '').trim() + '))'
          break
        // Exec and output
        case _MODES.RAW:
          // Add the exec'd result to the output
          // Using `join` here prevents string-coercion of `undefined` and `null`
          // without filtering out falsey values like zero
          this.source +=
            ';__append(ctx.stringify(' + line.replace(_TRAILING_SEMCOL, '').trim() + '))'
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
  this.source += ';__append("' + line + '")\n'
}

function createReg (delimiter) {
  let delim = _REGEX_STRING.replace(/%/g, escapeRegChars(delimiter))
  return new RegExp(delim)
}

function escapeRegChars (string) {
  if (string == null) return ''
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
