var handlebars = require('handlebars')
  , Fragment = require('./fragment')
  , Template = require('./template')

handlebars.registerHelper('block', function(context, block) {
  var args     = Array.prototype.slice.call(arguments)
    , block = args.pop()
    , context = args.shift()
    , ret = ''

  var template = new Template(this.templates.length, block.tmpl)
  this.templates[template.id] = template

  var fragment = new Fragment(this.fragments.length, template)
  this.fragments[fragment.id] = fragment

  ret += '<!---{' + fragment.id + '-->'
  ret += fragment.render(this)
  ret += '<!---' + fragment.id + '}-->'

  return new handlebars.SafeString(ret)
})

handlebars.registerHelper('collection', function(context, block) {
  var args     = Array.prototype.slice.call(arguments)
    , block = args.pop()
    , context = args.shift()
    , that = this
    , ret = ''

  ret += '<!--{#' + this._blockCount + '-->'

  for (var i = 0; i < context._collection.length; ++i) {
    var fragment = new Fragment({ id: ++this._blockCount, template: block.tmpl, boundTo: context })
    this._fragments.push(fragment)

    ret += '<!---{' + this._blockCount + '-->'
    ret += fragment.render(context._collection[i])
    ret += '<!---' + this._blockCount + '}-->'
  }

  ret += '<!--#' + this._blockCount + '}-->'

  return new handlebars.SafeString(ret)
})

handlebars.registerHelper('json', function(obj) {
  return new handlebars.SafeString(JSON.stringify(obj))
})