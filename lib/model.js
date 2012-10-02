var utils = require('./utils')
  , Arkansas = require('./')
  , Contract = require('./serialization').Contract
  , Model = module.exports

Model.define = function(name, definition) {
  var model = function(properties) {
    var that = this
    utils.eventify(this)
    Object.defineProperties(this, {
      'changed': {
        value: false,
        writable: true
      },
      'isNew': {
        value: true,
        writable: true
      },
      '_type': {
        value: name,
        enumerable: false
      },
      '_changedValues': {
        value: {},
        writable: false
      }
    })
    definition.call(this)
    
    if (!this.hasOwnProperty('_id'))
      this.property('_id')
    if (properties)
      Object.keys(properties).forEach(function(property) {
        if (that.hasOwnProperty(property))
          that[property] = properties[property]
      })
  }
  Object.defineProperty(model, '_type', {
    value: name
  })
  
  var properties = ['_id']
  definition.call({ property: function(key, opts) {
    properties.push(key)
  }})
  new Contract('Model/' + name, model, properties)
  
  Model.prepareApi(model, 'list')
  Model.prepareApi(model, 'get')
  Model.prepareApi(model, 'post')
  Model.prepareApi(model, 'put')
  Model.prepareApi(model, 'delete')

  model.prototype.property = function(key, opts) {
    var value = null
    if (!opts) opts = {}

    Object.defineProperty(this, key, {
      get: function() {
        if (typeof arguments.callee.caller.fragment != 'undefined' && !opts.silent)
          arguments.callee.caller.fragment.observe(this, key)
        return value
      },
      set: function(newValue) {
        var that = this
          , changed = function() {
          utils.debug('[Model] "%s"\'s Property "%s" got changed ... forwarding Event to its Model', name, key)
          that.emit('changed.' + key)
        }
        if (value == newValue) return
        this._changedValues[key] = value
        if (Array.isArray(newValue)) {
          if (Array.isArray(value)) value.off('changed.*', changed)
          if ('serialize' in newValue)
            value = newValue
          else 
            value = Arkansas.observableArray(newValue)
          if (!opts.silent) value.on('changed.*', changed)
        } else value = newValue
        if (!opts.silent) {
          utils.debug('[Model] "%s"\'s Property "%s" got changed',this._position || name, key)
          this.emit('changed.' + key, that)
        }
      },
      enumerable: true
    })
  }

  model.prototype.save = function(callback) {
    var that = this
    this.isNew ? model.post(this, function(res) {
      that.isNew = false
      if (callback) callback(res)
    }) : model.put(this._id, this, callback)
  }

  model.prototype.destroy = function(callback) {
    var that = this
      , cb = function() {
        if (callback) callback()
        utils.debug('[Model] "%s" got destroyed', that._position || name)
        that.emit('destroy')
      }
    this.isNew ? cb() : model.delete(this._id, cb)
  }
  
  return model
}

Model.prepareApi = function(model, method) {
  var fn = Arkansas.isServer ? function() {} : function(id, props, success) {
    if (typeof id === 'function') {
      success = id
    } else if (typeof props === 'function') {
      success = props
      props = id
    }
    var params = { type: method === 'list' ? 'get' : method, dataType: 'json' }
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
          , path = '/api/' + model._type.toLowerCase()
        if (method != 'post' && method != 'list') path += '/:id'
        express[method == 'list' ? 'get' : method](path, function(req, res) {
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