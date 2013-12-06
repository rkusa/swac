var utils      = require('./utils')
  , implode    = require('implode')
  , Template   = require('./template')
  , Fragment   = require('./fragment')
  , Attribute  = require('./attribute')
  , Element    = require('./element')

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
  Object.defineProperties(this, {
    $contract:     { value: contract },
    _events:       { value: {}, writable: true },
    _origins:      { value: {}, writable: true },
    _location:     { value: null, writable: true },
    _currentRoute: { value: null, writable: true }
  })

  this.register('_path', null, { enumerable: false })
}

utils.eventify(State)
implode.register('swac/State', State, ['fragments', 'sections', 'views', 'path', '_events', '_origins', '_path', 'nextFragmentId'])

State.prototype.register = function(name, obj, opts) {
  if (!opts) opts = {}
  if (name in this) {
    if (Array.isArray(this[name]) && typeof this[name].reset === 'function')
      this[name].reset(obj)
    else if(obj !== undefined) {
      if (this[name] && typeof this[name].emit === 'function')
        this[name].emit('replaced')
      this[name] = obj
      this.emit('changed.' + name)
    }
    return
  }
  if (this._currentRoute) {
    if (!this._origins[this._currentRoute]) this._origins[this._currentRoute] = []
    this._origins[this._currentRoute].push(name)
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
      if (set.caller === implode.recover.traverse || set.caller === State.prototype.register) return
      if (old && typeof old.emit === 'function')
        old.emit('replaced')
      this.emit('changed.' + name)
    },
    enumerable: opts.enumerable !== undefined ? opts.enumerable : true,
    configurable: true
  })
  this[name] = obj
  this.$contract.push(name)
}

State.prototype.unregister = function(name) {
  this.removeAllListeners('changed.' + name)
  delete this[name]
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
    utils.observe('delete').until('delete', fragment)
         .call(fragment, 'dispose')
         .on(parent)

    utils.observe('deleteContents').until('delete', fragment)
         .call(fragment, 'dispose')
         .on(parent)
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

  utils.observe('added').until('delete', list)
       .call(list, 'insert')
       .on(context)

  utils.observe('replaced').until('delete', list)
       .call(list, 'refresh')
       .on(context)

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

var LZString = require('./helper/lz-string')

State.prototype.init = function() {
  return '<script type="text/javascript">\n' +
         '  window.app = require(\'swac\').initialize(\'' + this.compress() + '\')\n' +
         '</script>'
}

State.init = function(compressed) {
  return State.deserialize(JSON.parse(LZString.decompressFromBase64(compressed)))
}

State.prototype.compress = function() {
  return LZString.compressToBase64(this.serialize())
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
    utils.observe('delete').until('delete', fragment)
         .call(fragment, 'dispose')
         .on(parent)

    utils.observe('deleteContents').until('delete', fragment)
         .call(fragment, 'dispose')
         .on(parent)
  }
  
  return fragment
}