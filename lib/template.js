var Template = module.exports = function(fn, argNames) {
  this.argNames = argNames || []
  this.source = fn ? fn.toString() : null
  this.fn = this.source ? recoverFn(this.source, this.argNames) : null
}

Template.prototype.$deserialize = function(obj) {
  obj.fn = recoverFn(obj.source, obj.argNames)
  return obj
}

function recoverFn(str, argNames) {
  var lines = str.split('\n')
  lines.splice(0, 1, 'var _d = typeof _b === "undefined";'
                   , 'return (function inner(_b, _d) {'
                   , 'var _e = function(v) { return v.replace(/&/g, \'&amp;\').replace(/"/g, \'&quot;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\') };'
                   , 'inner.fragment = inner.caller.fragment;'
                   , 'with(this) {')
  lines.splice(lines.length - 1, 1
                   , '}'
                   , 'if (!_d) return "";'
                   , 'return _b.join("");'
                   , '}).call(typeof _t !== "undefined" ? _t : this, _d ? [] : _b, _d)')
  function F(fn) {
    return Function.apply(this, argNames.concat(fn))
  }
  F.prototype = Function.prototype
  var fn = new F(lines.join('\n'))
  // console.log(fn.toString())
  return fn
}

require('implode').register('Template', Template, ['source', 'argNames'])