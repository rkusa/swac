var fixtures = require('./fixtures')
  , State = require('../lib/state')
  , serialization = require('../lib/serialization')
  , should = require('should')
  , state = fixtures.state
  
describe('State', function() {
  var prepared
  it('should request and prepare', function(done) {
    fixtures.client.get('/').expect(200, function() {
      (function() {
        prepared = serialization.prepare(state.app)
        // console.log(prepared)
        done()
      }).should.not.throw()
    })
  })
  it('should be referenced correctly', function() {
    state.app.should.equal(state.app.fragments[0].context)
  })

  describe('Serialization', function() {
    it('should include the proper #$type', function() {
      prepared.should.have.property('$type', 'Arkansas/State')
    })
    it('should only include its properties', function() {
      Object.keys(prepared.obj).should.have.lengthOf(3)
      with (prepared) {
        obj.should.have.property('fragments')
        obj.should.have.property('path')
        obj.should.have.property('todos')
        obj.todos.should.have.property('$type', 'Collection/Todos')
      }
    })
    it('should be referenced correctly', function() {
      prepared.obj.fragments[0].obj.context.should.have.property('$ref', '#')
    })
  })
  
  describe('Deserialization', function() {
    var recovered
    before(function() {
    })
    it('should recover its instance', function() {
      recovered = serialization.recover(prepared)
      recovered.should.be.instanceof(State)
    })
    it('shouldn\'t have the #$type property', function() {
      recovered.should.not.have.property('$type')
    })
    it('should keep its properties', function() {
      Object.keys(recovered).should.have.lengthOf(4)
      recovered.should.have.property('fragments')
      recovered.should.have.property('path')
      recovered.should.have.property('todos')
    })
  })
})