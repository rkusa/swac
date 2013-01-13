var Observable = require('./observable')
  , implode = require('./implode')
  , Collection = exports.Collection = {}
  , GroupedCollection = exports.GroupedCollection = {}

var propertyFn = function(name, fn) {
  if (name in this) return
  var that = this
  Object.defineProperty(this, name, {
    get: function get() {
      if (typeof get.caller.fragment != 'undefined')
        get.caller.fragment.observe(that)

      return fn.call(that)
    },
    enumerable: true
  })
}

Collection.define = function(name, model, definition) {
  if (!model || typeof model._type === 'undefined')
    throw new Error('no model provided')
  if (!definition || typeof definition !== 'function')
    throw new Error('no definition provided')
  
  var collection = function coll(properties) {
    if (!properties) properties = []
    var that = Observable.Array(properties, model)
    that.$contract = coll.prototype.$contract
    definition.call({ property: propertyFn.bind(that) })
    return that
  }
  implode.register('Collection/' + name, collection, ['model', 'events'])
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