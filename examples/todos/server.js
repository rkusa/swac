var arkansas = require('arkansas/server')
  , app = arkansas.app
  , express = arkansas.express
  , http = require('http')

arkansas.init(__dirname + '/app')

app.configure(function() {
  app.set('port', process.env.PORT || 3000)
  app.set('views', __dirname + '/views')
  app.use(express.logger('dev'))
  app.use(require('less-middleware')({ src: __dirname + '/public' }))
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(app.router)
  app.use(express.static(__dirname + '/public'))
})

app.configure('development', function() {
  app.use(express.errorHandler())
})

// API
var Todo = require('./models/todo')
  , db = {}

Todo.list = function() {
  var arr = []
  Object.keys(db).forEach(function(key) {
    arr.push(db[key])
  })
  return arr
}
Todo.get = function(id) {
  return db[id]
}
Todo.put = function(id, props) {
  var todo
  if (!(todo = db[id])) return false
  Object.keys(props).forEach(function(key) {
    if (todo.hasOwnProperty(key)) todo[key] = props[key]
  })
  return todo
}
Todo.post = function(props) {
  var id = 1
  while (db[id]) id++
  props['id'] = id
  db[id] = new Todo(props)
  return db[id]
}
Todo.delete = function(id) {
  delete db[id]
  return true
}

var server = module.exports = http.createServer(app)

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'))
})