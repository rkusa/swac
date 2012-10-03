var Arkansas = require('./')
  , Model = require('./model')
  , utils = require('./utils')

var Fragment = module.exports = function(id, template, context) {
  this.id = id
  this.template = template
  this.context = context
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
  this.deleteContents()
  this.dispose()
}

Fragment.prototype.dispose = function() {
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