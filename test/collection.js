var Todo = require('../examples/todos/models/todo')
  , collection = require('../lib/collection')
  , Collection = collection.Collection
  , serialization = require('../lib/serialization')
  , should = require('should')

var Todos, todos

describe('Collection', function() {
  it('should be defineable', function() {
    (function() {
      Todos = Collection.define('TodoCollection')
    }).should.throw();
    (function() {
      Todos = Collection.define('TodoCollection', function() {})
    }).should.throw();
    (function() {
      Todos = Collection.define('TodoCollection', Todo, function() {
        this.property('completed', function() {
          var count = 0
          this.forEach(function(todo) {
            if (todo.isDone) ++count
          })
          return count
        })
      })
    }).should.not.throw()
  })
  it('should be instantiable', function() {
    todos = new Todos([
      new Todo({ task: 'First',  isDone: true }),
      new Todo({ task: 'Second', isDone: false })
    ])
    todos.should.be.instanceOf(Array)
    todos.should.have.lengthOf(2)
  })
  
  describe('Properties', function() {
    it('should work', function() {
      todos.should.have.property('completed', 1)
      todos[1].isDone = true
      todos.should.have.property('completed', 2)
    })
  })
  
  var prepared
  describe('Serialization', function() {
    before(function() {
      console.log(todos)
      prepared = serialization.prepare(todos)
      // console.log(prepared)
    })
    it('should include the proper #$type', function() {
      prepared.should.have.property('$type', 'Collection/TodoCollection')
    })
    it('should not include its functional properties', function() {
      prepared.should.not.have.property('completed')
    })
  })
    
  describe('Deserialization', function() {
    var recovered
    before(function() {
      recovered = serialization.recover(prepared)
      // console.log(recovered)
    })
    it('should recover its instance', function() {
      recovered.should.be.instanceof(Array)
    })
    it('shouldn\'t have the #$type property', function() {
      recovered.should.not.have.property('$type')
    })
    it('should regain its functional properties', function() {
      recovered.should.have.property('completed', 2)
    })
  })
})