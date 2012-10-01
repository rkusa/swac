var Template = module.exports = function(fn) {
  this.fn = fn
}

Template.prototype.$serialize = function() {
  return {
    fn: this.fn.toString()
  }
}

Template.prototype.$deserialize = function(obj) {
  var fn
  eval('fn = ' + obj.fn)
  return {
    fn: fn
  }
}

new require('./serialization').Contract('Template', Template, ['fn'])