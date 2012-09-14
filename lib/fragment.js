var Arkansas = require('./')
  , Model = require('./model')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context, parentContext, silent) {
  var that = this
  utils.eventify(this)

  this.id = id
  this.events = {}
  this.context = context
  this.parentContext = parentContext
  this.parentFragment = null
  this.silent = false

  if (this.parentContext && typeof this.parentContext.block === 'function') {
    this.context.block = this.parentContext.block.bind(this.parentContext, this.context)
  }

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
      if (node === startNode) return

      startNode = node
      that.DOMRange.setStart(node)
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

Fragment.prototype.observe = function(model, propertyName) {
  if (this.silent) return
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
    window.app.on('changed.' + model._position, function() {
      console.log('App.' + model._position + ' got changed ... refreshing')
      refresh()
    })
    this.once('detached', window.app.off.bind(window.app, 'changed.' + model._position, refresh))
  }
  if (propertyName) {
    model.on('changed.' + propertyName, function() {
      console.log(model._position + '.' + propertyName + ' got changed ... refreshing')
      refresh()
    })
    this.once('detached', model.off.bind(model, 'changed.' + propertyName, refresh))
  } else {
    model.on('changed', function() {
      console.log(model._position + ' got changed ... refreshing')
      refresh()
    })
    this.once('detached', model.off.bind(model, 'changed', refresh))
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
        
      console.log('[Model] ' + model._position + ' got added ... initializing Fragment#' + fragment.id)
      
      fragment.parent = that.context
      fragment.silent = that.silent
      if (that.endNode.parentNode) {
        that.endNode.parentNode.insertBefore(startNode, that.endNode)
        that.endNode.parentNode.insertBefore(endNode, that.endNode)
      }
      fragment.startNode = startNode
      fragment.endNode = endNode
      fragment.refresh()

      var onDestroy = function() {
        console.log('[Model] ' + model._position + ' got destroyed ... deleting Fragment#' + fragment.id)
        fragment.delete.call(fragment)
      }
      model.once('destroy', onDestroy)

      var onRemoved = function(parent) {
        if (parent == fragment.parent) {
          console.log('[Model] ' + model._position + ' got removed ... deleting Fragment#' + fragment.id)
          fragment.delete()
        }
      }
      model.once('removed', onRemoved)

      fragment.once('detached', function() {
        model.off('destroy', onDestroy)
        model.off('removed', onRemoved)
      })
    }
    this.context.on('added', onAdded)

    var onRemoved = function(model) {
      console.log(model._position + ' got removed ... forwarding event to [Model] ' + model._position)
      model.emit('removed', that.context)
    }
    this.context.on('removed', onRemoved)

    this.once('detached', function() {
      that.context.off('added', onAdded)
      that.context.off('removed', onRemoved)
    })
  } else if (this.context._modelName && Model.models[this.context._modelName]) {
    // is model
    var onDestroy = function() {
      console.log('[Model] ' + this.context._position + ' got deleted ... deleting Fragment#' + that.id)
      that.delete.call(that)
    }
    this.context.once('destroy', onDestroy)

    var onRemoved = function(parent) {
      if (parent == that.parent) {
        console.log('[Model] ' + this.context._position + ' got removed ... deleting Fragment#' + that.id)
        that.delete.call(that)
      }
    }
    this.context.once('removed', onRemoved)
    
    this.once('detached', function() {
      that.context.off('destroy', onDestroy)
      that.context.off('removed', onRemoved)
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
    parentFragment: this.parentFragment ? this.parentFragment.id : null,
    silent: this.silent
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
    //   that.on('deleted', model.off.bind(model, 'changed', refresh))
    // } else {
      properties.forEach(function(property) {
        var event = 'changed'
        if (property !== null) {
          event += '.' + property
        }
        model.on(event, refresh)
        that.once('detached', model.off.bind(model, event, refresh))
      })
    // }
    if (path.indexOf('.') == -1) {
      window.app.on('changed.' + path, refresh)
      that.once('detached', window.app.off.bind(window.app, 'changed:' + path, refresh))
    }
  })
  this.context = window.app.followPath(obj.context)
  this.parentContext = window.app.followPath(obj.parentContext)
  if (obj.parentFragment !== null) {
    this.parentFragment = window.app.fragments[obj.parentFragment]
    this.parentFragment.once('detached', this.detach.bind(this))
  }
  this.parent = window.app.followPath(obj.parent)
  this.silent = obj.silent
  this.bindify()
}