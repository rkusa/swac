var handlebars = require('handlebars')

handlebars.registerHelper('block', function(context, block) {
  var args     = Array.prototype.slice.call(arguments)
    , block = args.pop()
    , context = args.shift()
    , ret = ''
  // console.log(block)
  ret += '<!---{' + ++this._blockCount + '-->'
  block.tmpl.id = this._blockCount
  ret += block.tmpl(this)
  ret += '<!---' + this._blockCount + '}-->'

  this._templates.push({
    id: this._blockCount,
    fn: block.tmpl.toString()
  })

  return new handlebars.SafeString(ret)
})

handlebars.registerHelper('json', function(obj) {
  return new handlebars.SafeString(JSON.stringify(obj))
})