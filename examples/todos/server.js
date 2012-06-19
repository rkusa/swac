var arkansas = require('arkansas/server')
  , app = arkansas.app
  , express = arkansas.express
  , http = require('http')
  , nano = require('nano')('http://localhost:5984')
  , db = nano.db.use('arkansas')

app.configure(function() {
  app.set('port', process.env.PORT || 3000)
  app.set('views', __dirname + '/views')
  app.use(express.favicon())
  app.use(express.logger('dev'))
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(require('less-middleware')({ src: __dirname + '/public' }))
  app.use(express.static(__dirname + '/public'))
})

app.configure('development', function() {
  app.use(express.errorHandler())
})

arkansas.init(__dirname + '/app')

// API
var Todo = require('./models/todo')

Todo.list = function(callback) {
  db.view('todos', 'all', function(err, body) {
    if (err) throw err
    var todos = []
    body.rows.forEach(function(row) {
      var todo = new Todo(row.value)
      todo.isNew = false
      todos.push(todo)
    })
    if (callback) callback(todos)
  })
}
Todo.get = function(id, callback) {
  db.get(id, function(err, body) {
    if (err) throw err
    var todo = new Todo(body)
    todo.isNew = false
    if (callback) callback(todo)
  })
}
Todo.put = function(id, props, callback) {
  db.get(id, function(err, body) {
    var todo = new Todo(body)
    todo.isNew = false
    Object.keys(props).forEach(function(key) {
      if (todo.hasOwnProperty(key)) todo[key] = props[key]
    })
    todo._rev = body._rev
    db.insert(todo, todo._id, function(err) {
      if (err) throw err
      if (callback) callback(todo)
    })
  })
}
Todo.post = function(props, callback) {
  if (props instanceof Todo) {
    var todo = props
    props = {}
    Object.keys(todo).forEach(function(key) {
      props[key] = todo[key]
    })
  }
  props.type = 'Todo'
  if (!props._id) delete props._id
  db.insert(props, props._id, function(err, body) {
    if (err) throw err
    var todo = new Todo(props)
    todo._id = body.id
    todo.isNew = false
    if (callback) callback(todo)
  })
}
Todo.delete = function(id, callback) {
  db.get(id, function(err, body) {
    if (err) throw err

    db.destroy(id, body._rev, function(err) {
      if (err) throw err
      if (callback) callback()
    })
  })
}

var server = module.exports = http.createServer(app)

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'))
})