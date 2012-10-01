var Observable = require('./observable')
  , Contract = require('./serialization').Contract
  , Collection = exports.Collection = {}
  , GroupedCollection = exports.GroupedCollection = {}

var propertyFn = function(name, fn) {
  if (name in this) return
  var that = this
  Object.defineProperty(this, name, {
    get: function() {
      if (typeof arguments.callee.caller.fragment != 'undefined')
        arguments.callee.caller.fragment.observe(that)

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
    that.$contract.id = coll.prototype.$contract.id
    definition.call({ property: propertyFn.bind(that) })
    return that
  }
  new Contract('Collection/' + name, collection, ['model'])
  return collection
}

GroupedCollection.define = function(name, model, property, sub, definition) {
  if (!definition) {
    definition = sub
    sub = null
  }
  var collection = function(properties) {
    if (!properties) properties = []
    var that = Observable.Array(properties, model).groupBy(property, sub)
    definition.call({ property: propertyFn.bind(that) })
    return that
  }
  new Contract('Collection/' + name, collection, ['model'])
  return collection
}