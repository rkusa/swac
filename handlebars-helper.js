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

  var fragment = new Fragment(this.fragments.length, template, this)
  this.fragments[fragment.id] = fragment

  ret += '<!---{' + fragment.id + '-->'
  ret += fragment.render()
  ret += '<!---' + fragment.id + '}-->'

  return new handlebars.SafeString(ret)
})

handlebars.registerHelper('collection', function(context, block) {
  var args     = Array.prototype.slice.call(arguments)
    , block = args.pop()
    , context = args.shift()
    , that = this
    , ret = ''


  var template = new Template(this.templates.length, block.tmpl)
  this.templates[template.id] = template

  var list = new Fragment(this.fragments.length, template, context)
  this.fragments[list.id] = list

  ret += '<!---{' + list.id + '-->'

  for (var i = 0; i < context._collection.length; ++i) {
    var fragment = new Fragment(this.fragments.length, template, context._collection[i])
    this.fragments[fragment.id] = fragment

    ret += '<!---{' + fragment.id + '-->'
    ret += fragment.render()
    ret += '<!---' + fragment.id + '}-->'
  }

  ret += '<!---' + list.id + '}-->'

  return new handlebars.SafeString(ret)
})

handlebars.registerHelper('json', function(obj) {
  return new handlebars.SafeString(JSON.stringify(obj))
})