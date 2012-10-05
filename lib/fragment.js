var Arkansas = require('./')
  , Model = require('./model')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.template = template
  this.context = context
}
  
utils.eventify(Fragment)
require('./implode').register('Fragment', Fragment, ['id', 'template', 'context', 'events', 'parent'])

Fragment.prototype.observe = function(model, property) {
  if (this.silent) return
  var event = 'changed' + (property ? '.' + property : '')
  model.on(event, this, 'refresh')
  this.once('delete', model, 'off', model, event, this)
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

Fragment.prototype.append = function(context) {
  if (!utils.isBrowser) return
  var fragment = new Fragment(42, this.template, context)
  fragment.startNode = document.createComment('-{')
  fragment.endNode = document.createComment('-}')
  this.endNode.parentNode.insertBefore(fragment.startNode, this.endNode)
  this.endNode.parentNode.insertBefore(fragment.endNode, this.endNode)
  fragment.refresh()
    
  context.once('destroy', fragment, 'delete')
  fragment.once('delete', context, 'off', context, 'destroy', fragment)
    
  context.once('removed', fragment, 'delete')
  fragment.once('delete', context, 'off', context, 'removed', fragment)
}

Fragment.prototype.deleteContents = function() {
  // emit delete event to get child fragments to delete themselfs
  this.emit('deleteContents')
  
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
  this.deleteContents()
  this.dispose()
}

Fragment.prototype.dispose = function() {
  this.emit('delete')
  
  this.removeAllListeners()
  
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