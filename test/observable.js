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
  describe('Sort', function() {
    var cmp = function(lhs, rhs) {
      return lhs - rhs
    }
    it('should sort on first call', function() {
      var arr1 = [5, 7, 9, 2, 12, 42, 1]
        , arr2 = Observable.Array(arr1.slice())
      arr1.sort(cmp)
      arr2.sort(cmp)
      arr2.should.have.lengthOf(7)
      for (var i = 0; i < 7; ++i)
        arr1[i].should.equal(arr2[i])
    })
    describe('should insert new elements appropriately', function() {
      var arr = Observable.Array([5, 7, 9, 2, 12, 42, 1])
      arr.sort(cmp)
      it('on #push()', function() {
        arr.push(10)
        arr.should.have.lengthOf(8)
        arr.indexOf(10).should.equal(5)
      })
      it('on #unshift()', function() {
        arr.unshift(6)
        arr.should.have.lengthOf(9)
        arr.indexOf(6).should.equal(3)
      })
      it('on #splice()', function() {
        arr.splice(1, 1, 41)
        arr.should.have.lengthOf(9)
        arr.indexOf(41).should.equal(7)
      })
    })
    describe('should break insertion-sort appropriately', function() {
      it('on #reverse()', function() {
        var arr = Observable.Array([5, 7, 9, 2, 12, 42, 1])
        arr.sort(cmp)
        arr.reverse()
        should.not.exist(arr.compareFunction)
      })
      it('on #reset()', function() {
        var arr = Observable.Array([5, 7, 9, 2, 12, 42, 1])
        arr.sort(cmp)
        arr.reset()
        should.not.exist(arr.compareFunction)
      })
      it('on #unsort()', function() {
        var arr = Observable.Array([5, 7, 9, 2, 12, 42, 1])
        arr.sort(cmp)
        arr.unsort()
        should.not.exist(arr.compareFunction)
      })
    })
    it('should should re-arrange elements on property changes appropriately', function() {
      var arr = new Observable.Array(Todo)
        , a = new Todo({ task: 'A' })
      arr.push(new Todo({ task: 'D' }))
      arr.push(a)
      arr.push(new Todo({ task: 'F' }))
      arr.sort(function(lhs, rhs) {
        if (lhs.task < rhs.task) return -1
        if (lhs.task === rhs.task) return 0
        else return 1
      })
      a.task = 'G'
      arr.should.have.lengthOf(3)
      arr[2].task.should.equal(a.task)
    })
    describe('Fragments', function() {
      it('should be re-arranged on first call', function() {
        
      })
      it('should be inserted appropriately', function() {
        
      })
      it('should be moved appropriately', function() {
        
      })
    })
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