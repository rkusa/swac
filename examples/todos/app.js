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
  $('#todo-list li').on('dblclick', function() {
    $(this).addClass('editing')
  })
})

root.post('/todos/new', function(app, done, params, body) {
  console.log('/todos/new')

  var todo = new Todo({
    todo: body.todo,
    isDone: false
  })
  todo.save()
  app.todos.add(todo)

  done.redirect('/')
}, { silent: true })

root.post('/todos/:id/edit', function(app, done, params, body) {
  console.log('/todos/' + params.id + '/edit')

  var search = app.todos._collection.filter(function(model) {
    return model.id == params.id
  })

  if (search.length > 0) {
    var model = search[0]
    model.todo = body.todo
    model.save()
  }

  done.redirect('/')
}, function(app, params) {
  $('#todo-' + params.id).removeClass('editing')
})

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