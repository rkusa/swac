var utils = require('./utils')
  , implode = require('./implode')
  , Template = require('./template')
  , Fragment = require('./fragment')
  , Attribute = require('./attribute')
  , Observable = require('./observable')

var State = module.exports = function() {
  this.fragments = []
  this.areas = {}
  this.original = this
  
  // per instance contract
  var contract = Array.apply(Array, this.$contract)
  contract.id = this.$contract.id
  Object.defineProperty(this, '$contract', { value: contract })
  // this.areas = { byRoute: {}, fragments: {} }
}

utils.eventify(State)
implode.register('Arkansas/State', State, ['fragments', 'areas', 'path'])

State.prototype.HTML =
State.prototype.html = require('./helper/form')

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
      value = newValue
      // that.emit('changed.' + name)
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
  
State.prototype.block = function(fn) {
  var template = new Template(fn)
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
    , list = createFragment(this.original, template, context, arguments.callee.caller.fragment)
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