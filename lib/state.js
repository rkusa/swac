var utils     = require('./utils')
  , implode   = require('./implode')
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
implode.register('swac/State', State, ['fragments', 'sections', 'views', 'path', 'events'])

State.prototype.HTML =
State.prototype.html =
State.prototype.formFor = require('./helper/form')

State.prototype.register = function(name, obj) {
  if (name in this) {
    if (Array.isArray(this[name]) && typeof this[name].reset === 'function')
      this[name].reset(obj)
    else
      this[name] = obj
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

State.prototype.section = function(name, opts) {
  var template = this.sections[name]
  if (!template) {
    if (opts && opts.optional === true) return ''
    else throw new Error('Section ' + name + ' not defined')
  }
  
  var fragment = createFragment(this.original, template, this.original)
  fragment.silent = true
  this.sections[name] = fragment
  
  return fragment.wrap(fragment.render())
  
  return res
}

State.prototype.registerSection = function area(name, fn) {
  var template = new Template(fn)
  this.sections[name] = template
  
  if (!(this.currentView in this.views)) this.views[this.currentView] = []
  this.views[this.currentView].push({
    section: name,
    template: template
  })
}

State.prototype.attr = function(/*attr, [args.. ,] fn*/) {
  var args = Array.prototype.slice.call(arguments)
    , fn = args.pop()
    , attr = args.shift()
    , template = new Template(fn, args)
    , attribute = createFragment(this.original, template, this.original, arguments.callee.caller.fragment, Attribute)
  
  var ret = 'data-bind-' + attr + '="' + attribute.id + '" '
  ret += attr + '="' + attribute.render() + '"'
  return ret
}
  
State.prototype.block = function(/*[args.. ,] fn*/) {
  var args = Array.prototype.slice.call(arguments)
    , template = new Template(args.pop(), args)
    , fragment = createFragment(this.original, template, this.original, arguments.callee.caller.fragment)
  
  return fragment.wrap(fragment.render())
}

State.prototype.collection = function(/* context[, tag][, args], fn[, opts] */) {
  var that = this
    , args = Array.prototype.slice.call(arguments)
    , opts = args.pop()
    , fn = typeof opts === 'function' ? opts : args.pop()
    , context = args.shift()
    , tag = args.shift()
    , ret = ''
  if (typeof opts !== 'object') opts = {}
  
  var template = new Template(fn, args)
    , list = createFragment(this.original, template, this.original, arguments.callee.caller.fragment)
  list.args = context
  if (opts.silent) list.silent = true
  
  context.on('added', list, 'insert')
  list.once('delete', context, 'off', context, 'added', list)

  ret += '<!---{' + list.id + '-->'
  context.forEach(function(item) {
    var fragment = list.insert(item, undefined, tag ? Element.bind(undefined, tag) : Fragment)
    fragment.id = that.original.nextFragmentId++
    if (opts.silent) fragment.silent = true
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