var utils = require('./utils')
  , Arkansas = require('./')
  , implode = require('./implode')
  , Model = module.exports

Model.define = function(name, definition) {
  var model = function(properties) {
    var that = this
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
        enumerable: true
      },
      '_changedValues': {
        value: {},
        writable: false
      },
      '_properties': {
        value: []
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
  
  var properties = ['_id', 'events', 'isNew']
  definition.call({ property: function(key, opts) {
    properties.push(key)
  }})
  utils.eventify(model)
  implode.register('Model/' + name, model, properties)
  
  Model.prepareApi(model, 'list')
  Model.prepareApi(model, 'get')
  Model.prepareApi(model, 'post')
  Model.prepareApi(model, 'put')
  Model.prepareApi(model, 'delete')

  model.prototype.property = function(key, opts) {
    var value = null
    if (!opts) opts = {}
    
    this._properties.push(key)
    Object.defineProperty(this, key, {
      get: function get() {
        if (typeof get.caller.fragment != 'undefined' && !opts.silent)
          get.caller.fragment.observe(this, key)
        return value
      },
      set: function(newValue) {
        var that = this
          , changed = function() {
          utils.debug('[Model] "%s"\'s Property "%s" got changed ... forwarding Event to its Model', name, key)
          that.emit('changed')
          that.emit('changed.' + key)
        }
        if (value == newValue) return
        this._changedValues[key] = value
        if (Array.isArray(newValue)) {
          if (Array.isArray(value)) value.off('changed', changed)
          if ('emit' in newValue)
            value = newValue
          else 
            value = Arkansas.observableArray(newValue)
          if (!opts.silent) value.on('changed', changed)
        } else value = newValue
        if (!opts.silent) {
          utils.debug('[Model] "%s"\'s Property "%s" got changed', name, key)
          this.emit('changed', that)
          this.emit('changed.' + key, that)
        }
      },
      enumerable: true
    })
  }

  model.prototype.save = function(callback) {
    var that = this, props = {}
    this._properties.forEach(function(prop) {
      props[prop] = that[prop]
    })
    this.isNew ? model.post(props, function(res) {
      that.isNew = false
      if (callback) callback(res)
    }) : model.put(this._id, props, callback)
  }

  model.prototype.destroy = function(callback) {
    var that = this
      , cb = function() {
        utils.debug('[Model] "%s" got destroyed', name)
        that.emit('destroy')
        if (callback) callback()
      }
    this.isNew ? cb() : model.delete(this._id, cb)
  }
  
  return model
}

Model.prepareApi = function(model, method) {
  var fn = Arkansas.isServer ? function() {} : function(/* id, props, success */) {
    var args = Array.prototype.slice.call(arguments)
      , success = args.pop()
      , id = args.shift()
      , props = args.shift()
      , params = { type: method === 'list' ? 'get' : method, dataType: 'json' }
    params.url = '/api/' + model._type.toLowerCase()
    if (method === 'list') {
      if (id) {
        params.url += '?view=' + id
        if (props) params.url += '&key=' + props
      }
    }
    else if (method != 'post') params.url += '/' + id
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
        if (method !== 'post' && method !== 'list') path += '/:id'
        express[method === 'list' ? 'get' : method](path, function(req, res) {
          var _fn = fn
          if (method === 'get' || method === 'put' || method === 'delete') 
            _fn = _fn.bind(_fn, req.params.id)
          else if (method === 'put' || method === 'post')
            _fn = _fn.bind(_fn, req.body)
          else if (method === 'list')
            _fn = _fn.bind(_fn, req.query.view, req.query.key)
          _fn(function(result) {
            res.json(result)
          })
        })
      }
    } : function() {}
  })
}