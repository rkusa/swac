var Arkansas = require('./')
  , Model = require('./model')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.template = template
  this.context = context
  this.children = []
  this.parent = null
}
  
utils.eventify(Fragment)
require('./implode').register('Fragment', Fragment, ['id', 'template', 'context', 'events', 'parent', 'children'])

Fragment.prototype.observe = function(model, property) {
  if (this.silent) return
  var event = 'changed' + (property ? '.' + property : '')
  model.on(event, this, 'refresh')
  this.once('delete', model, 'off', model, event, this)
}

Fragment.prototype.render = function() {
  this.template.fn.fragment = this
  return this.template.fn(this.context)
}

Fragment.queue = []
Fragment.queue.push = function(fragment) {
  Array.prototype.push.call(Fragment.queue, fragment)
}
Fragment.refresh = function() {
  if (Fragment.queue.length === 0) return
  var fragment
  while ((fragment = Fragment.queue.shift()))
    fragment.refresh(true)
}

Fragment.prototype.refresh = function(force) {
  if (utils.isServer) return
  if (!force && Fragment.queue.indexOf(this) === -1) {
    Fragment.queue.push(this)
    setTimeout(Fragment.refresh)
    return
  }
  utils.debug('[Fragment] #%s refreshing', this.id)
  var that = this
  // delete Contents
  this.deleteContents()
  // initialize DOMFragment and an empty DIV 
  var DOMFragment = document.createDocumentFragment()
  // render the fragment
  var rendered = this.render()
    , reg = rendered.match(/^[^<]*<([a-z]+)/i)
    , tmp, child
  switch (reg[1]) {
    case 'tr': tmp = document.createElement('tbody'); break
    case 'td': tmp = document.createElement('tr'); break
    default: tmp = document.createElement('div')
  }
  tmp.innerHTML = rendered
  // to transfer its content to the DOMFragment afterwards
  while ((child = tmp.firstChild)) {
    DOMFragment.appendChild(child)
  }
  // traverse the Fragment to assign the start and end
  // comments to their corresponding fragments
  utils.aquireFragments(DOMFragment, window.app.fragments)
  // insert into the DOM
  this.endNode.parentNode.insertBefore(DOMFragment, this.endNode)
}

Fragment.prototype.remove = function(child) {
  var pos
  if ((pos = this.children.indexOf(child)) > -1) {
    this.children.splice(pos, 1)
  }
}

Fragment.prototype.insert = function(context, index) {
  utils.debug('Insert into fragment #' + this.id + ' at ' + index)

  var fragment = new Fragment(42, this.template, context)
  
  context.once('destroy', fragment, 'delete')
  fragment.once('delete', context, 'off', context, 'destroy', fragment)
    
  context.once('removed', fragment, 'delete')
  fragment.once('delete', context, 'off', context, 'removed', fragment)
  
  fragment.once('delete', this, 'remove', this, fragment)
  
  // context.on('moved', this, 'moveChild', this, fragment)
  // fragment.once('delete', context, 'off', context, 'moved', this)
  
  this.on('delete', fragment, 'dispose')
  fragment.once('delete', this, 'off', this, 'delete', fragment)
  
  this.on('deleteContents', fragment, 'dispose')
  fragment.once('delete', this, 'off', this, 'deleteContents', fragment)
  
  if (index === undefined)
    index = this.children.length
  
  var anchor
  if (utils.isBrowser) {
    if (index === this.children.length)
      anchor = this.endNode
    else
      anchor = this.children[index].startNode
  }
    
  this.children.splice(index, 0, fragment)

  if (!utils.isBrowser || !anchor) return fragment
    
  fragment.startNode = document.createComment('-{')
  fragment.endNode = document.createComment('-}')
  
  anchor.parentNode.insertBefore(fragment.startNode, anchor)
  anchor.parentNode.insertBefore(fragment.endNode, anchor)
  
  fragment.refresh()
  
  return fragment
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
  
  // remove from queue
  if ((index = Fragment.queue.indexOf(this)) > -1) {
    Fragment.queue.splice(index, 1)
  }
}