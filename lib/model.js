var utils = require('./utils')
  , implode = require('./implode')
  , revalidator = require('revalidator')
  , Model = module.exports
  , Observable
  , ajaxAdapter = require('./adapter/ajax')

var api = Model.api = {}

var Definition = function(name, obj, callback) {
  this.name       = name
  this.obj        = obj
  this.callback   = callback
  this.properties = []
  this.async      = false

  Object.defineProperties(obj, {
    _type: { value: name },
    allow: { value: {}, enumerable: true },
    deny:  { value: {}, enumerable: true }
  })

  Object.defineProperties(obj.prototype, {
    '_validation': { value: {} }
  })
}

Definition.prototype.apply = function(obj) {
  var values = {}
  this.properties.forEach(function(key) {
    values[key] = null
    Object.defineProperty(obj, key, {
      get: function get() {
        if (typeof get.caller.fragment != 'undefined' && !this._validation[key].silent)
          get.caller.fragment.observe(this, key)
        return values[key]
      },
      set: function(newValue) {
        if (values[key] == newValue) return
        this._changedValues[key] = values[key]
        if (Array.isArray(newValue)) {
          if (Array.isArray(values[key]))
            values[key].off('changed', this)
          if ('emit' in newValue)
            values[key] = newValue
          else 
            values[key] = Observable.Array(newValue)
          if (!this._validation[key].silent) {
            values[key].on('changed', this, 'emit', this, 'changed')
            values[key].on('changed', this, 'emit', this, 'changed.' + key)
          }
        } else values[key] = newValue
        if (!obj._validation[key].silent) {
          utils.debug('[Model] "%s"\'s Property "%s" got changed', obj._type, key)
          this.emit('changed', this)
          this.emit('changed.' + key, this)
        }
      },
      enumerable: true
    })
  })
}

Definition.prototype.property = function(key, opts) {
  this.obj.prototype._validation[key] = opts || {}
  this.properties.push(key)
}

Definition.prototype.use = function(adapter, opts, define) {
  this.async = true
  if (!opts) opts = {}
  if (utils.isServer) {
    if (typeof adapter === 'string')
      adapter = (require)('arkansas-' + adapter)
  } else if (adapter !== ajaxAdapter || opts.serverOnly) {
    return
  }
  api[this.name] = adapter.initialize(this.obj, opts, define, this.callback)
  var that = this
  if (!opts.serverOnly && utils.isServer) {
    ;['list', 'get', 'post', 'put', 'delete'].forEach(function(method) {
      defineApi(that.obj, method, opts)
    })
  }
  return adapter
}

Definition.prototype.allow = function(definition) {
  var that = this
  Object.keys(definition).forEach(function(prop) {
    that.obj.allow[prop] = definition[prop]
  })
}

Definition.prototype.deny = function(definition) {
  var that = this
  Object.keys(definition).forEach(function(prop) {
    that.obj.deny[prop] = definition[prop]
  })
}

Model.define = function(name, opts, define, callback) {
  if (typeof opts === 'function') {
    callback = define
    define = opts
    opts = {}
  }

  var definition

  var model = function(properties) {
    var that = this
    Object.defineProperties(this, {
      '_id':            { value: null,        writable: true    },
      'changed':        { value: false,       writable: true    },
      'isNew':          { value: true,        writable: true    },
      '_type':          { value: name,        enumerable: false },
      '_changedValues': { value: {},          writable: false   },
      '$errors':        { enumerable: true,   writable: true,
                          configurable: true, value: {}         }
    })

    definition.apply(this)

    // if provided, apply values
    if (properties) {
      Object.keys(properties).forEach(function(property) {
        if (that.hasOwnProperty(property))
          that[property] = properties[property]
      })
    }
  }

  definition = new Definition(name, model, callback)
  define.call(definition)
  if (utils.isBrowser) definition.use(ajaxAdapter)
    
  // set id if not defined through provided definition
  if (definition.properties.indexOf('id') === -1)
    definition.property('id')

  if (!definition.async && callback) callback()
  utils.eventify(model)
  implode.register('Model/' + name, model,
                  ['id', 'events', 'isNew'].concat(definition.properties))

  if (utils.isServer) {
    // workarround to get call stack to find file, which defines the this model
    var callStack = new Error().stack.split('\n')
      , caller = callStack[2]
      , parts = caller.match(/\(([^:]+):[0-9]+:[0-9]+\)$/)

    if (parts) {
      var path = parts[1].replace(/\.js$/, '.server.js')
        , fs = (require)('fs')
      if (fs.existsSync(path)) {
        process.nextTick(function() {
          (require)(path)
        })
      }
    }
  }

  model.extend = function(define) {
    define.call(definition)
  }

  model.prototype.toJSON = function() {
    var that = this
      , json = {}
    definition.properties.forEach(function(key) {
      if (!that._validation[key].serverOnly)
        json[key] = that[key]
    })
    return json
  }

  model.prototype.save = function(callback) {
    var that = this, props = {}
    definition.properties.forEach(function(prop) {
      if (prop in that._changedValues)
        props[prop] = that[prop]
    })
    this.isNew ? api[this._type].post(props, function(err, res) {
      that.isNew = false
      that._id = res._id
      that.id = res.id
      if (callback) callback(res)
    }) : api[this._type].put(this.id, props, function(err, res) {
      if (callback) callback(res)
    })
  }

  model.prototype.destroy = function(callback) {
    var that = this
      , cb = function() {
        utils.debug('[Model] "%s" got destroyed', name)
        that.emit('destroy')
        if (callback) callback()
      }
    this.isNew ? cb() : api[this._type].delete(this.id, cb)
  }
  
  model.prototype.updateAttributes = function(attrs, opts) {
    if (!attrs) return
    if (!opts) opts = {}
    var that = this
    Object.keys(attrs).forEach(function(key) {
      if (!that.hasOwnProperty(key)) return
      if (opts.silent) that._attributes[key] = attrs[key]
      else that[key] = attrs[key]
    })
  }
  
  model.prototype.validate = function() {
    var validation = (utils.isBrowser ? window.json : revalidator).validate(this, { properties: this._validation })
      , that = this
    var old = this.$errors
    this.$errors = {}
    validation.errors.forEach(function(err) {
      that.$errors[err.property] = err
      that.emit('changed.' + err.property)
    })
    Object.keys(old).forEach(function(key) {
      if (!(key in that.$errors))
        that.emit('changed.' + key)
    })
    return validation.valid
  }
  
  return model
}

