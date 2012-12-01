var Arkansas = require('../../')
  , server = exports.server = require('../../lib/server')
  , app = server.app
  , client = exports.client = require('supertest')(app)
  , state = exports.state = { app: null }
  , routing = require('../../lib/routing')
  
app.set('views', __dirname + '/views')

Arkansas.get  = routing.get
Arkansas.post = routing.post
Arkansas.put = routing.put
Arkansas.delete = routing.delete

Arkansas.get('/', function(app, done) {
  app.register('todos', new Todo.Collection)
  app.todos.reset([
    new Todo({ task: 'First',  isDone: false }),
    new Todo({ task: 'Second', isDone: true })
  ])
  done.render('index')
  state.app = app.original
})

var Todo = exports.Todo = Arkansas.Model.define('Todo', function() {
  this.property('task', { type: 'string', minLength: 1 })
  this.property('isDone', { type: 'boolean' })
})

exports.Todo.Collection = Arkansas.Collection.define('Todos', Todo, function() {
  this.property('left', function() {
    var count = 0
    this.forEach(function(todo) {
      if (!todo.isDone) ++count
    })
    return count
  })
  this.property('completed', function() {
    var count = 0
    this.forEach(function(todo) {
      if (todo.isDone) ++count
    })
    return count
  })
  this.property('done', function() {
    var done = true
    this.forEach(function(todo) {
      if (!todo.isDone) done = false
    })
    return done
  })
})

var db = exports.db = {}

Todo.list = function(/*view, key, callback*/) {
  var args = Array.prototype.slice.call(arguments)
    , callback = args.pop()
  var arr = []
  Object.keys(db).forEach(function(key) {
    arr.push(db[key])
  })
  if (callback) callback(null, arr)
}
Todo.get = function(id, callback) {
  if (callback) callback(null, db[id])
}
Todo.put = function(id, props, callback) {
  var todo
  if (!(todo = db[id])) return false
  Object.keys(props).forEach(function(key) {
    if (todo.hasOwnProperty(key)) todo[key] = props[key]
  })
  if (callback) callback(null, todo)
}
Todo.post = function(props, callback) {
  if (!props['_id']) {
    var id = 1
    while (db[id]) id++
    props['_id'] = id
  }
  db[props['_id']] = new Todo(props)
  db[props['_id']].isNew = false
  if (callback) callback(null, db[props['_id']])
}
Todo.delete = function(id, callback) {
  delete db[id]
  if (callback) callback()
}