var Model = require('./model')

var Fragment = module.exports = function(id, template) {
  this.id = id
  this.events = []
  this.template = template
  if (this.template)
    this.template.fn.fragment = this
  if (typeof window !== 'undefined')
    this.DOMRange = document.createRange()
}

Fragment.prototype.observe = function(modelName, propertyName) {
  this.events.push({
    path: modelName,
    property: propertyName
  })
}

Fragment.prototype.render = function(context) {
  return this.template.fn(context)
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

Fragment.prototype.serialize = function() {
  return { type: 'Fragment', obj: {
    id: this.id,
    template: this.template.id,
    events: this.events
  }}
}

Fragment.prototype.deserialize = function(obj) {
  var that = this
  this.id = obj.id
  this.template = window.app.templates[obj.template]
  obj.events.forEach(function(event) {
    var path = event.path.split('.')
      , model = window.app
    path.forEach(function(prop) {
      model = model[prop]
    })
    model.on('changed:' + event.property, that.refresh.bind(that))
  })
}