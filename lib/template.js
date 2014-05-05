var Template = module.exports = function(fn) {
  this.fn = fn
}

var implode = require('implode')
implode.register('swac/Template', Template, ['fn'])

Template.prototype.$serialize = function() {
  return {
    fn: this.fn.program
  }
}

Template.prototype.$deserialize = function(template) {
  setTimeout(function() {
    template.fn = swac.state.templates[swac.state.currentView].child(template.fn)
  })
  return template
}