var Observable = require('../lib/observable')
  , utils = require('../lib/utils')
  , Model = require('../lib/model')
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