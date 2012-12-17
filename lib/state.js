var utils = require('./utils')
  , implode = require('./implode')
  , Template = require('./template')
  , Fragment = require('./fragment')
  , Attribute = require('./attribute')
  , Observable = require('./observable')
  , Model = require('./model')

var State = module.exports = function() {
  this.fragments = []
  this.areas = {}
  this.original = this
  
  // per instance contract
  var contract = Array.apply(Array, this.$contract)
  contract.id = this.$contract.id
  Object.defineProperty(this, '$contract', { value: contract })
  // this.areas = { byRoute: {}, fragments: {} }

  var that = this
  ;['list', 'get', 'post', 'put', 'delete'].forEach(function(method) {
    that[method] = Model.getMethodFn(that, method)
  })
}

utils.eventify(State)
implode.register('Arkansas/State', State, ['fragments', 'areas', 'path'])

State.prototype.HTML =
State.prototype.html =
State.prototype.formFor = require('./helper/form')

State.prototype.register = function(name, obj) {
  if (name in this) return
  var that = this
    , value = null
  Object.defineProperty(this, name, {
    get: function() {
      return value
    },
    set: function(newValue) {
      if (value === newValue) return
      var old = value
      value = newValue
      if (old && typeof old.emit === 'function')
        old.emit('replaced')
    },
    enumerable: true
  })
  this[name] = obj
  this.$contract.push(name)
}

State.prototype.area = function area(name, fn) {
  var that = this
  area[name] = function() {
    var template = new Template(fn)
      , fragment = createFragment(that.original, template, that.original)
    fragment.silent = true
    that.areas[name] = fragment

    var res = ''
    res += '<!---{' + fragment.id + '-->'
    res += fragment.render()
    res += '<!---' + fragment.id + '}-->'
    return res
  }
}

State.prototype.attr = function(attr, fn) {
  var template = new Template(fn)
    , attribute = createFragment(this.original, template, this.original, arguments.callee.caller.fragment, Attribute)
  
  var ret = 'data-bind-' + attr + '="' + attribute.id + '" '
  ret += attr + '="' + attribute.render() + '"'
  return ret
}
  
State.prototype.block = function(/*[args.. ,] fn*/) {
  var args = Array.prototype.slice.call(arguments)
    , template = new Template(args.pop(), args)
    , fragment = createFragment(this.original, template, this.original, arguments.callee.caller.fragment)

  var ret = ''
  ret  = '<!---{' + fragment.id + '-->'
  ret += fragment.render()
  ret += '<!---' + fragment.id + '}-->'
  return ret
}

State.prototype.collection = function(/* context, [opts,] fn */) {
  var that = this
    , args = Array.prototype.slice.call(arguments)
    , fn = args.pop()
    , context = args.shift()
    , opts = args.shift() || {}
    , ret = ''

  var template = new Template(fn)
    , list = createFragment(this.original, template, this.original, arguments.callee.caller.fragment)
  list.args = context
  if (opts.silent) list.silent = true
  
  context.on('added', list, 'insert')
  list.once('delete', context, 'off', context, 'added', list)

  ret += '<!---{' + list.id + '-->'
  context.forEach(function(item) {
    var fragment = list.insert(item)
    fragment.id = that.original.fragments.length
    that.original.fragments.push(fragment)
    if (opts.silent) fragment.silent = true

    ret += '<!---{' + fragment.id + '-->'
    ret += fragment.render()
    ret += '<!---' + fragment.id + '}-->'
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
  if (utils.isBrowser) {
    $(function() {
      utils.aquireFragments(document, that.fragments)
    })
  }
  return obj
}

function createFragment (app, template, context, parent, fn) {
  if (!fn) fn = Fragment
  var fragment = new fn(app.fragments.length, template, context)
  app.fragments.push(fragment)
  
  if (parent) {
    parent.on('delete', fragment, 'dispose')
    fragment.once('delete', parent, 'off', parent, 'delete', fragment)
    parent.on('deleteContents', fragment, 'dispose')
    fragment.once('delete', parent, 'off', parent, 'deleteContents', fragment)
  }
  
  return fragment
}