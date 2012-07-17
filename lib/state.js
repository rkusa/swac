var events = require('events')
  , util = require('util')
  , utils = require('./utils')

var State = module.exports = function() {
    this.templates = []
    this.fragments = []
    this.areas = { byRoute: {}, fragments: {} }
  }
  , Model = require('./model')
  , GroupedCollection = require('./collection').GroupedCollection
  , Collection = require('./collection').Collection
  , Template = require('./template')
  , Fragment = require('./fragment')
  , Observable = require('./observable')

util.inherits(State, events.EventEmitter)

State.prototype.register = function(name, obj) {
  if (name in this) return
  var that = this
    , value = null
  Object.defineProperty(this, name, {
    get: function() {
      return value
    },
    set: function(newValue) {
      var oldValue = value
      value = newValue
      if (value && !value.hasOwnProperty('_position'))
        Object.defineProperty(value, '_position', {
          value: name
        })
      that.emit('changed:' + name)
    },
    enumerable: true
  })
  this[name] = obj
}

State.prototype.area = function(name, template) {
  var that = this
    , safe = this.safe

  var template = new Template(this.templates.length, template)
  this.templates[template.id] = template

  var fragment = new Fragment(that.fragments.length, template, that)
  fragment.silent = true
  that.fragments[fragment.id] = fragment

  if (!that.areas.byRoute[that.path.route.pattern])
    that.areas.byRoute[that.path.route.pattern] = {}
  that.areas.byRoute[that.path.route.pattern][name] = {
    type: 'Reference',
    obj: { path: 'templates.' + template.id }
  }
  that.areas.fragments[name] = {
    type: 'Reference',
    obj: { path: 'fragments.' + fragment.id }
  }


  this.area[name] = function() {
    var ret = ''
    that.safe = safe // .safe disappears; set it back (TODO: Why does it disappear!?)

    ret += '<!---{' + fragment.id + '-->'
    ret += fragment.render()
    ret += '<!---' + fragment.id + '}-->'

    return that.safe(ret)
  }
}

State.prototype.block = function(context, fn) {
  if (typeof context === 'function') {
    fn = context
    context = null
  }

  var ret = ''

  var template = new Template(this.templates.length, fn)
  this.templates[template.id] = template

  var fragment = new Fragment(this.fragments.length, template, context || this)
  this.fragments[fragment.id] = fragment

  if (arguments.callee.caller && typeof arguments.callee.caller.fragment !== 'undefined') {
    fragment.parentFragment = arguments.callee.caller.fragment
    // arguments.callee.caller.fragment.once('detached', fragment.detach.bind(fragment))
  }

  ret += '<!---{' + fragment.id + '-->'
  ret += fragment.render()
  ret += '<!---' + fragment.id + '}-->'

  return this.safe(ret)
}

State.prototype.collection = function(/* context, [opts,] fn */) {
  var that = this
    , args = Array.prototype.slice.call(arguments)
    , fn = args.pop()
    , context = args.shift()
    , opts = args.shift() || {}
    , ret = ''

  var template = new Template(this.templates.length, fn)
  this.templates[template.id] = template

  var list = new Fragment(this.fragments.length, template, context, this)
  this.fragments[list.id] = list
  if (opts.silent) list.silent = true

  if (typeof arguments.callee.caller.fragment !== 'undefined') {
    list.parentFragment = arguments.callee.caller.fragment
    // arguments.callee.caller.fragment.once('detached', list.detach.bind(list))
  }

  ret += '<!---{' + list.id + '-->'

  for (var i = 0; i < context.length; ++i) {
    var fragment = new Fragment(this.fragments.length, template, context[i], this)
    // list.once('detached', fragment.detach.bind(fragment))
    fragment.parentFragment = list
    fragment.parent = list.context
    if (opts.silent) fragment.silent = true
    this.fragments[fragment.id] = fragment

    ret += '<!---{' + fragment.id + '-->'
    ret += fragment.render()
    ret += '<!---' + fragment.id + '}-->'
  }

  ret += '<!---' + list.id + '}-->'

  return this.safe(ret)
}

function serialize (that) {
  if (typeof that === 'undefined' || that === null) return
  var obj = null
  if (typeof that.serialize === 'function') {
    obj = that.serialize()
  } else if (Array.isArray(that)) {
    obj = []
    for (var i in that) {
      var value = serialize(that[i])
      if (value !== null) obj.push(value)
    }
  } else if (typeof that === 'object') {
    obj = {}
    Object.keys(that).forEach(function(key) {
      var value = serialize(that[key])
      if (value !== null) obj[key] = value
    })
  } else {
    obj = that
  }
  return obj
}

State.prototype.serialize = function() {
  var that = this
    , obj = {}
  Object.keys(this).forEach(function(key) {
    if (key === 'settings' || key === 'filename') return
    var serialized
    if (serialized = serialize(that[key]))
      obj[key] = serialized
  })
  obj['path'] = this.path
  return JSON.stringify(obj)
}

function deserialize (that) {
  var self = this
  if (that === null) return null
  if (typeof that === 'object') {
    if (Array.isArray(that)) {
      var obj = []
      for (var i in that) {
        obj[i] = deserialize.call(this, that[i])
      }
      return obj
    } else if (that.type && that.obj) {
      var type = that.type.split(':')
        , prop
      switch (type[0]) {
        case 'Model':
          prop = new Model.models[type[1]]
          break
        case 'ObservableArray':
          prop = Observable.Array(Model.models[type[1]])
          break
        case 'GroupedObservableArray':
          prop = Observable.Array(Model.models[type[1]]).groupBy(type[2])
          break
        case 'Collection':
          prop = new Collection.collections[type[1]]
          break
        case 'GroupedCollection':
          prop = new GroupedCollection.collections[type[1]]
          break
        case 'Template':
          prop = new Template()
          break
        case 'Fragment':
          prop = new Fragment()
          break
        case 'Reference':
          prop = this.followPath(that.obj.path)
          break
      }
      if (typeof prop.deserialize === 'function' && type[0] !== 'Reference')
        prop.deserialize(that.obj)
      return prop
    } else {
      Object.keys(that).forEach(function(key) {
        that[key] = deserialize.call(self, that[key])
      })
      return that
    }
  } else {
    return that
  }
}

State.prototype.deserialize = function(obj, silent) {
  var that = this
  Object.keys(obj).forEach(function(key) {
    if (!that[key] && key !== 'fragments' && key !== 'templates' && key !== 'areas') {
      var value = deserialize.call(this, obj[key])
      if (typeof value.emit === 'function')
        that.register(key, value)
      else
        that[key] = value
    }
  })
  that.path = obj.path
  that.templates = deserialize.call(this, obj.templates)
  $(function() {
    obj.fragments.forEach(function(obj) {
      var fragment = deserialize(obj)
      that.fragments[fragment.id] = fragment
    })
    if (!silent) utils.aquireFragments(document, that.fragments)
    that.areas = deserialize.call(that, obj.areas)
  })
  return this
}

State.prototype.followPath = function(path) {
  if (!path) return this
  var path = path.split('.')
    , obj = this
  path.forEach(function(prop) {
    obj = obj[prop]
  })
  return obj
}