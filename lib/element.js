var Fragment = require('./fragment')
	, util = require('util')
	, utils = require('./utils')

var Element = module.exports = function(/*tag, id, template, context[, args...]*/) {
  var args = Array.prototype.slice.call(arguments)
  this.tag = args.shift()
  this.id = args.shift()
  this.template = args.shift()
  this.context = args.shift()
  this.args = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
  this.children = []
  this._element = null
}

util.inherits(Element, Fragment)
require('./implode').register('Element', Element, Fragment.prototype.$contract.concat(['tag']))

Object.defineProperty(Element.prototype, 'element', {
  get: function() {
    if (!this._element) {
      this._element = document.getElementById(this.id.toString())
    }
    return this._element
  }
})

Element.prototype.refresh = function(force) {
	if (utils.isServer) return
	if (!force && Fragment.queue.indexOf(this) === -1) {
		Fragment.queue.push(this)
		setTimeout(Fragment.refresh)
		return
	}
	utils.debug('[Element] #%s refreshing', this.id)
	var that = this
	// delete Contents
	this.deleteContents()
	this.element.innerHTML = this.render()
}

Element.prototype.wrap = function(content) {
  var ret = ''
  ret += '<' + this.tag + ' id="' + this.id + '">'
  ret += content
  ret += '</' + this.tag + '>'
  return ret
}

Element.prototype.deleteContents = function() {
	// emit delete event to get child fragments to delete themselfs
	this.emit('deleteContents')
	
	this.element.innerHTML = ''
}

Element.prototype.dispose = function() {
	this.emit('delete')
	
	this.removeAllListeners()
	
	delete this.element	
	
	// remove from fragments registry
  delete window.app.fragments[this.id]
	
	// remove from queue
	if ((index = Fragment.queue.indexOf(this)) > -1) {
		Fragment.queue.splice(index, 1)
	}
}

delete Element.prototype.append
delete Element.prototype.move
delete Element.prototype.insert