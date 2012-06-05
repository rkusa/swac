var Model = require('./model')
  , Collection = require('./collection')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.events = []
  this.template = template
  this.context = context
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

Fragment.prototype.render = function() {
  return this.template.fn(this.context)
}

Fragment.prototype.refresh = function() {
  this.DOMRange.deleteContents()
  var DOMFragment = document.createDocumentFragment()
    , tmp = document.createElement('div')
    , child
  tmp.innerHTML = this.render()
  while (child = tmp.firstChild) {
    DOMFragment.appendChild(child)
  }
  this.DOMRange.insertNode(DOMFragment)
}

Fragment.prototype.delete = function() {
  this.DOMRange.deleteContents()
}

Fragment.prototype.serialize = function() {
  return { type: 'Fragment', obj: {
    id: this.id,
    template: this.template.id,
    events: this.events,
    context: this.context._position || ''
  }}
}

function followPath (path) {
  if (!path) return window.app
  var path = path.split('.')
    , obj = window.app
  path.forEach(function(prop) {
    obj = obj[prop]
  })
  return obj
}

Fragment.prototype.deserialize = function(obj) {
  var that = this
  this.id = obj.id
  this.template = window.app.templates[obj.template]
  this.template.fn.fragment = this
  obj.events.forEach(function(event) {
    var model = followPath(event.path)
    model.on('changed:' + event.property, that.refresh.bind(that))
  })
  this.context = followPath(obj.context)
  if (this.context instanceof Collection) {
    // is collection
    this.context.on('add', function(model) {
      var fragment = new Fragment(-1, that.template, model)
      fragment.DOMRange.setStart(that.DOMRange.endContainer, that.DOMRange.endOffset - 1)
      fragment.DOMRange.setEnd(that.DOMRange.endContainer, that.DOMRange.endOffset - 1)
      fragment.refresh()
      model.on('destroy', fragment.delete.bind(fragment)) // redundant!
    })
  } else if (this.context._modelName && Model.models[this.context._modelName]) {
    // is model
    this.context.on('destroy', this.delete.bind(this))
  }
}