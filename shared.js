module.exports = {}

module.exports.register = function(name, value) {
  module.exports[name] = value
  value._position = name
}