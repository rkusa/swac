var fixtures = require('./fixtures')
  , swac = require('../')
  , Todo = fixtures.Todo
  , utils = require('../lib/utils')
  , should = require('should')
  , state = fixtures.state

describe('Rendering', function() {
  describe('Areas', function() {
    before(function() {
      swac.get('/areas', function(app, done) {
        app.status = 'works'
        done.render('areas')
        state.app = app
      })
    })
    it('should render', function(done) {
      fixtures.client.get('/areas')
        .expect(200)
        .end(function(err, res) {
          // console.log(res.text)
          res.text.should.include('<!---{0-->')
          res.text.should.include('it works')
          res.text.should.include('<!---0}-->')
          res.text.should.include('<!---{1-->')
          res.text.should.include('Copyrights etc.')
          res.text.should.include('<!---1}-->')
          done()
        })
    })
    it('should create appropriated fragments', function() {
      // console.log(state.app)
      state.app.fragments.length.should.equal(2)
      with (state.app.fragments[0]) {
        id.should.equal(0)
        template.fn.toString().should.include('_b.push(status);')
      }
      with (state.app.fragments[1]) {
        id.should.equal(1)
        template.fn.toString().should.include('Copyrights etc.')
      }
    })
  })
  describe('Self-Updating Fragments', function() {
    before(function() {
      swac.get('/blocks', function(app, done) {
        app.register('todo', new Todo({ task: 'Second', isDone: true }))
        done.render('blocks')
        state.app = app
      })
    })
    it('should render', function(done) {
      fixtures.client.get('/blocks')
        .expect(200)
        .end(function(err, res) {
          // console.log(res.text)
          if (err) return done(err)
          res.text.should.include('<!---{1-->')
          res.text.should.include('<input type="checkbox" checked="true">')
          res.text.should.include('<label>Second</label>')
          res.text.should.include('<!---1}-->')
          done()
        })
    })
    it('should create appropriated fragment', function() {
      // console.log(state.app.fragments)
      state.app.fragments.length.should.equal(2)
      with (state.app.fragments[1]) {
        id.should.equal(1)
        template.fn.toString().should.include('_b.push(todo.task);')
      }
    })
    it.skip('should register appropriated events', function() {
      // console.log(state.app.fragments)
      // main area
      state.app.fragments[0].events.length.should.equal(0)
      // footer area
      state.app.fragments[2].events.length.should.equal(0)
      // self updating fragment
      with (state.app.fragments[1]) {
        events.length.should.equal(1)
        with (events[0]) {
          id.should.equal(state.app.todo)
          properties[0].should.equal('isDone')
          properties[1].should.equal('task')
        }
      }
    })
  })
  describe('Collections', function() {
    before(function() {
      swac.get('/collections', function(app, done) {
        app.register('todos', swac.observableArray(Todo))
        app.todos.reset([
          new Todo({ task: 'First',  isDone: false }),
          new Todo({ task: 'Second', isDone: true })
        ])
        done.render('index')
        state.app = app
      })
    })
    it('should render', function(done) {
      fixtures.client.get('/collections')
        .expect(200)
        .end(function(err, res) {
          // console.log(res.text)
          for (var i = 1; i <= 3; ++i) {
            res.text.should.include('<!---{' + i + '-->')
            res.text.should.include('<!---' + i + '}-->')
          }
          res.text.should.include('<label>First</label>')
          res.text.should.include('<label>Second</label>')
          done()
        })
    })
    it('should create appropriated fragments', function() {
      // console.log(state.app.fragments)
      state.app.fragments.length.should.equal(4)
      state.app.fragments[0].id.should.equal(0)
      for (var i = 1; i <= 3; ++i) {
        state.app.fragments[i].id.should.equal(i)
      }
      with (state.app.fragments[1]) {
        template.should.equal(state.app.fragments[2].template)
        template.should.equal(state.app.fragments[3].template)
      }
    })
    it.skip('should register appropriated events', function() {
      // console.log(state.app.fragments)
      // main area
      state.app.fragments[0].events.length.should.equal(0)
      // collection container
      state.app.fragments[1].events.length.should.equal(0)
      // first item
      with (state.app.fragments[2]) {
        events.length.should.equal(1)
        with (events[0]) {
          id.should.equal(state.app.todos[0])
          properties[0].should.equal('isDone')
          properties[1].should.equal('task')
        }
      }
      // second item
      with (state.app.fragments[3]) {
        events.length.should.equal(1)
        with (events[0]) {
          id.should.equal(state.app.todos[1])
          properties[0].should.equal('isDone')
          properties[1].should.equal('task')
        }
      }
    })
  })
  describe('Helper', function() {
    describe('Form', function() {
      before(function() {
        swac.get('/helper/form', function(app, done) {
          app.register('todo', new Todo)
          done.render('forms')
          state.app = app
        })
      })
      it('should render', function(done) {
        fixtures.client.get('/helper/form')
          .expect(200)
          .end(function(err, res) {
            res.text.should.include('<form method="POST">')
            res.text.should.include('<label for="todo_task">Task</label>')
            res.text.should.include('<input id="todo_task" name="todo[task]" value="" type="text"/>')
            res.text.should.include('</form>')
            done()
          })
      })
    })
  })
})