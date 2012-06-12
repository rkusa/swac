var events = require('events')
  , util = require('util')
  , Collection = module.exports

Collection.collections = {}

Collection.define = function(name, definition) {
  var collection = Collection.collections[name] = function(model) {
    this._model = model
    this._collection = []
    this._fragment = null
    definition.call(this)
    Object.defineProperty(this, '_collectionName', {
      value: name
    })
  }

  util.inherits(collection, events.EventEmitter)

  Object.defineProperty(collection, '_name', {
    value: name
  })

  collection.prototype.filter = function(name, fn) {
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

  collection.prototype.reset = function(data) {
    var that = this
    data.forEach(function(data) {
      var model = new that._model
      model.isNew = false
      Object.keys(data).forEach(function(key) {
        if (typeof model[key] !== 'undefined') model[key] = data[key]
      })
      that.add(model)
    })
    this.emit('changed')
  }

  collection.prototype.add = function(model) {
    if (!model instanceof this._model)
      throw new Error('Model have to be an instance of ' + this._model._name)

    var that = this
    Object.defineProperty(model, '_position', {
      value: that._position + '._collection.' + that._collection.length
    })
    that._collection.push(model)
    model.on('destroy', this.remove.bind(this, model))
    model.on('changed', this.emit.bind(this, 'changed'))
    this.emit('add', model)
    this.emit('changed')
  }

  collection.prototype.remove = function(model) {
    var index = this._collection.indexOf(model)
    if (index === -1) return
    this._collection.splice(index, 1)
    this.emit('changed')
  }

  collection.prototype.serialize = function() {
    var data =[]
    this._collection.forEach(function(item) {
      data.push(item.serialize())
    })
    return { type: 'Collection:' + name + ':' + this._model._name, obj: data }
  }

  collection.prototype.deserialize = function(obj) {
    var that = this
    obj.forEach(function(item) {
      var model = new that._model
      model.deserialize(item.obj)
      that.add(model)
    })
  }

  return collection
}