var Template = module.exports = function(fn, args) {
  this.source = fn ? fn.toString() : null
  this.fn = this.source ? recoverFn(this.source) : null
  this.args = args || []
}

Template.prototype.$deserialize = function(obj) {
  obj.fn = recoverFn(obj.source)
  return obj
}

recoverFn = function(str) {
  var lines = str.split('\n')
  lines.splice(1, 0, 'var _d = typeof _b === "undefined";'
                   , 'return (function inner(_b, _d) {'
                   , 'Object.keys(inner.caller).forEach(function(key) { inner[key] = inner.caller[key]; });'
                   , 'with(this) {')
  lines.splice(lines.length - 1, 0 
                   , '}'
                   , 'if (!_d) return "";'
                   , 'return _b.join("");'
                   , '}).call(typeof _t !== "undefined" ? _t : this, _d ? [] : _b, _d)')
  var fn
  eval('fn = ' + lines.join('\n'))
  return fn
}

require('./implode').register('Template', Template, ['source', 'args'])