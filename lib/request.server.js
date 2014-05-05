var handlebars = require('handlebars')
  , fs = require('fs')

var Response = function(state) {
  this.state = state
}

Response.prototype.ready = Response.prototype.cleanup = function() {
  // do nothing
}

Response.prototype.finalize = function(opts) {

}

Response.prototype.redirect = function(url) {

}

Response.prototype.render = function*(viewName) {
  var source = yield fs.readFile.bind(fs, __dirname + '/../../../views/' + viewName + '.html', 'utf8')
  var precompiled = precompile(source)
  this.state.templates[viewName] = precompiled
  this.state.currentView = viewName
  var template = handlebars.template(this.state.templates[viewName])
  return template(this.state.locals)
}

var Request = module.exports = function(state) {
  this.state = state
}

Request.prototype.createResponse = function() {
  return new Response(this.state)
}

function precompile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== handlebars.AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input)
  }

  options = options || {}
  if (!('data' in options)) {
    options.data = true
  }

  var ast = handlebars.parse(input)
  var environment = new handlebars.Compiler().compile(ast, options)
  return new handlebars.JavaScriptCompiler().compile(environment, options, undefined, true)
}