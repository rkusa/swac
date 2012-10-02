var Arkansas = require('./')
  , Model = require('./model')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.template = template
  this.context = context

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

var queue = []
function refresh() {
  if (queue.length === 0) return
  var fragment
  while ((fragment = queue.shift()))
    fragment.refresh(true)
}

Fragment.prototype.refresh = function(force) {
  if (utils.isServer) return
  if (!force && queue.indexOf(this) === -1) {
    queue.push(this)
    setTimeout(refresh)
    return
  }
  utils.debug('[Fragment] #%s refreshing', this.id)
  var that = this
  // delete Contents
  this.deleteContents()
  // initialize DOMFragment and an empty DIV 
  var DOMFragment = document.createDocumentFragment()
    , tmp = document.createElement('div')
    , child
  // render the fragment into the DIV
  tmp.innerHTML = this.render()
  // to transfer its content to the DOMFragment afterwards
  while (child = tmp.firstChild) {
    DOMFragment.appendChild(child)
  }
  // traverse the Fragment to assign the start and end
  // comments to their corresponding fragments
  utils.aquireFragments(DOMFragment, window.app.fragments)
  // insert into the DOM
  this.endNode.parentNode.insertBefore(DOMFragment, this.endNode)
}

Fragment.prototype.deleteContents = function() {
  // emit delete event to get child fragments to delete themselfs
  this.emit('delete')
  
  // remove DOMNodes between the fragments
  // start and end markers
  var node, next = this.startNode.nextSibling
  while ((node = next) !== this.endNode) {
    next = node.nextSibling
    node.parentNode.removeChild(node)
  }
}

Fragment.prototype.delete = function() {
  this.emit('delete')
  
  // remove start and end markers
  this.startNode.parentNode.removeChild(this.startNode)
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