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
    put: function(todo, callback) {
      if (!todo) return false
      db[todo.id] = todo
      if (callback) callback(null, todo)
    },
    post: function(instance, callback) {
      if (!instance.id) {
        var id = 1
        while (db[id]) id++
        instance.id = id
      }
      db[instance.id] = instance instanceof Todo ? instance : new Todo(instance)
      db[instance.id].isNew = false
      if (callback) callback(null, db[instance.id])
    },
    delete: function(instance, callback) {
      delete db[typeof instance === 'object' ? instance.id : instance]
      if (callback) callback()
    }
  }
}