var Fragment = require('./fragment')
  , Attribute = require('./attribute')
  , Template = require('./template')
	, utils = require('./utils')

var Element = module.exports = function(/*tag, attrs, id, template, context[, args...]*/) {
  var args = Array.prototype.slice.call(arguments)
  this.tag = args.shift()
  var attrs = args.shift()
  this.id = args.shift()
  this.template = args.shift()
  this.context = args.shift()
  this.args = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
  this.children = []
  this._element = null
  this.attrs = {}
  this.silent = false

  for(var key in attrs) {
    if (key.toLowerCase() === 'id') continue
    var val = attrs[key]
    if (typeof val === 'function') {
      var template = new Template(val, this.template.argNames)
      val = new Attribute(utils.requestContext.nextFragmentId++, template, this.context)
      utils.requestContext.fragments[val.id] = val
    }
    this.attrs[key] = val
  }
}

utils.inherits(Element, Fragment)
require('implode').register('Element', Element, Fragment.prototype.$contract.concat(['tag']))

Object.defineProperties(Element.prototype, {
  element: {
    get: function() {
      if (!this._element) {
        this._element = document.getElementById('fragment' + this.id.toString())
      }
      return this._element
    }
  },
  startNode: {
    get: function() {
      return this.element
    }
  },
  endNode: {
    get: function() {
      return this.element
    }
  },
  class: {
    get: function() {
      var className = this.attrs.class
      if (className === undefined) return ''
      if (typeof className === 'function') return className.apply(this.context, (this.args || []))
      return className
    }
  }
})

Element.prototype.refresh = function(force) {
	if (utils.isServer) return
  if (force !== true) {
    if (Fragment.queue.indexOf(this) === -1) {
      Fragment.queue.push(this)
      setTimeout(Fragment.refresh)
    }
    return
  }
	utils.debug('[Element] #%s refreshing', this.id)
	var that = this
	// delete Contents
	this.deleteContents()
	this.element.innerHTML = this.render()

  // traverse the Fragment to assign the start and end
  // comments to their corresponding fragments
  utils.aquireFragments(this.element, window.app.fragments)
}

Element.prototype.wrap = function(content) {
  var ret = ''
  ret += '<' + this.tag + ' id="fragment' + this.id + '"'
  for (var attr in this.attrs) {
    val = this.attrs[attr]
    val.args = this.args
    if (val instanceof Attribute) {
      ret += 'data-bind-' + attr + '="' + val.id + '" '
      ret += attr + '="' + val.render() + '"'
    } else {
      ret += ' ' + attr + '="' + val +'"'
    }
  }
  ret += '>'
  ret += content
  ret += '</' + this.tag + '>'
  return ret
}

Element.prototype.insertBefore = function(anchor) {
  this._element = document.createElement(this.tag)
  this._element.id = 'fragment' + this.id
  for (var attr in this.attrs) {
    val = this.attrs[attr]
    val.args = this.args
    if (val instanceof Attribute) {
      this._element.setAttribute('data-bind-' + attr, val.id)
      this._element.setAttribute(attr, val.render())
      val.attribute = this._element.attributes[attr]
    } else {
      this._element.setAttribute(attr, val)
    }
  }

  anchor.parentNode.insertBefore(this._element, anchor)

  this.refresh()
}

Element.prototype.moveBetween = function(before, after) {
  before.parentNode.insertBefore(this.element, before)
}

Element.prototype.deleteContents = function() {
	// emit delete event to get child fragments to delete themselfs
	this.emit('deleteContents')

	this.element.innerHTML = ''
}

Element.prototype.dispose = function() {
	this.emit('delete')

	this.removeAllListeners()

  this.element.parentNode.removeChild(this.element)
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