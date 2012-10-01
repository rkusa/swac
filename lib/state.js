var utils = require('./utils')
  , Contract = require('./serialization').Contract
  , Model = require('./model')
  , GroupedCollection = require('./collection').GroupedCollection
  , Collection = require('./collection').Collection
  , Template = require('./template')
  , Fragment = require('./fragment')
  , Observable = require('./observable')

var State = module.exports = function() {
  utils.eventify(this)
  this.fragments = []
  this.original = this
  
  // per instance contract
  var contract = Array.apply(Array, this.$contract)
  contract.id = this.$contract.id
  Object.defineProperty(this, '$contract', { value: contract })
  // this.areas = { byRoute: {}, fragments: {} }
}

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
      , fragment = new Fragment(name, template, that.original)
    fragment.silent = true
    that.original.fragments.push(fragment)
      
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
    , fragment = new Fragment(this.original.fragments.length, template, this.original)
  this.original.fragments.push(fragment)

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
    , list = new Fragment(this.original.fragments.length, template, context)
  this.original.fragments.push(list)
  if (opts.silent) list.silent = true

  // if (typeof arguments.callee.caller.fragment !== 'undefined') {
  //   list.parentFragment = arguments.callee.caller.fragment
  //   // arguments.callee.caller.fragment.once('detached', list.detach.bind(list))
  // }

  ret += '<!---{' + list.id + '-->'
  for (var i = 0; i < context.length; ++i) {
    var fragment = new Fragment(this.original.fragments.length, template, context[i])
    this.original.fragments.push(fragment)
    // list.once('detached', fragment.detach.bind(fragment))
    // fragment.parentFragment = list
    // fragment.parent = list.context
    if (opts.silent) fragment.silent = true

    ret += '<!---{' + fragment.id + '-->'
    ret += fragment.render()
    ret += '<!---' + fragment.id + '}-->'
  }
  ret += '<!---' + list.id + '}-->'
  return ret
}