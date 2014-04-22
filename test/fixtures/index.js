var swac = require('../../')
  , odm = require('swac-odm')
  , domain = require('domain')
  , server = exports.server = require('../../lib/server')
  , state = exports.state = { app: null }
  , routing = require('../../lib/routing')
  , adapter = require('./mock-adapter')
  , express = require('express')
  , app = express()
  , client = exports.client = require('supertest')(app)

var d = domain.create()
d.req = {}

exports.domainify = function(fn) {
  return function(done) {
    d.run(fn.bind(null, done))
  }
}

app.use(require('body-parser')())
app.use(server.middleware('/', { views: __dirname + '/views' }))

swac.get  = routing.get
swac.post = routing.post
swac.put = routing.put
swac.delete = routing.delete

swac.get('/', function(app, done) {
  app.register('todos', new Todo.Collection)
  app.todos.reset([
    new Todo({ task: 'First',  isDone: false }),
    new Todo({ task: 'Second', isDone: true })
  ])
  done.render('index')
  state.app = app.original
})

var Todo = exports.Todo = odm.Model.define('Todo', function() {
  this.use(adapter)
  this.property('task', { type: 'string', minLength: 1 })
  this.property('isDone', { type: 'boolean' })
  this.property('category')
})

exports.Todo.Collection = odm.Collection.define('Todos', Todo, function() {
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

exports.db = adapter.db