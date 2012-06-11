var Arkansas = require('arkansas')
  , Todo     = require('./models/todo')
  , Todos    = require('./collections/todos')
  , get      = Arkansas.get
  , post     = Arkansas.post
  , root

root = get('/', function(app, done) {
  console.log('/')

  app.register('todos', new Todos(Todo))
	Todo.list(function(todos) {
    app.todos.reset(todos)
    done()
  })
}, function(app) {
  // $('#new-todo').on('keypress', function(e) {
  //   if (e.keyCode == 13) app.todos.add(new Todo({ todo: $(this).val(), isDone: false }))
  // })
})

root.post('/todos/new', function(app, done, params, body) {
  console.log('/todos/new')

  var todo = new Todo({
    id: 1,
    todo: body.todo,
    isDone: false
  })
  todo.create()
  app.todos.add(todo)

  done.redirect('/')
}, { silent: true })

root.get('/todos/:id/delete', function(app, done, params) {
  console.log('/todos/' + params.id + '/delete')

  var search = app.todos._collection.filter(function(model) {
    return model.id == params.id
  })

  if (search.length > 0) {
    var model = search[0]
    model.destroy()
  }

  done.redirect('/')
}, { silent: true })