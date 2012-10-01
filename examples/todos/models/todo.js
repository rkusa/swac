var Arkansas = require('arkansas')

module.exports = Arkansas.Model.define('Todo', function() {
  this.property('task')
  this.property('isDone')
})