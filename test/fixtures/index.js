var swac = require('../../')
  , domain = require('domain')
  , server = exports.server = require('../../lib/server')
  , app = server.app
  , client = exports.client = require('supertest')(app)
  , state = exports.state = { app: null }
  , routing = require('../../lib/routing')
  , Model = require('../../lib/model')
  , adapter = exports.adapter = require('./mock-adapter')

var d = domain.create()
d.req = {}

exports.domainify = function(fn) {
  return function(done) {
    d.run(fn.bind(null, done))
  }
}

app.set('views', __dirname + '/views')
app.use(server.express.bodyParser())
app.use(server.middleware('/'))

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

var Todo = exports.Todo = swac.Model.define('Todo', function() {
  this.use(adapter)
  this.property('task', { type: 'string', minLength: 1 })
  this.property('isDone', { type: 'boolean' })
  this.property('category')
})

exports.Todo.Collection = swac.Collection.define('Todos', Todo, function() {
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