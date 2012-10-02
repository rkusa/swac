var EventEmitter = require('../lib/eventemitter.js')
  , should = require('should')

describe('EventEmitter', function() {
  var e = new EventEmitter
    , dummy = {
      a: function() {},
      b: function() {}
    }
  it('#on()', function() {
    e.on('test', dummy, 'a', 0, 1, 2)
    e.on('test', dummy, 'a')
    e.on('test', dummy.a)
    e.events['test'].should.have.lengthOf(3)
  })
  it('#off()', function() {
    e.off('test', dummy, 'a')
    e.events['test'].should.have.lengthOf(1)
    e.off('test', dummy.a)
    e.events['test'].should.have.lengthOf(0)
    e.on('test', dummy, 'a')
    e.on('test', dummy, 'b')
    e.events['test'].should.have.lengthOf(2)
    e.off('test', dummy)
    e.events['test'].should.have.lengthOf(0)
  })
  it('#emit()', function() {
    (function() {
      e.emit('foo')
    }).should.not.throw

    var context = {}
    dummy = {
      a: function() {
        this.should.equal(context)
        arguments.should.have.lengthOf(2)
      },
      b: function() {
        this.should.equal(dummy)
        arguments.should.have.lengthOf(0)
      }
    }
    e.on('test', dummy, 'a', context, 1, 2)
    e.on('test', dummy.a, context, 1, 2)
    e.on('test', dummy, 'b')
    e.emit('test')
  })
  it('#many()', function() {
    e.many('many', 2, function() {})
    e.events['many'].should.have.lengthOf(1)
    e.emit('many')
    e.events['many'].should.have.lengthOf(1)
    e.emit('many')
    e.events['many'].should.have.lengthOf(0)
  })
  it.skip('#once()', function() {
  })
  it('#eventify()', function() {
    var Foo = function() {}
    EventEmitter.eventify(Foo)
    Foo.prototype.should.have.property('on')
    var foo = new Foo
    foo.on('test', function() {})
    foo.should.have.property('events')
  })
})