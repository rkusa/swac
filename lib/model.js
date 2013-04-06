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
    , that = this
  this.properties.forEach(function(key) {
    values[key] = null
    // default values:
    if ('default' in that.obj.prototype._validation[key]) {
      values[key] = that.obj.prototype._validation[key].default
    } else {
      switch (that.obj.prototype._validation[key].type) {
        case 'boolean':
          values[key] = false
          break
        case 'string':
          values[key] = ''
          break
      }
    }
    Object.defineProperty(obj, key, {
      get: function get() {
        if (typeof get.caller.fragment != 'undefined' && !this._validation[key].silent)
          get.caller.fragment.observe(this, key)
        return values[key]
      },
      set: function(newValue) {
        if (values[key] === newValue) return
        this._changedValues[key] = values[key]
        if (Array.isArray(newValue)) {
          if (Array.isArray(values[key]) && typeof values[key].off === 'function')
            values[key].off('changed', this)
          if ('emit' in newValue)
            values[key] = newValue
          else 
            values[key] = Observable.Array(newValue)
          if (!this._validation[key].silent) {
            values[key].on('changed', this, 'emit', this, 'changed')
            values[key].on('changed', this, 'emit', this, 'changed.' + key)
          }
        } else {
          switch (this._validation[key].type) {
            case 'number':
              if (!isNaN(parseFloat(newValue)) && isFinite(newValue))
                newValue = parseFloat(newValue)
              break
            case 'boolean':
              if (typeof newValue === 'string' && newValue.match(/^true|false$/i))
                newValue = Boolean(newValue)
              break
          }
            
          values[key] = newValue
        }
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
      adapter = (require)('swac-' + adapter)
  } else if (adapter !== ajaxAdapter || opts.serverOnly) {
    return
  }
  utils.wait('initialize adapter for ' + this.name)
  var that = this
  api[this.name] = adapter.initialize(this.obj, opts, define, function() {
    utils.done('initialize adapter for ' + that.name)
    if (that.callback) that.callback()
  })
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
      else if (typeof that._validation[property].embedded === 'function')
        that[property] = new that._validation[property].embedded
    })

    // if provided, apply values
    if (properties) {
      Object.keys(properties).forEach(function(property) {
        if (that.hasOwnProperty(property)) {
          if (typeof that._validation[property].embedded === 'function')
            that[property] = new that._validation[property].embedded(properties[property])
          else
            that[property] = properties[property]
        }
      })
    }
  }

  definition = new Definition(name, model, opts || {}, callback)
  Object.defineProperty(model, '_definition', {
    value: definition
  })
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

  model.prototype.toJSON = function(all, method, isAPICall) {
    if (!all && (definition.opts.serverOnly && isAPICall === true))
      return null

    var that = this
      , json = {}
    
    var authorizationContext = {}
    authorizationContext.isClient = utils.isBrowser ? true : (isAPICall === true)
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

  model.prototype.save = function(onSuccess, onError) {
    var that = this
    var callback = function(err, res) {
      if (err) {
        if (onError) return onError(err)
        else throw new Error(err.message)
      }
      if (onSuccess) onSuccess(res)
    }
    this.isNew ? model.post(this, callback) : model.put(this.id, this, callback)
  }

  model.prototype.destroy = function(onSuccess, onError) {
    var that = this
      , cb = function(err) {
        if (err) {
          if (onError) return onError(err)
          else throw new Error(err.message)
        }
        utils.debug('[Model] "%s" got destroyed', name)
        that.emit('destroy')
        if (onSuccess) onSuccess()
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
      that.emit('errors.changed.' + err.property)
    })
    Object.keys(old).forEach(function(key) {
      if (!(key in that.$errors))
        that.emit('errors.changed.' + key)
    })
    return validation.valid
  }
  
  model.prototype.errorFor = function errorFor(key) {
    if (typeof errorFor.caller.fragment != 'undefined' && !this._validation[key].silent)
      errorFor.caller.fragment.observeError(this, key)
    return this.$errors[key] ? this.$errors[key].message : ''
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

function authorize(model, method, allowFn, denyFn, allowed, denied, isAPICall) {
  var authorizationContext = {}
  authorizationContext.isClient = isAPICall === true
  authorizationContext.isServer = !authorizationContext.isClient

  return function() {
    var args = Array.prototype.slice.call(arguments)
      , count = 2
      , allow, deny

    var callback = function() {
      if (--count !== 0) return
      if (allow && !deny) allowed.apply(null, args)
      else denied.apply(null, args)
    }

    if (typeof (allow = allowFn.apply(authorizationContext, [process.domain.req].concat(args, function(res) {
      process.nextTick(function() {
        allow = res
        callback()
      })
    }))) !== 'undefined') callback()
      
    if (typeof (deny = denyFn.apply(authorizationContext, [process.domain.req].concat(args, function(res) {
      process.nextTick(function() {
        deny = res
        callback()
      })
    }))) !== 'undefined') callback()
  }
}

// generic API Method
Model.getMethodFn = function(method, model, isAPICall) {
  if (isAPICall === undefined) isAPICall = false
  return function() {
    // initialize parameters
    var args = Array.prototype.slice.call(arguments)
    
    if (!(model._type in Model.api))
      throw new Error('API for ' + model._type + ' not defined')

    // if Client-Side: Execute DB (AJAX) Adapter
    if (utils.isClient)
      return Model.api[model._type][method].apply(Model.api[model._type], args)

    var callback = args.pop()
      , isRead   = method === 'get' || method === 'list'
      , isWrite  = !isRead
      , id
      
    // else Server-Side (Authorization required)
    utils
    // Fetch Document(s)
    .chain(function(done) {
      var input = args[0]

      // Not neccessary for post requests
      if (method === 'post') {
        var instance = new model
        if ('id' in input) instance.id = input.id
        return done(input, instance)
      }
    
      // Not neccessary if the input is already an appropriated instance
      if (isWrite && input instanceof model) {
        // Per-Property && Server-Side!?
        // return done(input, input)
        id = input.id
      }

      // `get`, `delete` will and `put` could have the id
      // as the first argument
      if (typeof input !== 'object') {
        id = input
        // if `put` got called with an id, the second argument
        // is the object containing the changes
        if (method === 'put')
          input = args[1]
      }

      // request the database using the model's adapter
      if (method === 'list') {
        Model.api[model._type].list.apply(
          Model.api[model._type],
          args.concat(function(err, rows) {
            if (err) throw err
            done(input, rows)
          })
        )
      } else {
        Model.api[model._type].get(id, function(err, row) {
          if (err) throw err
          done(input, row)
        })
      }
    })
    // Authorize Write
    .chain(function (input, instance, done) {
      // Not neccessary for read requests
      if (isRead) return done(instance)
      if (method !== 'delete' && typeof input !== 'object')
        return done(instance)

      var data = input instanceof model ? input.toJSON(false, undefined, isAPICall) : input
      if (method === 'put')
        delete data.id

      if (!(input instanceof model))
        input = method === 'post' ? new model(input) : instance

      // the appropriated allow and deny method
      var allow = model.allow.instance[method] || model.allow.instance.write
        || model.allow.instance.all || function() { return true }
      var deny = model.deny.instance[method] || model.deny.instance.write
        || model.deny.instance.all || function() { return false }
      
      authorize(model, method, allow, deny,
        //allowed
        function() {
          utils
          // Per-Property Authorization
          .chain(function(done) {
            // not neccessary for `delete` requests
            if (method === 'delete') {
              input = instance
              return done()
            }

            // iterate properties
            utils.series(Object.keys(data), function(key, next) {
              // the appropriated allow and deny method
              var allow = model.allow.properties[key]
                && (model.allow.properties[key][method]
                || model.allow.properties[key].write
                || model.allow.properties[key].all)
                || function() { return true }
              var deny = model.deny.properties[key]
                && (model.deny.properties[key][method]
                || model.deny.properties[key].write
                || model.deny.properties[key].all)
                || function() { return false }

              if (
                // model does not have such a property
                !model.prototype._validation[key] ||
                // is serverOnly Property and got accessed through the Web Service
                (isAPICall === true && model.prototype._validation[key].serverOnly)
              ) {
                delete data[key]
                return next()
              }

              // authorize property
              authorize(model, method, allow, deny,
                // allowed
                next,
                // denied
                function() {
                  data[key] = instance[key]
                  next()
                }
              )(method === 'post' ? input : instance, data[key], key)
            }, done)
          })
          // Hooks
          .chain(function(done) {
            if (method !== 'delete') {
              input.updateAttributes(data)
              input.isNew = false
            }

            utils
            // Before Hooks
            .chain(function(done) {
              var hook
              switch (method) {
                case 'delete': hook = 'beforeDelete'; break
                case 'put':    hook = 'beforeUpdate'; break
                case 'post':   hook = 'beforeCreate'; break
              }
              if (!hook) return done()
              executeHook(model, input, 'beforeSave', function(err) {
                if (err) return callback({ message: 'Bad Request', status: 400, body: {
                  error: 'Save Rejected',
                  details: err
                } })
                executeHook(model, input, hook, function(err) {
                  if (err) return callback({ message: 'Bad Request', status: 400, body: {
                    error: method.charAt(0).toUpperCase() + method.slice(1) + ' Rejected',
                    details: err
                  } })
                  done()
                })
              }) 
            })
            // Validation
            .chain(function(done) {
              if (method === 'delete') return done()
              if (!input.validate()) {
                if (callback)
                  callback({ message: 'Bad Request', status: 400, body: {
                    error: 'Validation Error',
                    details: input.$errors
                  } })
              } else {
                done()
              }
            })
            // Execute Write
            .chain(function(done) {
              Model.api[model._type][method](input, done)
            })
            // After Hooks
            .chain(function() {
              var hook
              switch (method) {
                case 'delete': hook = 'afterDelete'; break
                case 'put':    hook = 'afterUpdate'; break
                case 'post':   hook = 'afterCreate'; break
              }
              if (!hook) return done(input)
              executeHook(model, input, 'afterSave', function() {
                executeHook(model, input, hook, function() {
                  done(input)
                })
              })
            })
          })
          // continue
          .chain(done)
        },
        // denied
        function() {
          if (callback) callback({ message: 'Forbidden', status: 403 })
        },
        isAPICall
      )(method === 'post' ? input : instance)
    })
    // Authorize Read
    .chain(function(rows) {
      if (rows === null) return callback(null, null)
      if (!callback) return
      if (isWrite) return callback(null, rows)

      // the appropriated allow and deny method
      var allow = model.allow.instance[method] || model.allow.instance.read
        || model.allow.instance.all || function() { return true }
      var deny = model.deny.instance[method] || model.deny.instance.read
        || model.deny.instance.all || function() { return false }

      var input = Array.isArray(rows) ? rows : [rows]
        , output = []
      // authorize every row
      utils.series(input, function(row, next) {
        authorize(model, method, allow, deny,
          // allowed
          function() {
            output.push(row)
            next()
          },
          // denied
          next
        )(row)
      }, function() {
        callback(null, Array.isArray(rows) ? output : (output[0] || null))
      })
    })
  }
}

Observable = require('./observable')

function defineApi(model, method, opts) {
  if (!exports.server) return
  var express = exports.server.app
    , path = '/_api/' + model._type.toLowerCase()
  if (method !== 'post' && method !== 'list') path += '/:id'
  var scope = []
  if (opts.scope) {
    var scope = exports.server.scope[opts.scope]
  }
  utils.ready(function() {
    express[method === 'list' ? 'get' : method].apply(express,
    [path].concat(scope || [], function(req, res) {
      var _fn = Model.getMethodFn(method, model, true)
      if (method === 'get' || method === 'put' || method === 'delete') 
        _fn = _fn.bind(_fn, req.params.id)
      if (method === 'put' || method === 'post')
        _fn = _fn.bind(_fn, req.body)
      else if (method === 'list')
        _fn = _fn.bind(_fn, req.query.view, req.query.key ? decodeURIComponent(req.query.key) : undefined)
      _fn(function(err, result) {
        if (err) {
          if (!err.status) throw err
          if (!err.body) res.send(err.status)
          else res.send(err.status, err.body)
          return
        }

        if (!result) return res.json(null)
        res.json(Array.isArray(result) ? result.map(function(obj) {
          return obj.toJSON(false, method)
        }) : (typeof result.toJSON === 'function' ? result.toJSON() : result))
      })
    }))
  })
}