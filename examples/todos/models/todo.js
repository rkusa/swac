var Arkansas = require('arkansas')

module.exports = Arkansas.Model.define('Todo', function() {
  this.property('todo')
  this.property('isDone')
})