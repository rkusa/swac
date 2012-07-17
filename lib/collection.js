var Observable = require('./observable')
  , GroupedCollection = module.exports

GroupedCollection.collections = {}

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

GroupedCollection.define = function(name, model, property, definition) {
  var collection = GroupedCollection.collections[name] = function(properties) {
    var that = Observable.Array(model).groupBy(property)
    Object.defineProperties(that, {
      '_collectionName': {
        value: name
      }
    })
    definition.call({ property: propertyFn.bind(that) })
    that.serialize = function() {
      var data =[]
      this.forEach(function(item) {
        data.push(item.serialize())
      })
      return { type: 'GroupedCollection:' + name, obj: data }
    }
    that.deserialize = function(obj) {
      var that = this
      obj.forEach(function(item) {
        var record = new Observable.Group
        record.deserialize(item.obj)
        var items = record.collection
        record.collection = Observable.Array(model)
        record.collection.reset(items)
        record.collection.forEach(function(item) {
          item.on('changed:' + property, function callback() {
            item.removeListener('changed:' + property, callback)
            that.remove(item)
            that.add(item)
          })
        })
        that.push(record)
      })
    }
    return that
  }
  Object.defineProperty(collection, '_name', {
    value: name
  })

  return collection
}