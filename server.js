
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , dust = require('dustjs-linkedin')

dust.filters.strong = function(value) {
  return value.toString()
              .replace(/^<span/, '<strong')
              .replace(/<\/span>$/, '</strong>')
}

var app = GLOBAL.express = express()

app.configure(function() {
  app.set('port', process.env.PORT || 3000)
  app.set('views', __dirname + '/views')
  app.set('view engine', 'html')
  app.engine('html', require('consolidate').dust)
  app.use(express.favicon())
  app.use(express.logger('dev'))
  app.use(require('less-middleware')({ src: __dirname + '/public' }))
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(app.router)
  app.use(express.static(__dirname + '/public'))
})

app.configure('development', function() {
  app.use(express.errorHandler())
})

app.get('/serverside', function(req, res) {
  res.render('index', { title: 'Server-Side' })
})

require('./app')

var server = module.exports = http.createServer(app)
server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'))
})
