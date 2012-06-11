var arkansas = require('arkansas/server')
  , app = arkansas.app
  , express = arkansas.express
  , http = require('http')

app.configure(function() {
  app.set('port', process.env.PORT || 3000)
  app.set('views', __dirname + '/views')
  app.use(express.favicon())
  app.use(express.logger('dev'))
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(app.router)
  app.use(require('less-middleware')({ src: __dirname + '/public' }))
  app.use(express.static(__dirname + '/public'))
})

app.configure('development', function() {
  app.use(express.errorHandler())
})

arkansas.init(__dirname + '/app')

// API
var Todo = require('./models/todo')
  , db = {}

Todo.list = function(callback) {
  var arr = []
  Object.keys(db).forEach(function(key) {
    arr.push(db[key])
  })
  if (callback) callback(arr)
}
Todo.get = function(id, callback) {
  if (callback) callback(db[id])
}
Todo.put = function(id, props, callback) {
  var todo
  if (!(todo = db[id])) return false
  Object.keys(props).forEach(function(key) {
    if (todo.hasOwnProperty(key)) todo[key] = props[key]
  })
  if (callback) callback(todo)
}
Todo.post = function(props, callback) {
  if (!props['id']) {
    var id = 1
    while (db[id]) id++
    props['id'] = id
  }
  db[props['id']] = new Todo(props)
  db[props['id']].isNew = false
  if (callback) callback(db[props['id']])
}
Todo.delete = function(id, callback) {
  delete db[id]
  if (callback) callback()
}

// Bootstrap
var todos = ["Tu dies", "Tu das"]
todos.forEach(function(todo) {
  var model = new Todo({
    todo: todo,
    isDone: false
  })
  model.create()
})

var server = module.exports = http.createServer(app)
module.exports.db = db

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'))
})