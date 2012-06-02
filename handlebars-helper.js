var handlebars = require('handlebars')
  , Fragment = require('./fragment')

handlebars.registerHelper('block', function(context, block) {
  var args     = Array.prototype.slice.call(arguments)
    , block = args.pop()
    , context = args.shift()
    , ret = ''

  // console.log(block)
  ret += '<!---{' + ++this._blockCount + '-->'

  var fragment = new Fragment({ id: this._blockCount, template: block.tmpl })
  ret += fragment.render(this)

  ret += '<!---' + this._blockCount + '}-->'

  this._fragments.push(fragment)

  return new handlebars.SafeString(ret)
})

handlebars.registerHelper('json', function(obj) {
  return new handlebars.SafeString(JSON.stringify(obj))
})