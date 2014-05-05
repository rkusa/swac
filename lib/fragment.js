var utils = require('./utils')

var Fragment = module.exports = function(template, locals) {
  this.template = template

  if (locals) {
    this.id = locals.$proxy.state.uuid()
    initialize(this, locals)
    locals.$proxy.state.fragments[this.id] = this
  }
}

var implode = require('implode')
implode.register('swac/Fragment', Fragment, ['id', 'template', 'locals'])

function initialize(fragment, locals) {
  var proxy = locals.$proxy.clone()
  proxy.state = fragment.state = locals.$proxy.state
  proxy.on('get', function(path) {
    fragment.observe(path)
  })
  fragment.locals = proxy.viewModel
}

Fragment.prototype.observe = function(path) {
  if (path[path.length - 1][0] === '$') return

  this.state.observer.add(this, path)
}

Fragment.prototype.render = function(wrap) {
  var ret = ''
  if (wrap === true) ret += '<!---{' + this.id + '-->'
  ret += this.template.fn(this.locals)
  if (wrap === true) ret += '<!---' + this.id + '}-->'
  return ret
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

Fragment.prototype.deleteContents = function() {
  // emit delete event to get child fragments to delete themselfs
  // this.emit('deleteContents')

  // remove DOMNodes between the fragments
  // start and end markers
  var node, next = this.startNode.nextSibling
  while ((node = next) !== this.endNode) {
    next = node.nextSibling
    node.parentNode.removeChild(node)
  }
}

Fragment.prototype.$deserialize = function() {
  initialize(this, this.locals)
}