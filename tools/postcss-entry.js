import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import postcssNesting from 'postcss-nesting';

const processor = postcss([
  postcssNesting(),
  autoprefixer({
    overrideBrowserslist: [
      'last 3 Chrome versions',
      'last 3 Edge versions',
      'last 2 Firefox versions',
      'last 2 Safari versions'
    ]
  })
]);

async function process(css) {
  const result = await processor.process(String(css ?? ''), {
    from: undefined,
    map: false
  });

  return {
    css: result.css,
    warnings: result.warnings().map((warning) => warning.toString())
  };
}

window.StyleCraftPostCSS = { process };
