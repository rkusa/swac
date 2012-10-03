var Arkansas = require('arkansas')
  , Todo     = require('./models/todo')
  , Todos    = Todo.Collection
  , get      = Arkansas.get
  , post     = Arkansas.post
  , root

get('/example', function(app, done) {
  done.render('example')
})

root = get('/:condition?', function(app, done, params) {
  console.log('/' + (params.condition || ''))

  app.register('todos', new Todos)
  app.condition = params.condition
  Todo.list(function(todos) {
    app.todos.reset(todos.filter(function(todo) {
      return !params.condition
          || (todo.isDone && params.condition === 'completed')
          || (!todo.isDone && params.condition === 'active')
    }))
    done.render('index')
  })
}, function(app) {
  $('#todo-list').on('dblclick', 'li', function() {
    $(this).addClass('editing')
  })
})

root.post('/todos/new', function(app, done, params, body) {
  console.log('/todos/new')

  var todo = new Todo({
    task: body.task,
    isDone: false
  })
  todo.save(function(body) {
    todo._id = body._id
    app.todos.push(todo)
    done.redirect('/')
  })
}, function() {
  $('#new-todo').val('')
})

root.post('/todos/:id/edit', function(app, done, params, body) {
  console.log('/todos/' + params.id + '/edit')

  var model = app.todos.find(params.id)
  if (model) {
    model.task = body.task
    model.save(function() {
      done.redirect('/')
    })
  } else done.redirect('/')
}, function(app, params) {
  $('#todo-' + params.id).removeClass('editing')
})

root.get('/todos/:id/toggle', function(app, done, params) {
  console.log('/todos/' + params.id + '/toggle')

  var model = app.todos.find(params.id)
  if (model) {
    model.isDone = !model.isDone
    model.save(function() {
      done.redirect('/', { silent: true })
    })
  } else done.redirect('/', { silent: true })
})

root.get('/todos/toggle-all', function(app, done) {
  var left = app.todos.filter(function(todo) {
    return !todo.isDone
  })
  var count = left.length
  left.forEach(function(todo) {
    todo.isDone = true
    todo.save(function() {
      if (--count == 0) done.redirect('/')
    })
  })
})

root.get('/todos/clear/completed', function(app, done) {
  var completed = app.todos.filter(function(todo) {
    return todo.isDone
  })
  var count = completed.length
  completed.forEach(function(todo) {
    todo.destroy(function() {
      if (--count === 0) done.redirect('/')
    })
  })
})

root.get('/todos/:id/delete', function(app, done, params) {
  console.log('/todos/' + params.id + '/delete')

  var model = app.todos.find(params.id)
  if (!model) return done.redirect('/', { silent: true })
  model.destroy(function() {
    done.redirect('/', { silent: true })
  })
})