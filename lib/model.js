var events = require('events')
  , util = require('util')
  , Arkansas = require('./')
  , Model = module.exports

Model.models = {}

Model.define = function(name, definition) {
  var model = Model.models[name] = function(properties) {
    var that = this
    definition.call(this)
    if (!this.hasOwnProperty('id'))
      this.property('id')
    if (properties)
      Object.keys(properties).forEach(function(property) {
        if (that.hasOwnProperty(property))
          that[property] = properties[property]
      })
    Object.defineProperties(this, {
      '_modelName': {
        value: name
      },
      'changed': {
        value: false,
        writable: true
      },
      'isNew': {
        value: true,
        writable: true
      }
    })
  }
  util.inherits(model, events.EventEmitter)
  Object.defineProperty(model, '_name', {
    value: name
  })

  Model.prepareApi(model, 'list')
  Model.prepareApi(model, 'get')
  Model.prepareApi(model, 'post')
  Model.prepareApi(model, 'put')
  Model.prepareApi(model, 'delete')

  model.prototype.property = function(key) {
    var that = this
      , value = null
    Object.defineProperty(this, key, {
      get: function() {
        if (typeof arguments.callee.caller.fragment != 'undefined')
          arguments.callee.caller.fragment.observe(that._position, key)
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

  model.prototype.create = function() {
    this.save()
  }

  model.prototype.save = function(callback) {
    var that = this
    this.isNew ? model.post(this, function() {
      that.isNew = false
      if (callback) callback()
    }) : model.put(this.id, this, callback)
  }

  model.prototype.destroy = function(callback) {
    var that = this
      , cb = function() {
        if (callback) callback()
        that.emit('destroy')
      }
    this.isNew ? cb() : model.delete(this.id, cb)
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

Model.prepareApi = function(model, method) {
  var fn = Arkansas.isServer ? function() {} : function(id, props, success) {
    if (typeof props === 'function') success = props
    var params = { type: method, dataType: 'json' }
    params.url = '/api/' + model._name.toLowerCase()
    if (method != 'post' && method != 'list') params.url += '/' + id
    if (method == 'post' || method == 'put') {
      params.contentType = 'application/json'
      params.data = JSON.stringify(props)
    }
    params.success = success
    $.ajax(params)
  }
  Object.defineProperty(model, method, {
    enumerable: true,
    get: function() {
      return fn
    },
    set: Arkansas.isServer ? function(val) {
      fn = val
      if (Arkansas.isServer) {
        // trick browserify to ignore this one
        var express = (require)('./server').app
          , path = '/api/' + model._name.toLowerCase()
        if (method != 'post' && method != 'list') path += '/:id'
        express[method == 'list' ? 'get' : method](path, function(req, res) {
          console.log(method)
          console.log(path)
          console.log(req.body)
          var _fn = fn
          if (method == 'get' || method == 'put' || method == 'delete') 
            _fn = _fn.bind(_fn, req.params.id)
          if (method == 'put' || method == 'post')
            _fn = _fn.bind(_fn, req.body)
          _fn(function(result) {
            res.json(result)
          })
        })
      }
    } : function() {}
  })
}