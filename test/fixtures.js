var Arkansas = require('../')
  , Todo = require('../examples/todos/models/todo')
  , app = require('../lib/server').app
  , client = exports.client = require('supertest')(app)
  , state = exports.state = { app: null }
  
app.set('views', __dirname + '/views')

Arkansas.get('/', function(app, done) {
  app.register('todos', new Todo.Collection)
  app.todos.reset([
    new Todo({ task: 'First',  isDone: false }),
    new Todo({ task: 'Second', isDone: true })
  ])
  done.render('index')
  state.app = app.original
})