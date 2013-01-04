var utils = require('./utils')
  , implode = require('./implode')
  , revalidator = require('revalidator')
  , Model = module.exports
  , Observable
  , ajaxAdapter = require('./adapter/ajax')

var api = Model.api = {}

var Definition = function(name, obj, opts, callback) {
  this.name       = name
  this.obj        = obj
  this.opts       = opts
  this.callback   = callback
  this.properties = []
  this.async      = false

  Object.defineProperties(obj, {
    _type: { value: name },
    allow: { value: { properties: {}, instance: {} }, enumerable: true },
    deny:  { value: { properties: {}, instance: {} }, enumerable: true },
    hooks: { value: {}, enumerable: true }
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

Definition.prototype.property = function property(key, opts) {
  if (!opts) opts = {}
  if (property.caller.serverOnly) opts.serverOnly = true
  this.obj.prototype._validation[key] = opts
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
  ;['list', 'get', 'post', 'put', 'delete'].forEach(function(method) {
    that.obj[method] = Model.getMethodFn(method, that.obj)
    if (!that.opts.serverOnly && utils.isServer)
      defineApi(that.obj, method, that.opts)
  })
  return adapter
}

Definition.prototype.allow = function(props, definition) {
  this.restrict('allow', props, definition)
}

Definition.prototype.deny = function(props, definition) {
  this.restrict('deny', props, definition)
}

;['before', 'after'].forEach(function(t) {
  ['Create', 'Save', 'Update', 'Delete'].forEach(function(callback) {
    Definition.prototype[t + callback] = function(fn) {
      this.obj.hooks[t + callback] = fn
    }
  })
})

Definition.prototype.restrict = function(type, props, definition) {
  if (!definition) {
    definition = props
    props = undefined
  }
  if (props && !Array.isArray(props)) props = [props]
  var that = this
  if (!props) {
    Object.keys(definition).forEach(function(scope) {
      that.obj[type].instance[scope] = definition[scope]
    })
  } else {
    props.forEach(function(prop) {
      if (!that.obj[type].properties[prop])
        that.obj[type].properties[prop] = {}
      Object.keys(definition).forEach(function(scope) {
        that.obj[type].properties[prop][scope] = definition[scope]
      })
    })
  }
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
      'changed':        { value: false,       writable: true    },
      'isNew':          { value: true,        writable: true    },
      '_type':          { value: name,        enumerable: false },
      '_changedValues': { value: {},          writable: false   },
      '$errors':        { enumerable: true,   writable: true,
                          configurable: true, value: {}         }
    })

    definition.apply(this)

    definition.properties.forEach(function(property) {
      if (that._validation[property].default)
        // clone!
        that[property] = JSON.parse(JSON.stringify(that._validation[property].default))
    })

    // if provided, apply values
    if (properties) {
      Object.keys(properties).forEach(function(property) {
        if (that.hasOwnProperty(property))
          that[property] = properties[property]
      })
    }
  }

  definition = new Definition(name, model, opts || {}, callback)
  define.call(definition)
  if (utils.isClient) definition.use(ajaxAdapter)
    
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
    var caller = (new Error().stack.split('\n'))[2]
    if (caller.match(/\.server\.js:[0-9]+:[0-9]+\)$/)) {
      define.serverOnly = true
    }
    define.call(definition)
  }

  model.prototype.toJSON = function(all, method) {
    if (!all && definition.opts.serverOnly)
      return null

    var that = this
      , json = {}
    
    var authorizationContext = {}
    authorizationContext.isClient = utils.isBrowser ? true : (process.domain && process.domain.isAPICall === true)
    authorizationContext.isServer = !authorizationContext.isClient

    definition.properties.forEach(function(key) {
      var allow = model.allow.properties[key]
        && (model.allow.properties[key][method || 'read']
        || model.allow.properties[key].read
        || model.allow.properties[key].all
        || function() { return true })
      var deny = model.deny.properties[key]
        && (model.deny.properties[key][method || 'read']
        || model.deny.properties[key].read
        || model.deny.properties[key].all
        || function() { return false })

      if (all || (
        !that._validation[key].serverOnly
        &&
        (!allow || allow.call(authorizationContext, process.domain.req, model))
        &&
        (!deny || !deny.call(authorizationContext, process.domain.req, model))
      )) {
        json[key] = that[key]
      }
    })

    return json
  }

  model.prototype.save = function(callback) {
    var that = this
    this.isNew ? model.post(this, function(err, res) {
      if (err) throw err
      if (callback) callback(res)
    }) : model.put(this.id, this, function(err, res) {
      if (err) throw err
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
    this.isNew ? cb() : model.delete(this, cb)
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
    var validation = (utils.isClient ? window.json : revalidator).validate(this, { properties: this._validation })
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

  model.prototype.$serialize = function() {
    var obj    = this.toJSON()
    obj.events = this.events
    obj.isNew  = this.isNew
    return obj
  }
  
  return model
}

function executeHook(model, obj, hook, callback) {
  if (!model.hooks[hook]) return callback()
  model.hooks[hook](process.domain.req, obj, callback)
}

function authorize(model, method, allowed, denied) {
  var authorizationContext = {}
  authorizationContext.isClient = process.domain.isAPICall === true
  authorizationContext.isServer = !authorizationContext.isClient

  var type = (method === 'get' || method === 'list') ? 'read' : 'write'
  var allowFn = model.allow.instance[method] || model.allow.instance[type]
    || model.allow.instance.all || function() { return true }
  var denyFn = model.deny.instance[method] || model.deny.instance[type]
    || model.deny.instance.all || function() { return false }

  return function(arg) {
    var args = [process.domain.req, arg]
      , count = 2
      , allow, deny
    var callback = function(arg) {
      if (--count !== 0) return
      if (allow && !deny) allowed(arg)
      else denied()
    }

    if (typeof (allow = allowFn.apply(authorizationContext, args.concat(function(res) {
      process.nextTick(function() {
        allow = res
        callback(arg)
      })
    }))) !== 'undefined') callback(arg)
      
    if (typeof (deny = denyFn.apply(authorizationContext, args.concat(function(res) {
      process.nextTick(function() {
        deny = res
        callback(arg)
      })
    }))) !== 'undefined') callback(arg)
  }
}

Model.authorizeWrite = function(model, args, method, allowed, denied) {
  if (method === 'get' || method === 'list') return allowed()

  var first = args[0]
  function callback(err, body) {
    if (err) throw err
    authorize(model, method, allowed, denied)(body)
  }
  if (method === 'post' || first instanceof model)
    callback(null, first)
  else
    model.get(args[0], callback)
}

Model.authorizeRead = function(model, method, models, callback) {
  if (method === 'post' || method === 'put' || method === 'delete' || models === null)
    return callback(models)

  var input = Array.isArray(models) ? models : [models]
    , count = input.length
    , output = []
  var verified = function() {
    if (--count !== 0) return
    callback(Array.isArray(models) ? output : (output[0] || null))
  }
  input.forEach(function(row) {
    authorize(model, method, function() {
      output.push(row)
      verified()
    }, verified)(row)
  })

}

Model.getMethodFn = function(method, model, isRemote) {
  if (utils.isClient) {
    return function() {
      var args = Array.prototype.slice.call(arguments)
        , fn = Model.api[model._type][method]
      if (!fn) throw new Error('API for ' + model._type + ' not defined')
      if (method === 'put') {
        var id = args.shift()
        if (!('id' in args[0])) args[0].id = id
      }
      fn.apply(Model.api[model._type], args)
    }
  }
  // else
  return function() {
    var args = Array.prototype.slice.call(arguments)
      , callback = args[args.length - 1]
      , fn = Model.api[model._type][method]
    if (!fn) throw new Error('API for ' + model._type + ' not defined')
    if (callback && typeof callback !== 'function') callback = undefined
    Model.authorizeWrite(
      model, args, method,
      // allowed
      function(body) {
        if (!callback) return
        args[args.length - 1] = function(err, result) {
          if (err) return callback(err)
          Model.authorizeRead(model, method, result, function(output) {
            var hook
            switch (method) {
              case 'delete': hook = 'afterDelete'; break
              case 'put':    hook = 'afterUpdate'; break
              case 'post':   hook = 'afterCreate'; break
            }
            if (hook) {
              executeHook(model, output, 'afterSave', function() {
                executeHook(model, output, hook, function() {
                  callback(null, output)
                })
              }) 
            } else {
              callback(null, output)
            }
          })
        }
        if (method === 'put')
          args.shift() // remove id
        var data = args[0]
        if (method === 'post' || method === 'put') {
          var authorizationContext = {}
          authorizationContext.isClient = process.domain.isAPICall === true
          authorizationContext.isServer = !authorizationContext.isClient

          for (var key in data) {
            var allow = model.allow.properties[key]
              && (model.allow.properties[key][method]
              || model.allow.properties[key].write
              || model.allow.properties[key].all
              || function() { return true })
            var deny = model.deny.properties[key]
              && (model.deny.properties[key][method]
              || model.deny.properties[key].write
              || model.deny.properties[key].all
              || function() { return false })

            if ( !model.prototype._validation[key]
              || (isRemote && model.prototype._validation[key].serverOnly)
              || !(
                (!allow || allow.call(authorizationContext, process.domain.req, model))
                  &&
                (!deny || !deny.call(authorizationContext, process.domain.req, model))
              )
            ) {
              delete data[key]
            }
          }
        }
        if (method === 'put')
          delete data.id
        if (body) {
          if (method === 'put')
            body.updateAttributes(data)
          args[0] = body
        }
        var hook
        switch (method) {
          case 'delete': hook = 'beforeDelete'; break
          case 'put':    hook = 'beforeUpdate'; break
          case 'post':   hook = 'beforeCreate'; break
        }
        if (hook) {
          executeHook(model, body, 'beforeSave', function() {
            executeHook(model, body, hook, function() {
              fn.apply(Model.api[model._type], args)
            })
          }) 
        } else {
          fn.apply(Model.api[model._type], args)
        }
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
    process.domain.isAPICall = true
    var _fn = Model.getMethodFn(method, model, true)
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

      if (!result) return res.json(null)
      res.json(Array.isArray(result) ? result.map(function(obj) {
        return obj.toJSON(false, method)
      }) : (typeof result.toJSON === 'function' ? result.toJSON() : result))
    })
  }))
}