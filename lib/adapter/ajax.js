function request(/*method, model, id, props, success */) {
  var args = Array.prototype.slice.call(arguments)
    , model = args.shift()
    , method = args.shift()
    , success = args.pop()
    , id = args.shift()
    , props = args.length === 0 && typeof id === 'object' ? id : args.shift()
    , params = { type: method === 'list' ? 'get' : method, dataType: 'json' }
  params.url = '/_api/' + model._type.toLowerCase()
  if (method === 'delete')
    id = id.id
  if (method === 'list') {
    if (id) {
      params.url += '?view=' + id
      if (props) params.url += '&key=' + props
    }
  }
  else if (method != 'post') params.url += '/' + encodeURIComponent(id)
  if (method == 'post' || method == 'put') {
    params.contentType = 'application/json'
    params.data = JSON.stringify(props)
  }
  params.success = function(data) {
    if (data === null)
      return success(null, null)

    switch(method) {
      case 'list':
        var rows = []
        data.forEach(function(props) {
          var row = new model(props)
          row.isNew = false
          rows.push(row)
        })
        success(null, rows)
        break
      case 'get':
        var row = new model(data)
        row.isNew = false
        success(null, row)
        break
      case 'post':
        if (!(props instanceof model))
          props = new model(data)
        props.id = data.id
        props.isNew = false
        success(null, props)
        break
      case 'put':
        success(null, props)
        break
      default:
        success(null)
    }
  }
  $.ajax(params)
}

exports.initialize = function(model, opts, callback) {
  var api = {}
  ;['list', 'get', 'post', 'put', 'delete'].forEach(function(method) {
    api[method] = request.bind(null, model, method)
  })
  return api
}