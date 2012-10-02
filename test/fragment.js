var fixtures = require('./fixtures')
  , serialization = require('../lib/serialization')
  , Todo = require('../examples/todos/models/todo')
  , Fragment = require('../lib/fragment')
  , state = fixtures.state

describe('Fragment', function() {
  it('should be created', function(done) {
    fixtures.client.get('/').expect(200).end(function(err, res) {
      if (err) return done(err)
      state.app.should.have.property('fragments')
      state.app.fragments.should.have.lengthOf(5)
      done()
    })
  })
  var fragment, prepared
  describe('Serialization', function() {
    before(function() {
      fragment = state.app.fragments[2]
      prepared = serialization.prepare(fragment)
    })
    it('should include the proper #$type', function() {
      prepared.should.have.property('$type', 'Fragment')
    })
    it('should only include its properties', function() {
      Object.keys(prepared).should.have.lengthOf(6)
      prepared.should.have.property('id', 2)
      // #template
      prepared.should.have.property('template')
      prepared.template.should.have.property('$type', 'Template')
      // #context
      prepared.should.have.property('context')
      prepared.context.should.not.be.instanceOf(Todo)
      prepared.context.should.have.property('$type', 'Model/Todo')
    })
  })
  describe('Deserialization', function() {
    var recovered
    before(function() {
      recovered = serialization.recover(prepared)
    })
    it('should recover its instance', function() {
      recovered.should.be.instanceof(Fragment)
    })
    it('shouldn\'t have the #$type property', function() {
      recovered.should.not.have.property('$type')
    })
    it('should keep its properties', function() {
      Object.keys(recovered).should.have.lengthOf(5)
      recovered.should.have.property('id', fragment.id)
      recovered.template.fn.should.be.a('function')
      recovered.should.have.property('template')
      recovered.should.have.property('context')
      recovered.should.have.property('events')
    })
  })
  describe('Client-Side', function() {
    describe('#delete()', function() {
      it('should delete its content', function() {

      })
      it('should fire its `delete` event', function() {
        
      })
      it('should remove itself from `app.fragments`', function() {
        
      })
      it('should - if its parent got deleted - be deleted first', function() {
        
      })
      it('should - if deleted directy - unlisten from its parent', function() {
        
      })
    })
  })
})