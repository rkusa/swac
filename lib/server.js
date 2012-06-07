var express = exports.express = require('express')
  , cons = require('consolidate')
  , browserify = require('browserify')

var server = exports.app = express()

server.configure(function() {
  server.set('view engine', 'html')
  server.engine('html', require('consolidate').handlebars)
})

require('./handlebars-helper')

exports.init = function(path) {
  server.use(
    browserify(path.indexOf('.js') > -1 ? path : path + '.js')
  )
  require(path)
}

exports.Model