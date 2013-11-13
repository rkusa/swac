var utils = require('./utils')
  , proxy = require('node-eventproxy')

var Fragment = module.exports = function(/*id, template, context[, args...]*/) {
  var args = Array.prototype.slice.call(arguments)
  this.id = args.shift()
  this.template = args.shift()
  this.context = args.shift()
  this.args = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
  this.children = []
  this.parent = null
  this.factory = null
  this.silent = false
}
  
utils.eventify(Fragment)
require('implode').register('Fragment', Fragment, ['id', 'template', 'context', '_events', 'parent', 'children', 'args', 'silent', 'factory'])

Fragment.prototype.observe = function(model, property) {
  if (this.silent) return

  var eventName = 'changed' + (property ? '.' + property : '')

  utils.observe(eventName).until('removed', this)
       .call(this, 'refresh')
       .on(model)
  
  utils.observe('replaced').until('delete', this)
       .call(this, 'refresh')
       .on(model)
}

Fragment.prototype.observeError = function(model, property) {
  if (this.silent) return

  utils.observe('errors.changed' + (property ? '.' + property : '')).until('delete', this)
       .call(this, 'refresh')
       .on(model)
  
  utils.observe('replaced').until('delete', this)
       .call(this, 'refresh')
       .on(model)
}

Fragment.prototype.observeWarning = function(model, property) {
  if (this.silent) return

  utils.observe('warnings.changed' + (property ? '.' + property : '')).until('delete', this)
       .call(this, 'refresh')
       .on(model)
  
  utils.observe('replaced').until('delete', this)
       .call(this, 'refresh')
       .on(model)
}

Fragment.prototype.render = function() {
  this.template.fn.fragment = this
  return this.template.fn.apply(this.context, (this.args || []).concat(this.template.args))
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
  if (force !== true) {
    if (Fragment.queue.indexOf(this) === -1) {
      Fragment.queue.push(this)
      setTimeout(Fragment.refresh)
    }
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
  if (rendered === null || rendered === 'undefined') return
  if (rendered === undefined) rendered = ''
  // determine appropriated container
  var reg = rendered.toString().match(/^[^<]*<([a-z]+)/i)
    , tmp, child
  if (!reg) tmp = document.createElement('div')
  else switch (reg[1]) {
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

Fragment.prototype.wrap = function(content) {
  var ret = ''
  ret  = '<!---{' + this.id + '-->'
  ret += content
  ret += '<!---' + this.id + '}-->'
  return ret
}

Fragment.prototype.remove = function(child) {
  var pos
  if ((pos = this.children.indexOf(child)) > -1) {
    this.children.splice(pos, 1)
  }
}

Fragment.prototype.insert = function(context, index) {
  utils.debug('Insert into fragment #' + this.id + ' at ' + index)
  
  var fragment = this.factory
    ? this.factory.new(42, this.template, this.context, context)
    : new Fragment(42, this.template, this.context, context)
  
  // Todo: Dirty! Change!
  if (utils.isClient) {
    fragment.id = window.app.nextFragmentId++
    window.app.fragments[fragment.id] = fragment
  }
  
  fragment.silent = this.silent

  utils.observe('destroy').until('delete', fragment)
       .call(fragment, 'delete')
       .once(context)

  utils.observe('removed').until('delete', fragment)
       .call(fragment, 'delete')
       .once(context)

  utils.observe('moved').until('delete', fragment)
       .call(this, 'move').withArgs(fragment)
       .on(context)
  
  fragment.once('delete', proxy(this, 'remove', this, fragment))
  
  utils.observe('delete').until('delete', fragment)
       .call(fragment, 'dispose')
       .on(this)

  utils.observe('deleteContents').until('delete', fragment)
       .call(fragment, 'dispose')
       .on(this)
  
  if (index === undefined)
    index = this.children.length
  
  var anchor
  if (utils.isClient) {
    if (index >= this.children.length)
      anchor = this.endNode
    else
      anchor = this.children[index].startNode
  }
    
  this.children.splice(index, 0, fragment)

  if (!utils.isClient || !anchor) return fragment
  
  fragment.insertBefore(anchor)
  
  this.emit('inserted', context, index, fragment)
  
  return fragment
}

Fragment.prototype.insertBefore = function(anchor) {
  this.startNode = document.createComment('-{')
  this.endNode = document.createComment('-}')
  
  anchor.parentNode.insertBefore(this.startNode, anchor)
  anchor.parentNode.insertBefore(this.endNode, anchor)
  
  this.refresh()
}

Fragment.prototype.moveBetween = function(before, after) {
  var node, next = this.startNode.nextSibling
  while ((node = next) !== this.endNode) {
    next = node.nextSibling
    before.parentNode.insertBefore(node, before)
  }
  after.nextSibling.parentNode.insertBefore(this.startNode, after.nextSibling)
  before.parentNode.insertBefore(this.endNode, before)
}

Fragment.prototype.move = function(child, index) {
  if (!utils.isClient) return
  
  this.remove(child)
  
  var after = index === 0 ? this.startNode : this.children[index - 1].endNode
    , before = index >= this.children.length ? this.endNode : this.children[index].startNode

  this.children.splice(index, 0, child)
  
  child.moveBetween(before, after)
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
  // already deleted
  if (!(this.id in window.app.fragments)) return

  // delete
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
  delete window.app.fragments[this.id]
  
  // remove from queue
  if ((index = Fragment.queue.indexOf(this)) > -1) {
    Fragment.queue.splice(index, 1)
  }
}