var API = function(model) {
  this.model = model
}

API.prototype.request = function(/*method, obj, success */) {
  // retrieve arguments
  var args    = Array.prototype.slice.call(arguments)
    , method  = args.shift()
    , success = args.pop()
    , obj, view, key, id
  if (method === 'list') {
    view = args.shift()
    key  = args.shift()
  } else if (method === 'get') {
    id   = args.shift()
  } else {
    obj  = args.shift()
    id   = obj.id
  }

  // build ajax request
  var params = {
    type:     method === 'list' ? 'get' : method,
    dataType: 'json',
    url:      '/_api/' + this.model._type.toLowerCase(),
    success:  function(data) { success(null, data) },
    error:    function(xhr)  { success({ status: xhr.status, message: xhr.statusText }, null)}
  }

  // compose url
  if (method === 'list') {
    if (view) {
      params.url += '?view=' + view
      if (key) params.url += '&key=' + key
    }
  }
  else if (method != 'post') {
    params.url += '/' + encodeURIComponent(id)
  }

  // add data
  if (method == 'post' || method == 'put') {
    params.contentType = 'application/json'
    params.data = JSON.stringify(obj instanceof this.model ? obj.toJSON() : obj)
  }

  // Fire in the hole
  $.ajax(params)
}

API.prototype.createModel = function(data) {
  var instance = new this.model(data)
  instance.isNew = false
  return instance
}

API.prototype.mergeModel = function(instance, data) {
  Object.keys(data).forEach(function(key) {
    if (instance.hasOwnProperty(key) && instance[key] !== data[key])
      instance[key] = data[key]
  })
}

API.prototype.get = function(id, callback) {
  var that = this
  this.request('get', id, function(err, data) {
    if (err) return callback(err, null)
    callback(null, that.createModel(data))
  })
}

API.prototype.list = function(/* view, key, callback */) {
  var that = this
    , args = Array.prototype.slice.call(arguments)
    , callback = args.pop()
  this.request.apply(this, ['list'].concat(args, function(err, data) {
    if (err) return callback(err, null)
    if (!data || !Array.isArray(data)) return callback(null, data || null)
    callback(null, data.map(function(row) {
      return that.createModel(row)
    }))
  }))
}

API.prototype.put = function(instance, callback) {
  var that = this
  this.request('put', instance, function(err, data) {
    if (err) return callback(err, null)
    that.mergeModel(instance, data)
    instance.isNew = false
    callback(null, instance)
  })
}

API.prototype.post = function(instance, callback) {
  var that = this
  this.request('post', instance, function(err, data) {
    if (err) return callback(err, null)
    if (!(instance instanceof that.model))
      instance = new model(instance)
    that.mergeModel(instance, data)
    that.isNew = false
    callback(null, instance)
  })
}

API.prototype.delete = function(instance, callback) {
  this.request('delete', instance, function(err, data) {
    if (err) return callback(err, null)
    callback(null)
  })
}

exports.initialize = function(model, opts, callback) {
  var api = new API(model)
  return api
}