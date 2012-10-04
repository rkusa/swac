var Observable = require('../lib/observable')
  , utils = require('../lib/utils')
  , Model = require('../lib/model')
  , Todo = require('../examples/todos/models/todo')
  , should = require('should')

describe('Array', function() {
  var todos
  before(function() {
    todos = Observable.Array(Todo)
  })
  describe('.add()', function() {
    var todo
    before(function() {
      todo = new Todo
    })
    it('should add the provided models to the internal collection', function() {
      var todo = new Todo
      todos.add(todo)
      todos[0].should.eql(todo)
    })
    it('should only accept the defined model type')
    it('should trigger the changed event', function(done) {
      todos.on('changed', function callback() {
        todos.off('changed', callback)
        done()
      })
      todos.add(new Todo)
    })
    it('should trigger the add event', function(done) {
      todos.once('added', function callback() {
        done()
      })
      todos.add(new Todo)
    })
  })
  describe('.remove()', function() {
    it('should be triggered if a contained model got destroyed', function() {
      var todo = new Todo
      todos.add(todo)
      var pos = todos.length - 1
      todo.should.eql(todos[pos])
      todo.destroy()
      should.not.exist(todos[pos])
    })
    it('should trigger the changed event', function(done) {
      todos.once('changed', function callback() {
        done()
      })
      todos.remove(todos[0])
    })
    it('should remove all events from model', function() {
      var todo = new Todo
      todos.add(todo)
      todos.remove(todo)
      
      Object.keys(todo.events).forEach(function(i) {
        todo.events[i].should.have.lengthOf(0)
      })
    })
  })
  describe('.get()', function() {
    it('should track item\'s #_id property', function() {
      var todo = new Todo
      todo.should.have.property('_id', null)
      todos.add(todo)
      todo._id = 10
      todos.find(10).should.equal(todo)
      todo._id = 11
      should.strictEqual(todos.find(10), undefined)
      todos.find(11).should.equal(todo)
    })
    it('should return the appropriated model')
  })
  describe('.reset()', function() {
    it('should add the provided models to the internal collection')
  })
})

describe('Grouped Array', function() {
  var Item = Model.define('Item', function() {
    this.property('type')
  })
})