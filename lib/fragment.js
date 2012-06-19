var Arkansas = require('./')
  , Model = require('./model')
  , Collection = require('./collection')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.events = {}
  this.template = template
  this.context = context
  if (this.template)
    this.template.fn.fragment = this
  if (Arkansas.isBrowser)
    this.DOMRange = document.createRange()

  var startNode = null
    , endNode = null
    , that = this
  Object.defineProperty(this, 'startNode', {
    get: function() {
      return startNode
    },
    set: function(node) {
      startNode = node
      that.DOMRange.setStart(node)
    }
  })
  Object.defineProperty(this, 'endNode', {
    get: function() {
      return endNode
    },
    set: function(node) {
      endNode = node
      that.DOMRange.setEnd(node)
    }
  })
}

Fragment.prototype.observe = function(model, propertyName) {
  var fullPath = model._position + '.' + propertyName
  if (this.events[fullPath]) return
  this.events[model._position + '.' + propertyName] = {
    path: model._position,
    property: propertyName
  }
  if (Arkansas.isServer) return
  // TODO: redundant
  if (propertyName)
    model.on('changed:' + propertyName, this.refresh.bind(this))
  else
    model.on('changed', this.refresh.bind(this))
}

Fragment.prototype.render = function() {
  var fn = this.template.fn
  if (Arkansas.isBrowser) fn = fn.bind(null, Handlebars)
  return fn(this.context)
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
  this.startNode.parentNode.removeChild(this.startNode)
  this.endNode.parentNode.removeChild(this.endNode)
}

Fragment.prototype.serialize = function() {
  var that = this
  return { type: 'Fragment', obj: {
    id: this.id,
    template: this.template.id,
    events: Object.keys(this.events).map(function(key) {
      return that.events[key]
    }),
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
    if (event.property)
      model.on('changed:' + event.property, that.refresh.bind(that))
    else
      model.on('changed', that.refresh.bind(that))
  })
  this.context = followPath(obj.context)
  if (this.context._collectionName && Collection.collections[this.context._collectionName]) {
    // is collection
    this.context.on('add', function(model) {
      var fragment = new Fragment(-1, that.template, model)
        , startNode = document.createComment('{') 
        , endNode = document.createComment('}')
      that.endNode.parentNode.insertBefore(startNode, that.endNode)
      that.endNode.parentNode.insertBefore(endNode, that.endNode)
      fragment.startNode = startNode
      fragment.endNode = endNode
      fragment.refresh()
      model.on('destroy', fragment.delete.bind(fragment)) // redundant!
    })
  } else if (this.context._modelName && Model.models[this.context._modelName]) {
    // is model
    this.context.on('destroy', this.delete.bind(this))
  }
}