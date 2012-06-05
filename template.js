var jsp = require("uglify-js").parser
  , pro = require("uglify-js").uglify

var Template = module.exports = function(id, fn) {
  this.id = id
  this.fn = fn
}

Template.prototype.serialize = function() {
  var fn = jsp.parse(this.fn.toString())
  fn = pro.ast_squeeze(fn)
  fn = pro.gen_code(fn)
  fn = fn.replace('function program1(depth0,data){', '')
         .replace(/\}$/, '')

  return { type: 'Template', obj: {
    id: this.id,
    fn: fn
  }}
}

Template.prototype.deserialize = function(obj) {
  this.id = obj.id
  this.fn = (new Function('Handlebars', 'depth0', 'data', 'var helpers = Handlebars.helpers, foundHelper, tmp1, self = Handlebars, functionType="function", helperMissing = helpers.helperMissing, undef = void 0, escapeExpression = Handlebars.Utils.escapeExpression, blockHelperMissing = helpers.blockHelperMissing;' + obj.fn)).bind({}, Handlebars)
}