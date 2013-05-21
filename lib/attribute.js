var Fragment = require('./fragment')
	, util = require('util')
	, utils = require('./utils')

var Attribute = module.exports = function(id, template, context) {
	this.id = id
	this.template = template
	this.context = context
  this.silent = false
}

util.inherits(Attribute, Fragment)
require('./implode').register('Attribute', Attribute, Fragment.prototype.$contract.concat([]))

Attribute.prototype.dispose = function() {
	this.emit('delete')
	
	this.removeAllListeners()
	
	delete this.attribute	
	
	// remove from fragments registry
  delete window.app.fragments[this.id]
	
	// remove from queue
	if ((index = Fragment.queue.indexOf(this)) > -1) {
		Fragment.queue.splice(index, 1)
	}
}

Attribute.prototype.refresh = function(force) {
	if (utils.isServer) return
	if (!force && Fragment.queue.indexOf(this) === -1) {
		Fragment.queue.push(this)
		setTimeout(Fragment.refresh)
		return
	}
	utils.debug('[Attribute] #%s refreshing', this.id)
	var that = this
	// delete Contents
	this.deleteContents()
  if (this.attribute.name.toLowerCase() === 'value'
  && this.attribute.ownerElement.tagName.toLowerCase() === 'input')
    this.attribute.ownerElement.value = this.render()
  else
  	this.attribute.nodeValue = this.render()
}

Attribute.prototype.deleteContents = function() {
	// emit delete event to get child fragments to delete themselfs
	this.emit('deleteContents')
	
	this.attribute.nodeValue = ''
}

delete Attribute.prototype.wrap
delete Attribute.prototype.append
delete Attribute.prototype.move
delete Attribute.prototype.insert