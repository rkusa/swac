var Todo = require('../examples/todos/models/todo')
  , Todos = require('../examples/todos/collections/todos')
  , should = require('should')

describe('Collection', function() {
  var todos
  before(function() {
    todos = new Todos(Todo)
  })
  describe('.add()', function() {
    var todo
    before(function() {
      todo = new Todo
    })
    it('should add the provided models to the internal collection', function() {
      var todo = new Todo
      todos.add(todo)
      todos._collection[0].should.eql(todo)
    })
    it('should only accept the defined model type')
    it('should trigger the changed event', function(done) {
      todos.on('changed', function callback() {
        todos.removeListener('changed', callback)
        done()
      })
      todos.add(new Todo)
    })
    it('should trigger the add event', function(done) {
      todos.on('add', function callback() {
        todos.removeListener('add', callback)
        done()
      })
      todos.add(new Todo)
    })
  })
  describe('.remove()', function() {
    it('should remove the provided models from the internal collection', function() {
      var todo = todos._collection[0]
      todo.should.be.instanceOf(Todo)
      todos.remove(todo)
      todo.should.not.eql(todos._collection[0])
    })
    it('should be triggered if a contained model got destroyed', function() {
      var todo = new Todo
      todos.add(todo)
      var pos = todos._collection.length - 1
      todo.should.eql(todos._collection[pos])
      todo.destroy()
      should.not.exist(todos._collection[pos])
    })
    it('should trigger the changed event', function(done) {
      todos.on('changed', function callback() {
        todos.removeListener('changed', callback)
        done()
      })
      todos.remove(todos._collection[0])
    })
  })
  describe('.get()', function() {
    it('should return the appropriated model')
  })
  describe('.reset()', function() {
    it('should add the provided models to the internal collection')
  })
})