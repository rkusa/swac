var fixtures = require('./fixtures')
  , implode = require('../lib/implode')
  , Todo = fixtures.Todo
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
