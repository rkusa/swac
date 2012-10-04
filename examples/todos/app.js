var Arkansas = require('arkansas')
  , Todo     = require('./models/todo')
  , Todos    = Todo.Collection
  , State    = require('./models/state')
  , get      = Arkansas.get
  , post     = Arkansas.post
  , root

get('/example', function(app, done) {
  done.render('example')
})

root = get('/:condition?', function(app, done, params) {
  console.log('/' + (params.condition || ''))

  app.register('todos', new Todos)
  app.register('state', new State)
  app.state.condition = params.condition
  
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
    if (app.state.condition === 'active')
      app.todos.push(todo)
    done.redirect('/', { silent: true })
  })
}, function() {
  $('#new-todo').val('')
})

root.post('/todos/:id/edit', function(app, done, params, body) {
  console.log('/todos/' + params.id + '/edit')

  var model = app.todos.find(params.id)
  if (!model) done.redirect('/', { silent: true })
  model.task = body.task
  model.save(function() {
    done.redirect('/', { silent: true })
  })
}, function(app, params) {
  $('#todo-' + params.id).removeClass('editing')
})

root.get('/todos/:id/toggle', function(app, done, params) {
  console.log('/todos/' + params.id + '/toggle')

  var model = app.todos.find(params.id)
  if (!model) return done.redirect('/', { silent: true })
  model.isDone = !model.isDone
  if (app.state.condition)
    app.todos.remove(model)
  model.save(function() {
    done.redirect('/', { silent: true })
  })
})

root.get('/todos/toggle-all', function(app, done) {
  console.log('/todos/toggle-all')
  
  var toggleTo = true
    , left = app.todos.filter(function(todo) {
    return !todo.isDone
  })
  if (left.length === 0) {
    left = app.todos
    toggleTo = false
  }
  var count = left.length
  left.forEach(function(todo) {
    todo.isDone = toggleTo
    if (app.state.condition === 'active' && todo.isDone
     || app.state.condition === 'completed' && !todo.isDone)
      app.todos.remove(todo)
    todo.save(function() {
      if (--count == 0) done.redirect('/', { silent: true })
    })
  })
})

root.get('/todos/clear/completed', function(app, done) {
  console.log('/todos/toggle-all')
  
  var completed = app.todos.filter(function(todo) {
    return todo.isDone
  })
  var count = completed.length
  completed.forEach(function(todo) {
    todo.destroy(function() {
      if (--count === 0) done.redirect('/', { silent: true })
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