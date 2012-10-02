var utils = require('./utils')
  , serialization = require('./serialization')
  , Contract = serialization.Contract
  , Model = require('./model')
  , GroupedCollection = require('./collection').GroupedCollection
  , Collection = require('./collection').Collection
  , Template = require('./template')
  , Fragment = require('./fragment')
  , Observable = require('./observable')

var State = module.exports = function() {
  this.fragments = []
  this.original = this
  
  // per instance contract
  var contract = Array.apply(Array, this.$contract)
  contract.id = this.$contract.id
  Object.defineProperty(this, '$contract', { value: contract })
  // this.areas = { byRoute: {}, fragments: {} }
}

utils.eventify(State)
new Contract('Arkansas/State', State, ['fragments', 'path'])

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
  this.$contract.push(name)
}

State.prototype.area = function area(name, fn) {
  var that = this
  area[name] = function() {
    var template = new Template(fn)
      , fragment = createFragment(that.original, template, that.original)
    fragment.silent = true
      
    // if (!this.areas.byRoute[this.path.route.pattern])
    //   this.areas.byRoute[this.path.route.pattern] = {}
    // this.areas.byRoute[this.path.route.pattern][name] = template
    // this.areas.fragments[name] = fragment
    
    var res = ''
    res += '<!---{' + fragment.id + '-->'
    res += fragment.render()
    res += '<!---' + fragment.id + '}-->'
    return res
  }
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

  ret += '<!---{' + list.id + '-->'
  for (var i = 0; i < context.length; ++i) {
    var fragment = createFragment(this.original, template, context[i], list)
    if (opts.silent) fragment.silent = true

    ret += '<!---{' + fragment.id + '-->'
    ret += fragment.render()
    ret += '<!---' + fragment.id + '}-->'
  }
  ret += '<!---' + list.id + '}-->'
  return ret
}

State.prototype.serialize = function() {
  return JSON.stringify(serialization.prepare(this.original))
}

State.deserialize = function(obj) {
  return serialization.recover(obj)
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

function createFragment (app, template, context, parent) {
  var fragment = new Fragment(app.fragments.length, template, context)
  app.fragments.push(fragment)
  
  if (parent) {
    parent.on('delete', fragment, 'delete')
    fragment.once('delete', parent, 'off', parent, fragment)
  }
  
  return fragment
}