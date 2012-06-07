var events = require('events')
  , util = require('util')
  , Model = module.exports

Model.models = {}

Model.define = function(name, definition) {
  var model = Model.models[name] = function(properties) {
    var that = this
    definition.call(this)
    if (properties)
      Object.keys(properties).forEach(function(property) {
        if (that.hasOwnProperty(property))
          that[property] = properties[property]
      })
    Object.defineProperty(this, '_modelName', {
      value: name
    })
  }
  util.inherits(model, events.EventEmitter)
  Object.defineProperty(model, '_name', {
    value: name
  })
  model.list = Model.list.bind(null, model)
  model.get = Model.get.bind(null, model)
  model.post = Model.post.bind(null, model)
  model.put = Model.put.bind(null, model)
  model.delete = Model.delete.bind(null, model)

  model.prototype.property = function(key) {
    var value = null
    Object.defineProperty(this, key, {
      get: function() {
        if (typeof arguments.callee.caller.fragment != 'undefined')
          arguments.callee.caller.fragment.observe(this._position, key)
        return value
      },
      set: function(newValue) {
        if (value == newValue) return
        value = newValue
        this.emit('changed')
        this.emit('changed:' + key)
      },
      enumerable: true
    })
  }

  model.prototype.destroy = function() {
    this.emit('destroy')
  }

  model.prototype.serialize = function() {
    var obj = {}
      , that = this
    Object.keys(this).forEach(function(key) {
      obj[key] = that[key]
    })
    return { type: 'Model:' + name, obj: obj }
  }

  model.prototype.deserialize = function(obj) {
    var that = this
    Object.keys(obj).forEach(function(key) {
      if (that.hasOwnProperty(key)) that[key] = obj[key]
    })
  }

  return model
}

Model.api = function(method, model, fn) {
  Object.defineProperty(model.prototype, method, {
    value: fn,
    enumerable: true
  })
  if (typeof window === 'undefined') {
    var path = '/api/' + model._name.toLowerCase()
    if (method != 'post' && method != 'list') path += '/:id'
    express[method == 'list' ? 'get' : method](path, function(req, res) {
      var result = fn(req.params.id || req.body, req.body)
      res.json(result)
    })
  }
}
Model.list = Model.api.bind(null, 'list')
Model.get = Model.api.bind(null, 'get')
Model.post = Model.api.bind(null, 'post')
Model.put = Model.api.bind(null, 'put')
Model.delete = Model.api.bind(null, 'delete')