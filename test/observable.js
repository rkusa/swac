var Observable = require('../lib/observable')
  , utils = require('../lib/utils')
  , Model = require('../lib/model')
  , Todo = require('../examples/todos/models/todo')
  , should = require('should')

describe('Array', function() {
  describe.skip('#_position', function() {
    describe('should exist after', function() {
      var arr
      function testPositions(arr) {
        for(var i = 0; i < arr.length; ++i) {
          should.exist(arr[i]._position)
          arr[i]._position.should.equal('Test.' + i.toString())
        }
      }
      beforeEach(function() {
        arr = []
        for(var i = 0; i < 10;)
          arr.push({ id: ++i })
        arr = Observable.Array(arr, true)
        arr._position = 'Test'
      })
      it('initialization', function() {
        testPositions(arr)
      })
      it('#push()', function() {
        arr.push({ id: 11 })
        testPositions(arr)
      })
      it('#pop()', function() {
        arr.pop()
        testPositions(arr)
      })
      it('#reverse()', function() {
        arr.reverse()
        testPositions(arr)
      })
      it('#shift()', function() {
        arr.shift()
        testPositions(arr)
      })
      it('#sort()', function() {
        arr.sort(function(lhs, rhs) { return rhs.id - lhs.id })
        testPositions(arr)
      })
      it('#splice()', function() {
        arr.shift(2, 3, { id: 11 }, { id: 12 })
        testPositions(arr)
      })
      it('#unshift()', function() {
        arr.unshift({ id: 11 }, { id: 12 })
        testPositions(arr)
      })
    })
    describe('should be adjusted', function() {
      var arr
      beforeEach(function() {
        arr = Observable.Array(true)
        arr._position = 'Test'
        arr.push(utils.makeTrackable({}))
      })
      it('if already exists', function() {
        arr[0]._position.should.equal('Test.0')
      })
      it('if removed', function() {
        var item = arr.pop()
        should.not.exist(item._index)
        should.not.exist(item._position)
      })
    })
  })

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
      
      !function traverse(obj, path) {
        Object.keys(obj).forEach(function(i) {
          var prop = traverse(obj[i], path.concat(i))
          if (typeof prop !== 'object') return
          prop.should.not.have.property('_listeners', undefined, 'event remaining: ' + path.concat(i).join('.'))
        })
        return obj
      }(todo.EventEmitter.listenerTree, [])
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
  describe.skip('#_position', function() {
    describe('should exist after', function() {
      var arr
      function testPositions(arr) {
        for(var i = 0; i < arr.length; ++i) {
          for(var j = 0; j < arr[i].length; ++j) {
            should.exist(arr[i].collection[j]._position)
            arr[i].collection[j]._position.should.equal('Test.' + i.toString() + '.' + j.toString())
          }
        }
      }
      beforeEach(function() {
        arr = []
        for(var i = 0; i < 10; ++i)
          arr.push(new Item({ type: (i % 2 === 0) ? 'first' : 'second' }))
        arr = Observable.Array(arr, Item, true)
        arr._position = 'Test'
        arr = arr.groupBy('type')
      })
      it('initialization', function() {
        testPositions(arr)
      })
      it('#add', function() {
        arr.add(new Item({ type: 'first' }))
        arr.add(new Item({ type: 'second' }))
        testPositions(arr)
      })
      it('#remove', function() {
        arr.remove(arr[0].collection[0])
        arr.remove(arr[1].collection[2])
        testPositions(arr)
      })
      it('item\'s pivot-property changed', function() {
        var item = arr[0].collection[0]
        item.type = 'second'
        arr.length.should.equal(2)
        arr[0].collection.length.should.equal(4)
        arr[1].collection.length.should.equal(6)
        testPositions(arr)
      })
    })
  })
})