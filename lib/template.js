var Template = module.exports = function(fn, args) {
  this.fn = fn ? recoverFn(fn.toString()) : null
  this.args = args || []
}

Template.prototype.$serialize = function() {
  return {
    fn: this.fn.toString(),
    args: this.args
  }
}

Template.prototype.$deserialize = function(obj) {
  obj.fn = recoverFn(obj.fn)
  return obj
}

recoverFn = function(str) {
  var fn
  eval('fn = ' + str)
  return fn
}

require('./implode').register('Template', Template, ['fn', 'args'])