exports.escape = function (str) {
  return String(str)
	.replace(/&(?!\w+;)/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
}

exports.tag = function (name, inner, attrs) {
  var start = exports.startTag(name, attrs)
  return inner ? (start + inner + exports.endTag(name)) : (start.slice(0, -1) + '/>')
}

exports.startTag = function (name, attrs) {
  return '<' + name + exports.attrs(attrs) + '>'
}

exports.endTag = function (name) {
  return '</' + name + '>'
}

exports.attrs = function (obj) {
  if (typeof obj != 'object') return ''

  var list = []
  Object.keys(obj).forEach(function (key) {
	var val = obj[key]
	if (typeof val == 'undefined') return
	list.push(key + '="' + exports.escape(key == 'class' && Array.isArray(val)
		? val.join(' ')
		: (val || '').toString())
	  + '"')
  })
  return ' ' + list.join(' ')
}

exports.humanize = function (str) {
  if (!str) return ''
  var terms = str.replace(/_id$/, '').replace(/_/g, ' ').split('_')

  for(var i = 0; i < terms.length; ++i) {
	terms[i] = terms[i].charAt(0).toUpperCase() + terms[i].slice(1)
  }

  return terms.join(' ')
}