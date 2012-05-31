
/**
 * Module dependencies.
 */

var express = require('express')
  , cons = require('consolidate')
  , handlebars = require('handlebars')
  , http = require('http')

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

var Value = require('./value')
handlebars.registerHelper('bind', function(context, tag, options) {
  var args     = Array.prototype.slice.call(arguments)
    , options = args.pop()
    , context = args.shift()
    , tag     = args.shift() || 'span'

  var fn = options.fn, inverse = options.inverse
  var ret = "<" + tag + " data-bind=\"$" + context.key + "\">"

  if (typeof fn != 'undefined') {
    console.log(options.toString())
    if(context && context.value.length > 0) {
      for(var i=0, j=context.value.length; i<j; i++) {
        ret = ret + fn(context.value[i])
      }
    } else {
      ret = inverse(this)
    }
  } else {
    ret += context.value
  }

  return new handlebars.SafeString(ret + "</" + tag + ">")
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
