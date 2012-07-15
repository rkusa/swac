var Arkansas = require('./')
  , Model = require('./model')
  , events = require('events')
  , util = require('util')

var Fragment = module.exports = function(id, template, context, parentContext, silent) {
  var that = this

  this.id = id
  this.events = {}
  this.context = context
  this.parentContext = parentContext

  var _template = null
  Object.defineProperty(this, 'template', {
    get: function() {
      return _template
    },
    set: function(newValue) {
      _template = newValue
      if (_template) {
        that.fn = _template.function
        that.fn.fragment = that
      }
    },
    enumerable: true
  })
  this.template = template

  if (Arkansas.isBrowser)
    this.DOMRange = document.createRange()

  var startNode = null
    , endNode = null
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

  if (Arkansas.isBrowser && context && !silent) this.bindify()
}
util.inherits(Fragment, events.EventEmitter)

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
  return this.fn.call(this.parentContext, this.context)
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
  if (this.startNode.parentNode)
    this.startNode.parentNode.removeChild(this.startNode)
  if (this.endNode.parentNode)
    this.endNode.parentNode.removeChild(this.endNode)
}

Fragment.prototype.reset = function() {
  this.emit('reset')
}

Fragment.prototype.bindify = function() {
  var that = this
  if (Array.isArray(this.context) && typeof this.context.on === 'function') {
    // is collection
    var onAdded = function(model) {
      var fragment = new Fragment(-1, that.template, model, that.parentContext, true)
        , startNode = document.createComment('{') 
        , endNode = document.createComment('}')
      fragment.parent = that.context
      if (that.endNode.parentNode) {
        that.endNode.parentNode.insertBefore(startNode, that.endNode)
        that.endNode.parentNode.insertBefore(endNode, that.endNode)
      }
      fragment.startNode = startNode
      fragment.endNode = endNode
      fragment.refresh()

      var onDestroy = fragment.delete.bind(fragment)
      model.on('destroy', onDestroy)

      var onRemoved = function(parent) {
        if (parent == fragment.parent) fragment.delete()
      }
      model.on('removed', onRemoved)

      that.on('reset', function() {
        model.removeListener('destroy', onDestroy)
        model.removeListener('removed', onRemoved)
      })
    }
    this.context.on('added', onAdded)

    var onRemoved = function(model) {
      model.emit('removed', that.context)
    }
    this.context.on('removed', onRemoved)

    this.on('reset', function() {
      that.context.removeListener('added', onAdded)
      that.context.removeListener('removed', onRemoved)
    })
  } else if (this.context._modelName && Model.models[this.context._modelName]) {
    // is model
    var onDestroy = this.delete.bind(this)
    this.context.on('destroy', onDestroy)

    var onRemoved = function(parent) {
      if (parent == that.parent) that.delete()
    }
    this.context.on('removed', onRemoved)
    
    this.on('reset', function() {
      that.context.removeListener('destroy', onDestroy)
      that.context.removeListener('removed', onRemoved)
    })
  }
}

Fragment.prototype.serialize = function() {
  var that = this
  return { type: 'Fragment', obj: {
    id: this.id,
    template: this.template.id,
    events: Object.keys(this.events).map(function(key) {
      return that.events[key]
    }),
    parent: this.parent ? this.parent._position : null,
    context: this.context._position || '',
    parentContext: typeof this.parentContext !== 'undefined' ? (this.parentContext._position || '') : '',
  }}
}

Fragment.prototype.deserialize = function(obj) {
  var that = this
  this.id = obj.id
  this.template = window.app.templates[obj.template]
  obj.events.forEach(function(event) {
    var model = window.app.followPath(event.path)
    if (event.property)
      model.on('changed:' + event.property, that.refresh.bind(that))
    else
      model.on('changed', that.refresh.bind(that))
    model.on('changed:all', that.refresh.bind(that))
  })
  this.context = window.app.followPath(obj.context)
  this.parentContext = window.app.followPath(obj.parentContext)
  this.parent = window.app.followPath(obj.parent)
  this.bindify()
}