Model.authorizeWrite = function(model, req, method, allowed, denied) {
  if (!req || method === 'get' || method === 'list') return allowed()

  var allow = model.allow[method] || model.allow.write
    || model.allow.all || function() { return true }
  var deny = model.deny[method] || model.deny.write
    || model.deny.all || function() { return false }

  if (method === 'post') {
    if (!((!allow || allow(req)) && (!deny || !deny(req))))
      denied()
    else
      allowed()
  } else {
    req.arkansas.get(model, req.params.id, function(err, body) {
      if (err) throw err
      if (!((!allow || allow(req, body)) && (!deny || !deny(req, body))))
        denied()
      else
        allowed(body)
    })
  }
}

Model.authorizeRead = function(model, req, method, models) {
  if (method === 'post' || method === 'put' || method === 'delete') return models

  var allow = model.allow[method] || model.allow.read
    || model.allow.all || function() { return true }
  var deny = model.deny[method] || model.deny.read
    || model.deny.all || function() { return false }

  var input = Array.isArray(models) ? models : [models]
    , output = []
  input.forEach(function(row) {
    if (((!allow || allow(req, row)) && (!deny || !deny(req, row))))
      output.push(row)
  })

  if (Array.isArray(models))
    return output
  else
    return output[0] || null
}

Model.getMethodFn = function(app, method) {
  if (utils.isBrowser) {
    return function() {
      var args = Array.prototype.slice.call(arguments)
        , model = args.shift()
        , fn = Model.api[model._type][method]
      if (!fn) throw new Error('API for ' + model._type + ' not defined')

      fn.apply(model, args)
    }
  }
  // else
  return function() {
    var args = Array.prototype.slice.call(arguments)
      , model = args.shift()
      , callback = args[args.length - 1]
      , fn = Model.api[model._type][method]
    if (!fn) throw new Error('API for ' + model._type + ' not defined')
    if (callback && typeof callback !== 'function') callback = undefined
    Model.authorizeWrite(
      model, app.req, method,
      // allowed
      function(body) {
        if (!callback) return
        if (body && method === 'put') {
          var data = args[1]
          Object.keys(body).forEach(function(key) {
            if (!(key in data)) data[key] = body[key]
          })
        }
        args[args.length - 1] = function(err, result) {
          if (err) return callback(err)
          var output = Model.authorizeRead(model, app.req, method, result)
          callback(null, output)
        }
        fn.apply(model, args)
      },
      // denied
      function() {
        if (callback) callback(new Error('Unauthorized'))
      }
    )
  }
}

Observable = require('./observable')

function defineApi(model, method, opts) {
  // trick browserify to ignore this one
  var express = (require)('./server').app
    , path = '/_api/' + model._type.toLowerCase()
  if (method !== 'post' && method !== 'list') path += '/:id'
  var scope = []
  if (opts.scope) {
    var scope = (require)('./server').scope[opts.scope]
  }
  express[method === 'list' ? 'get' : method].apply(express,
  [path].concat(scope || [], function(req, res) {
    var _fn = Model.getMethodFn(req.arkansas, method).bind(null, model)
    if (method === 'get' || method === 'put' || method === 'delete') 
      _fn = _fn.bind(_fn, req.params.id)
    if (method === 'put' || method === 'post')
      _fn = _fn.bind(_fn, req.body)
    else if (method === 'list')
      _fn = _fn.bind(_fn, req.query.view, req.query.key ? decodeURIComponent(req.query.key) : undefined)
    _fn(function(err, result) {
      if (err) {
        if (err.message == 'Unauthorized')
          return res.send(401)
        else
          throw err
      }

      if (!result) return res.json(result)
      res.json(Array.isArray(result) ? result.map(function(obj) {
        return obj.toJSON()
      }) : result.toJSON())
    })
  }))
}