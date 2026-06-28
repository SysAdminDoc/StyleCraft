import * as sass from 'sass';

function compile(source, options = {}) {
  const syntax = options.syntax === 'sass' ? 'indented' : 'scss';
  const result = sass.compileString(String(source ?? ''), {
    syntax,
    style: 'expanded',
    quietDeps: true,
    verbose: false
  });

  return {
    css: result.css,
    loadedUrls: result.loadedUrls.map((url) => url.toString())
  };
}

window.StyleCraftSass = { compile };
