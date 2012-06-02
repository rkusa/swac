var Model = require('./model')
  , app = require('./shared')

var Fragment = module.exports = function(fragment) {
  var that = this
  this.id = fragment.id
  this.template = eval(fragment.template)
  if (typeof this.template == 'function')
    this.template.fragment = this
  if (fragment.events && fragment.events.length > 0) {
    fragment.events.forEach(function(event) {
      app[event.model].on('changed:' + event.property, that.refresh.bind(that))
    })
  }
  this.events = []
  if (typeof window != 'undefined')
    this.DOMRange = document.createRange()
}

Fragment.from = Fragment

Fragment.prototype.observe = function(modelName, propertyName) {
  this.events.push({
    model: modelName,
    property: propertyName
  })
}

Fragment.prototype.render = function(context) {
  return this.template(context)
}

Fragment.prototype.refresh = function() {
  this.DOMRange.deleteContents()
  var DOMFragment = document.createDocumentFragment()
    , tmp = document.createElement('div')
    , child
  tmp.innerHTML = this.render(app)
  while (child = tmp.firstChild) {
    DOMFragment.appendChild(child)
  }
  this.DOMRange.insertNode(DOMFragment)
}

Fragment.prototype.toJson = function() {
  return JSON.stringify({
    id: this.id,
    events: this.events,
    template: '##template##'
  }).replace('"##template##"', this.template.toString())
}