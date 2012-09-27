var Observable = require('../lib/observable')
  , utils = require('../lib/utils')
  , should = require('should')

describe('Array', function() {
  describe('#_position', function() {
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