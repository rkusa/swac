var db = exports.db = {}

exports.initialize = function(Todo, opts, callback) {
  if (callback) callback()
  return {
    list: function(/*view, key, callback*/) {
      var args = Array.prototype.slice.call(arguments)
        , callback = args.pop()
      var arr = []
      Object.keys(db).forEach(function(key) {
        arr.push(db[key])
      })
      if (callback) callback(null, arr)
    },
    get: function(id, callback) {
      if (callback) callback(null, db[id])
    },
    put: function(id, props, callback) {
      var todo
      if (!(todo = db[id])) return false
      Object.keys(props).forEach(function(key) {
        if (todo.hasOwnProperty(key)) todo[key] = props[key]
      })
      if (callback) callback(null, todo)
    },
    post: function(props, callback) {
      if (!props['id']) {
        var id = 1
        while (db[id]) id++
        props['id'] = id
      }
      db[props['id']] = new Todo(props)
      db[props['id']].isNew = false
      if (callback) callback(null, db[props['id']])
    },
    delete: function(id, callback) {
      delete db[id]
      if (callback) callback()
    }
  }
}