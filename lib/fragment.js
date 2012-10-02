var Arkansas = require('./')
  , Model = require('./model')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.template = template
  this.context = context
  
  var parent
  Object.defineProperty(this, 'parent', {
    get: function() { return parent },
    set: function(value) {
      if (value === parent) return
      parent = value

      if (utils.isBrowser) {
        // #once() instead of #on() would not be enough
        // because if this fragment got deleted directly
        // this listener would remain
        var del = (function() {
          this.delete()
          utils.debug('[Fragment] %s got deleted because its parent %s being deleted',
                        this.id, this.parent.id)
        }).bind(this)
        this.parent.on('delete', del)
        // therefore listen itself for unbinding purposes
        this.once('delete', this.parent.off.bind(null, 'delete', del))
      }
      
      // assume that - as soon as it got set - this
      // value will not change. otherwise it would have
      // to unlisten the old and listen to the new parent
    }
  })

  return
  
  if (Arkansas.isBrowser && context && !silent) this.bindify()
}
  
utils.eventify(Fragment)
new require('./serialization').Contract('Fragment', Fragment, ['id', 'template', 'context', 'events', 'parent'])

Fragment.prototype.observe = function(model, property) {
  if (this.silent) return
  model.on('changed.' + property, this, 'refresh')
}

function mergeResult(x) {
  var o = [];
  for(var i=0; x && i<x.length; ++i) {
    var n = x[i] || '';
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
  console.log('REFRESH')
  return;
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
  this.emit('delete')
  
  // remove DOMNodes between the fragments
  // start and end markers
  var node, next = this.startNode
  while ((node = next) !== this.endNode) {
    next = node.nextSibling
    node.parentNode.removeChild(node)
  }
  this.endNode.parentNode.removeChild(this.endNode)
  
  // delete reference to removed nodes
  delete this.startNode
  delete this.endNode
  
  // remove from fragments registry
  var index
  if ((index = window.app.fragments.indexOf(this)) > -1) {
    window.app.fragments.splice(index, 1)
  }
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