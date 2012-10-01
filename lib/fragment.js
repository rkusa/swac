var Arkansas = require('./')
  , Model = require('./model')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.template = template
  this.context = context
  this.events = []
  utils.eventify(this)

  return
  
  
  
  
  
  this.events = {}
  this.context = context
  this.parentContext = parentContext
  this.parentFragment = null
  this.silent = false

  if (this.parentContext && typeof this.parentContext.block === 'function') {
    this.context.block = this.parentContext.block.bind(this.parentContext, this.context)
  }

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
new require('./serialization').Contract('Fragment', Fragment, ['id', 'template', 'context', 'events'])

Fragment.prototype.observe = function(model, property) {
  if (this.silent) return
  // search for the model
  var events = null
  for (var i in this.events) {
    if (this.events[i].model === model) {
      events = this.events[i]
      break
    }
  }
  // if not found, add
  if (!events) {
    events = { model: model, properties: [] }
    this.events.push(events)
  }
  // property already being observed?, if so abort
  if (events.properties.indexOf(property) > -1)
    return
  
  // add property
  events.properties.push(property)
  
  if (Arkansas.isServer) return
  return
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

function mergeResult(x) {
  var o = [];
  for(var i=0; x && i<x.length; ++i) {
    var n = x[i];
    if(n === undefined) continue;
    else if(n.html !== undefined) o.push(n.html.call ? n.html() : n.html);
    else if(n.slice && !n.substr) o.push(mergeResult(n));
    else o.push(String(n).replace(/&(?!(\w+|\#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  }
  return o.join('');
}

Fragment.prototype.render = function() {
  this.template.fn.fragment = this
  return mergeResult(this.template.fn(this.context))
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