var utils = require('./utils')
  , Arkansas = require('./')
  , implode = require('./implode')
  , Model = module.exports

Model.define = function(name, definition, callback) {
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
        enumerable: false
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
  
  Model.prepareApi(model, 'list')
  Model.prepareApi(model, 'get')
  Model.prepareApi(model, 'post')
  Model.prepareApi(model, 'put')
  Model.prepareApi(model, 'delete')

  var properties = ['_id', 'events', 'isNew']
    , context = { property: function(key, opts) {
      properties.push(key)
    }}
    , async = false
    
  if (utils.isServer) {
    context.use = function(adapter, opts) {
      async = true
      if (!opts) opts = {}
      if (typeof adapter === 'string')
        adapter = (require)('arkansas-' + adapter)
      return adapter.initialize.call(model, name, opts, callback)
    }
  } else {
    context.use = function() {}
  }
  definition.call(context)
  if (!async && callback) callback()
  utils.eventify(model)
  implode.register('Model/' + name, model, properties)
  
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
        if (value == newValue) return
        this._changedValues[key] = value
        if (Array.isArray(newValue)) {
          if (Array.isArray(value))
            value.off('changed', this)
          if ('emit' in newValue)
            value = newValue
          else 
            value = Arkansas.observableArray(newValue)
          if (!opts.silent) {
            value.on('changed', this, 'emit', this, 'changed')
            value.on('changed', this, 'emit', this, 'changed.' + key)
          }
        } else value = newValue
        if (!opts.silent) {
          utils.debug('[Model] "%s"\'s Property "%s" got changed', name, key)
          this.emit('changed', this)
          this.emit('changed.' + key, this)
        }
      },
      enumerable: true
    })
  }

  model.prototype.use = function() {
    var mock = {
      add: function() { return mock },
      reduce: function() { return mock }
    }
    return mock
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
      , props = args.length === 0 && typeof id === 'object' ? id : args.shift()
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
          if (method === 'put' || method === 'post')
            _fn = _fn.bind(_fn, req.body)
          else if (method === 'list')
            _fn = _fn.bind(_fn, req.query.view, req.query.key)
          _fn(function(err, result) {
            res.json(result)
          })
        })
      }
    } : function() {}
  })
}
