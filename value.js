function Value(key, value) {
  this.key = key
  this.value = value
}

if (typeof module != 'undefined') {
  module.exports = Value
}