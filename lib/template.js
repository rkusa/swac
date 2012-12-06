var Template = module.exports = function(fn, args) {
  this.fn = fn
  this.args = args || []
}

Template.prototype.$serialize = function() {
  return {
    fn: this.fn.toString(),
    args: this.args
  }
}

Template.prototype.$deserialize = function(obj) {
  var fn
  eval('fn = ' + obj.fn)
  obj.fn = fn
  return obj
}

require('./implode').register('Template', Template, ['fn', 'args'])