var Observable = require('./observable')
  , Contract = require('./serialization').Contract
  , Collection = exports.Collection = {}
  , GroupedCollection = exports.GroupedCollection = {}

var propertyFn = function(name, fn) {
  if (name in this) return
  var that = this
  this.$contract.push(name)
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
  var collection = function(properties) {
    var that = Observable.Array(model)
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
    var that = Observable.Array(model).groupBy(property, sub)
    definition.call({ property: propertyFn.bind(that) })
    return that
  }
  new Contract('Collection/' + name, collection, ['model'])
  return collection
}