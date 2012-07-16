var Arkansas = require('./')
  , Model = require('./model')
  , events = require('events')
  , util = require('util')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context, parentContext, silent) {
  var that = this

  this.setMaxListeners(64)

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
    , detach = this.detach.bind(this)
  Object.defineProperty(this, 'startNode', {
    get: function() {
      return startNode
    },
    set: function(node) {
      if (node === startNode) return
      if (startNode)
        startNode.removeEventListener('DOMNodeRemoved', detach)

      startNode = node
      that.DOMRange.setStart(node)

      startNode.addEventListener('DOMNodeRemoved', detach)
    }
  })
  Object.defineProperty(this, 'endNode', {
    get: function() {
      return endNode
    },
    set: function(node) {
      if (node === endNode) return
      endNode = node
      that.DOMRange.setEnd(node)
    }
  })

  if (Arkansas.isBrowser && context && !silent) this.bindify()
}
util.inherits(Fragment, events.EventEmitter)

Fragment.prototype.observe = function(model, propertyName) {
  var fullPath = model._position
  if (propertyName) fullPath += '.' + propertyName
  if (this.events[fullPath]) return

  this.events[fullPath] = {
    path: model._position,
    property: propertyName
  }
  if (Arkansas.isServer) return
  // TODO: redundant
  var refresh = this.refresh.bind(this)
  if (model._position.indexOf('.') == -1) {
    window.app.on('changed:' + model._position, refresh)
    this.on('deleted', window.app.removeListener.bind(window.app, 'changed:' + model._position, refresh))
  }
  if (propertyName) {
    model.on('changed:' + propertyName, refresh)
    this.on('deleted', model.removeListener.bind(model, 'changed:' + propertyName, refresh))
  } else {
    model.on('changed', this.refresh.bind(this))
    this.on('deleted', model.removeListener.bind(model, 'changed', refresh))
  }
}

Fragment.prototype.render = function() {
  return this.fn.call(this.parentContext, this.context)
}

Fragment.prototype.refresh = function() {
  this.DOMRange.deleteContents()
  var DOMFragment = document.createDocumentFragment()
    , tmp = document.createElement('div')
    , child
    , that = this
  tmp.innerHTML = this.render()
  while (child = tmp.firstChild) {
    DOMFragment.appendChild(child)
  }
  this.DOMRange.insertNode(DOMFragment) 
  utils.aquireFragments(this.DOMRange.commonAncestorContainer, window.app.fragments, function(node) {
    return that.DOMRange.isPointInRange(node, 0)
  })
}

Fragment.prototype.delete = function() {
  this.detach()
  this.DOMRange.deleteContents()
  if (this.startNode.parentNode)
    this.startNode.parentNode.removeChild(this.startNode)
  if (this.endNode.parentNode)
    this.endNode.parentNode.removeChild(this.endNode)
  this.emit('deleted')
}

Fragment.prototype.detach = function() {
  this.emit('detached')
  this.startNode.removeEventListener('DOMNodeRemoved', arguments.callee)
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

      fragment.on('detached', function() {
        model.removeListener('destroy', onDestroy)
        model.removeListener('removed', onRemoved)
      })
    }
    this.context.on('added', onAdded)

    var onRemoved = function(model) {
      model.emit('removed', that.context)
    }
    this.context.on('removed', onRemoved)

    this.on('detached', function() {
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
    
    this.on('detached', function() {
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
  var events = {}
  obj.events.forEach(function(event) {
    if (!event.property) event.property = null
    if (!events[event.path]) events[event.path] = []
    events[event.path].push(event.property)
  })
  Object.keys(events).forEach(function(path) {
    var properties = events[path]
      , model = window.app.followPath(path)
      , refresh = that.refresh.bind(that)
    // buggy
    // if (properties.length > 5 || properties.indexOf(null) > -1) {
    // refresh.source = 'Fragment.prototype.deserialize ' + path
    //   model.on('changed', refresh)
    //   that.on('deleted', model.removeListener.bind(model, 'changed', refresh))
    // } else {
      properties.forEach(function(property) {
        var event = 'changed'
        if (property !== null) {
          event += ':' + property
        }
        model.on(event, refresh)
        that.on('deleted', model.removeListener.bind(model, event, refresh))
      })
    // }
    if (path.indexOf('.') == -1) {
      window.app.on('changed:' + path, refresh)
      that.on('deleted', window.app.removeListener.bind(window.app, 'changed:' + path, refresh))
    }
  })
  this.context = window.app.followPath(obj.context)
  this.parentContext = window.app.followPath(obj.parentContext)
  this.parent = window.app.followPath(obj.parent)
  this.bindify()
}