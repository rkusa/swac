var Observable = require('./observable')
  , implode = require('./implode')
  , Collection = exports.Collection = {}
  , GroupedCollection = exports.GroupedCollection = {}

var Definition = function(name, arr) {
  this.name = name
  this.arr  = arr
}

Definition.prototype.property = function(name, fn) {
  var that = this
  Object.defineProperty(this.arr, name, {
    get: function get() {
      if (typeof get.caller.fragment !== 'undefined')
        get.caller.fragment.observe(this)
      
      return fn.length > 0 ? fn.bind(this) : fn.call(this)
    },
    enumerable: true
  })
}

Definition.prototype.function = function(name, fn) {
  
}

Collection.define = function(name, model, define) {
  if (!model || typeof model._type === 'undefined')
    throw new Error('no model provided')
  if (!define || typeof define !== 'function')
    throw new Error('no definition provided')
    
  var collection = function coll(properties) {
    if (!properties) properties = []
    var that = Observable.Array(properties, model)
    that.$contract = coll.prototype.$contract
    var definition = new Definition(name, that)
    define.call(definition)
    return that
  }
  implode.register('Collection/' + name, collection, ['model', 'events', 'compareFunction'])
  return collection
}

GroupedCollection.define = function(name, model, property, sub, definition) {
  if (!definition) {
    definition = sub
    sub = null
  }
  var collection = function coll(properties) {
    if (!properties) properties = []
    var that = Observable.Array(properties, model).groupBy(property, sub)
    that.$contract = coll.prototype.$contract
    definition.call({ property: propertyFn.bind(that) })
    return that
  }
  implode.register('GroupedCollection/' + name, collection, ['model', 'events'])
  return collection
}