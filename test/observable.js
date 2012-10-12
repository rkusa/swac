var Observable = require('../lib/observable')
  , utils = require('../lib/utils')
  , Model = require('../lib/model')
  , Todo = require('./fixtures').Todo
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
  var items
  before(function() {
    items = Observable.Array(Item).groupBy('type')
  })
  it('.add()', function() {
    items.add(new Item({ _id: 1, type: 'a' }))
    items.add(new Item({ _id: 2, type: 'a' }))
    items.add(new Item({ _id: 3, type: 'b' }))
    items.should.have.lengthOf(2)
    items[0].should.have.property('collection')
    items[0].should.have.property('_id', 'a')
    items[0].collection.should.have.lengthOf(2)
    items[1].collection.should.have.lengthOf(1)
  })
  var a, b
  it('.find()', function() {
    a = items.find(1)
    b = items.find(3)
    a.should.be.instanceOf(Item)
    b.should.be.instanceOf(Item)
  })
  it('.remove', function() {
    items.remove(b)
    items.should.have.lengthOf(1)
  })
  it('change pivot', function() {
    a.type = 'c'
    items.should.have.lengthOf(2)
    items[0].collection.should.have.lengthOf(1)
  })
})