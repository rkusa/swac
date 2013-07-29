var utils     = require('./utils')
  , implode   = require('implode')
  , Template  = require('./template')
  , Fragment  = require('./fragment')
  , Attribute = require('./attribute')
  , Element   = require('./element')

var State = module.exports = function() {
  this.fragments = {}
  this.sections = {}
  this.views = {}
  this.original = this
  this.currentView = null
  this.nextFragmentId = 0
  
  // per instance contract
  var contract = Array.apply(Array, this.$contract)
  contract.id = this.$contract.id
  Object.defineProperty(this, '$contract', { value: contract })
}

utils.eventify(State)
implode.register('swac/State', State, ['fragments', 'sections', 'views', 'path', 'events', 'nextFragmentId'])

State.prototype.HTML =
State.prototype.html =
State.prototype.formFor = require('./helper/form')

State.prototype.register = function(name, obj) {
  if (name in this) {
    if (Array.isArray(this[name]) && typeof this[name].reset === 'function')
      this[name].reset(obj)
    else {
      this[name] = obj
      this.emit('changed.' + name)
    }
    return
  }
  var that = this
    , value = null
  Object.defineProperty(this, name, {
    get: function get() {
      if (typeof get.caller.fragment != 'undefined')
        get.caller.fragment.observe(this, name)
      return value
    },
    set: function set(newValue) {
      if (value === newValue) return
      var old = value
      value = newValue
      if (set.caller === State.prototype.register) return
      if (old && typeof old.emit === 'function')
        old.emit('replaced')
      this.emit('changed.' + name)
    },
    enumerable: true
  })
  this[name] = obj
  this.$contract.push(name)
}

State.prototype.section = function section(name, opts) {
  var fragment = this.sections[name]
  if (!fragment && opts && opts.optional === true) {
    this.registerSection(name, 'function() {\n}')
    fragment = this.sections[name]
  } else if (!fragment) {
    throw new Error('Section ' + name + ' not defined')
  }
  
  var parent = section.caller.fragment
  if (parent) {
    parent.on('delete', fragment, 'dispose')
    fragment.once('delete', parent, 'off', parent, 'delete', fragment)
    parent.on('deleteContents', fragment, 'dispose')
    fragment.once('delete', parent, 'off', parent, 'deleteContents', fragment)
  }
  
  return fragment.wrap(fragment.render())
}

State.prototype.registerSection = function area(name, fn) {
  var template = new Template(fn)
  var fragment = createFragment(this.original, template, this.original)
  fragment.silent = true
  this.sections[name] = fragment
  
  if (!(this.currentView in this.views)) this.views[this.currentView] = {}
  this.views[this.currentView][name] = template
}

State.prototype.registerHelper = function(name, fn) {
  this.register(name, fn)
}

State.prototype.attr = function attr(/*attrName, [args.. ,] fn*/) {
  var args = Array.prototype.slice.call(arguments)
    , fn = args.pop()
    , attrName = args.shift()
    , template = new Template(fn, args)
    , attribute = createFragment(this.original, template, this.original, attr.caller.fragment, Attribute)
  
  var ret = 'data-bind-' + attrName + '="' + attribute.id + '" '
  ret += attrName + '="' + attribute.render() + '"'
  return ret
}
  
State.prototype.block = function block(/* [args.. ,] fn[, opts] */) {
  var args = Array.prototype.slice.call(arguments)
    , opts = args.pop()
    , fn = typeof opts === 'function' ? opts : args.pop()
    , template = new Template(fn, args)
    , fragment = createFragment(this.original, template, this.original, block.caller.fragment)
  if (typeof opts !== 'object') opts = {}
  if (opts.silent === true) fragment.silent = true
  return fragment.wrap(fragment.render())
}

State.prototype.collection = function collection(/* [tag, ]context[, args], fn[, opts] */) {
  var that = this
    , args = Array.prototype.slice.call(arguments)
    , opts = args.pop()
    , fn = typeof opts === 'function' ? opts : args.pop()
    , tag = args.shift()
    , context = Array.isArray(tag) ? tag : args.shift()
    , ret = ''
  if (typeof opts !== 'object') opts = {}
  if (tag === context) tag = undefined
  
  var template = new Template(fn, args)
    , list = createFragment(this.original, template, this.original, collection.caller.fragment)
  list.args = context
  if (tag) {
    if (typeof tag !== 'object') tag = { tag: tag }
    var attrs = {}
    for (var name in tag) {
      if (name === 'tag' || name === 'id') continue
      attrs[name] = tag[name]
    }
    list.factory = new utils.Factory(Element, tag.tag, attrs)
  }
  if (opts.silent) list.silent = true

  context.on('added', list, 'insert')
  list.once('delete', context, 'off', context, 'added', list)

  ret += '<!---{' + list.id + '-->'
  context.forEach(function(item) {
    var fragment = list.insert(item)
    fragment.id = that.original.nextFragmentId++
    that.original.fragments[fragment.id] = fragment
    
    ret += fragment.wrap(fragment.render())
  })
  ret += '<!---' + list.id + '}-->'
  return ret
}

State.prototype.serialize = function() {
  return JSON.stringify(implode(this.original))
}

State.deserialize = function(obj) {
  return implode.recover(obj)
}

State.prototype.$deserialize = function(obj) {
  var that = this
  Object.keys(obj).forEach(function(key) {
    switch(key) {
      case '_contract':
      case 'areas':
      case 'fragments':
      case 'original':
      case 'path':  return
      default:
        var val = obj[key]
        delete obj[key]
        obj.register(key, val)
    }
  })
  if (utils.isClient) {
    window.swac.views
    $(function() {
      utils.aquireFragments(document, window.app.fragments)
    })
  }
  return obj
}

function createFragment (app, template, context, parent, fn) {
  if (!fn) fn = Fragment
  var fragment = new fn(app.nextFragmentId++, template, context)
  app.fragments[fragment.id] = fragment
  
  if (parent) {
    parent.on('delete', fragment, 'dispose')
    fragment.once('delete', parent, 'off', parent, 'delete', fragment)
    parent.on('deleteContents', fragment, 'dispose')
    fragment.once('delete', parent, 'off', parent, 'deleteContents', fragment)
  }
  
  return fragment
}