/* StyleCraft v1.25.0 - shared UserCSS metadata, variables, and document resolver */
(function(global) {
  if (global.StyleCraftUserCSS) return;

  const META_RE = /\/\*\s*==UserStyle==([\s\S]*?)==\/UserStyle==\s*\*\//i;
  const META_ALIASES = {
    name: 'name',
    namespace: 'namespace',
    version: 'version',
    description: 'description',
    author: 'author',
    license: 'license',
    homepage: 'homepageURL',
    homepageurl: 'homepageURL',
    supporturl: 'supportURL',
    updateurl: 'updateURL',
    installurl: 'installURL',
    preprocessor: 'preprocessor'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function unquote(value) {
    const text = clean(value);
    if (!text) return '';
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === '"' || first === "'" || first === '`') && last === first) {
      return text.slice(1, -1).replace(/\\(["'`\\])/g, '$1');
    }
    return text;
  }

  function escapeCssString(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function readToken(text, offset) {
    let i = offset || 0;
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) return { token: '', end: i };
    const quote = text[i];
    if (quote === '"' || quote === "'" || quote === '`') {
      i++;
      let token = '';
      while (i < text.length) {
        const ch = text[i];
        if (ch === '\\' && i + 1 < text.length) {
          token += text[i + 1];
          i += 2;
          continue;
        }
        if (ch === quote) {
          i++;
          break;
        }
        token += ch;
        i++;
      }
      return { token, end: i };
    }
    const start = i;
    while (i < text.length && !/\s/.test(text[i])) i++;
    return { token: text.slice(start, i), end: i };
  }

  function extractMetaBlock(source) {
    const text = String(source || '');
    const match = META_RE.exec(text);
    if (!match) return null;
    return {
      block: match[0],
      content: match[1],
      start: match.index,
      end: match.index + match[0].length
    };
  }

  function stripMeta(source) {
    const block = extractMetaBlock(source);
    if (!block) return String(source || '');
    return (String(source || '').slice(0, block.start) + String(source || '').slice(block.end)).trim();
  }

  function normalizeMetaKey(key) {
    const raw = clean(key).replace(/^@/, '');
    return META_ALIASES[raw.toLowerCase()] || raw;
  }

  function normalizeSelectOption(raw, index) {
    let text = unquote(raw);
    let selected = false;
    if (text.endsWith('*')) {
      selected = true;
      text = text.slice(0, -1);
    }
    let value = text;
    let label = text;
    const colon = text.indexOf(':');
    if (colon > 0) {
      value = text.slice(0, colon);
      label = text.slice(colon + 1);
    }
    return {
      value: clean(value) || String(index),
      label: clean(label) || clean(value) || String(index),
      default: selected
    };
  }

  function parseBracketOptions(text) {
    const src = clean(text);
    if (!src.startsWith('[')) return [];
    try {
      const parsed = JSON.parse(src.replace(/'/g, '"'));
      if (Array.isArray(parsed)) return parsed.map(normalizeSelectOption);
    } catch {}
    const out = [];
    const re = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
    let match;
    while ((match = re.exec(src)) !== null) out.push(normalizeSelectOption(match[2], out.length));
    return out;
  }

  function parseBlockOptions(text) {
    const out = [];
    const re = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1\s*:\s*(["'`])((?:\\.|(?!\3)[\s\S])*)\3/g;
    let match;
    while ((match = re.exec(text || '')) !== null) {
      const labelRaw = unquote(match[2]);
      const valueRaw = unquote(match[4]);
      const selected = labelRaw.endsWith('*') || valueRaw.endsWith('*');
      const label = selected && labelRaw.endsWith('*') ? labelRaw.slice(0, -1) : labelRaw;
      const value = selected && valueRaw.endsWith('*') ? valueRaw.slice(0, -1) : valueRaw;
      out.push({ label: clean(label), value: clean(value), default: selected });
    }
    return out;
  }

  function parseRangeMeta(rest) {
    const src = clean(rest);
    if (!src.startsWith('[')) return null;
    try {
      const parsed = JSON.parse(src.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        return {
          value: parsed[0],
          min: parsed[1],
          max: parsed[2],
          step: parsed[3],
          unit: parsed[4] || ''
        };
      }
    } catch {}
    return null;
  }

  function normalizeVariableValue(type, raw) {
    const text = clean(raw);
    if (type === 'checkbox') return /^(1|true|yes|on)$/i.test(text);
    if (type === 'color') return unquote(text) || '#000000';
    if (type === 'number' || type === 'range') {
      const parsed = parseRangeMeta(text);
      if (parsed) return parsed.value;
      const value = parseFloat(text);
      return Number.isFinite(value) ? value : 0;
    }
    return unquote(text);
  }

  function parseVarLine(line, blockText) {
    const first = readToken(line, 0);
    const kind = first.token.replace(/^@/, '');
    const typeTok = readToken(line, first.end);
    const nameTok = readToken(line, typeTok.end);
    const labelTok = readToken(line, nameTok.end);
    const type = clean(typeTok.token).toLowerCase();
    const name = clean(nameTok.token);
    if (!name || !type) return null;
    let rest = clean(line.slice(labelTok.end));
    let options = [];
    let valueMeta = null;

    if (type === 'select' || type === 'dropdown') {
      options = blockText ? parseBlockOptions(blockText) : parseBracketOptions(rest);
      const selected = options.find(item => item.default) || options[0];
      valueMeta = selected ? selected.value : '';
    } else if (type === 'number' || type === 'range') {
      const range = parseRangeMeta(rest);
      if (range) {
        valueMeta = range.value;
        rest = '';
        return {
          kind,
          type,
          name,
          label: labelTok.token || name,
          default: valueMeta,
          value: valueMeta,
          min: range.min,
          max: range.max,
          step: range.step,
          unit: range.unit,
          options: []
        };
      }
    }

    const value = valueMeta !== null ? valueMeta : normalizeVariableValue(type, rest);
    return {
      kind,
      type,
      name,
      label: labelTok.token || name,
      default: value,
      value,
      options
    };
  }

  function parseMetadata(content) {
    const meta = {};
    const variables = [];
    const includes = [];
    const excludes = [];
    const lines = String(content || '').split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || !line.startsWith('@')) continue;
      if (/^@(var|advanced)\s+/i.test(line)) {
        let blockText = '';
        if (/\{\s*$/.test(line)) {
          const collected = [];
          i++;
          while (i < lines.length && !/^\s*}\s*,?\s*$/.test(lines[i])) {
            collected.push(lines[i]);
            i++;
          }
          blockText = collected.join('\n');
        }
        const variable = parseVarLine(line.replace(/\{\s*$/, '').trim(), blockText);
        if (variable) variables.push(variable);
        continue;
      }

      const match = line.match(/^@([A-Za-z][\w-]*)\s+([\s\S]*)$/);
      if (!match) continue;
      const key = normalizeMetaKey(match[1]);
      const value = clean(match[2]);
      if (/^(include|match|domain|url-prefix|url|regexp)$/i.test(match[1])) includes.push({ key: match[1], value });
      else if (/^(exclude|exclude-match|excludeDomain|excludeUrl)$/i.test(match[1])) excludes.push({ key: match[1], value });
      else if (meta[key] === undefined) meta[key] = value;
      else if (Array.isArray(meta[key])) meta[key].push(value);
      else meta[key] = [meta[key], value];
    }

    if (includes.length) meta.includes = includes;
    if (excludes.length) meta.excludes = excludes;
    return { meta, variables };
  }

  function conditionToPattern(kind, value) {
    const type = kind.toLowerCase();
    if (type === 'domain') return { type: 'domain', value };
    if (type === 'url') return { type: 'url', value };
    if (type === 'url-prefix') return { type: 'url-prefix', value };
    if (type === 'regexp') return { type: 'regexp', value };
    return null;
  }

  function extractConditionPatterns(conditions) {
    const out = [];
    const re = /(domain|url-prefix|url|regexp)\(\s*(["'])([\s\S]*?)\2\s*\)/gi;
    let match;
    while ((match = re.exec(String(conditions || ''))) !== null) {
      const pattern = conditionToPattern(match[1], match[3]);
      if (pattern) out.push(pattern);
    }
    return out;
  }

  function findDocumentBlocks(source) {
    const css = String(source || '');
    const blocks = [];
    const re = /@(?:-moz-)?document\s+((?:[^{}"'()]|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\([^)]*\))*?)\s*\{/gi;
    let match;
    while ((match = re.exec(css)) !== null) {
      const bodyStart = match.index + match[0].length;
      let depth = 1;
      let pos = bodyStart;
      while (pos < css.length && depth > 0) {
        const ch = css[pos];
        if (ch === '"' || ch === "'") {
          const quote = ch;
          pos++;
          while (pos < css.length) {
            if (css[pos] === '\\') pos += 2;
            else if (css[pos] === quote) { pos++; break; }
            else pos++;
          }
          continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        pos++;
      }
      blocks.push({
        start: match.index,
        end: pos,
        bodyStart,
        bodyEnd: Math.max(bodyStart, pos - 1),
        conditions: match[1].trim(),
        body: css.slice(bodyStart, Math.max(bodyStart, pos - 1)).trim()
      });
      re.lastIndex = pos;
    }
    return blocks;
  }

  function parseAppliesTo(source) {
    const seen = new Set();
    const out = [];
    for (const block of findDocumentBlocks(stripMeta(source))) {
      for (const pattern of extractConditionPatterns(block.conditions)) {
        const key = pattern.type + '\0' + pattern.value;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(pattern);
        }
      }
    }
    return out;
  }

  function defaultValues(variables) {
    const values = {};
    for (const variable of variables || []) values[variable.name] = variable.default;
    return values;
  }

  function mergeValues(variables, existing) {
    return Object.assign(defaultValues(variables), clone(existing));
  }

  function cssValue(variable, values) {
    const value = values && Object.prototype.hasOwnProperty.call(values, variable.name)
      ? values[variable.name]
      : variable.default;
    if (variable.type === 'checkbox') return value ? '1' : '0';
    if (variable.type === 'number' || variable.type === 'range') return String(value) + (variable.unit || '');
    return String(value == null ? '' : value);
  }

  function makeDefaultVariableCss(variables, values) {
    const lines = [];
    for (const variable of variables || []) {
      const value = cssValue(variable, values);
      if (variable.type === 'text' || variable.type === 'select' || variable.type === 'dropdown') {
        lines.push('  --' + variable.name + ': "' + escapeCssString(value) + '";');
      } else {
        lines.push('  --' + variable.name + ': ' + value + ';');
      }
    }
    return lines.length ? ':root {\n' + lines.join('\n') + '\n}\n\n' : '';
  }

  function applyVariables(source, parsed, valuesOverride) {
    const info = parsed && parsed.meta ? parsed : parse(source);
    const variables = info.variables || [];
    if (!variables.length) return stripMeta(source);
    const values = mergeValues(variables, valuesOverride || info.values || {});
    const body = stripMeta(source);
    const preprocessor = clean(info.meta.preprocessor || '').toLowerCase();
    if (preprocessor === 'uso') {
      return body.replace(/\/\*\s*\[\[([\w-]+)\]\]\s*\*\//g, (match, name) => {
        const variable = variables.find(item => item.name === name);
        return variable ? cssValue(variable, values) : match;
      });
    }
    if (!preprocessor || preprocessor === 'default') return makeDefaultVariableCss(variables, values) + body;
    return body;
  }

  function parse(source) {
    const block = extractMetaBlock(source);
    const parsed = block ? parseMetadata(block.content) : { meta: {}, variables: [] };
    const body = stripMeta(source);
    return {
      hasMeta: !!block,
      meta: parsed.meta,
      variables: parsed.variables,
      values: defaultValues(parsed.variables),
      body,
      appliesTo: parseAppliesTo(body)
    };
  }

  function metadataToBlock(meta, variables) {
    const lines = ['/* ==UserStyle=='];
    const ordered = ['name', 'namespace', 'version', 'description', 'author', 'homepageURL', 'supportURL', 'updateURL', 'license', 'preprocessor'];
    for (const key of ordered) {
      if (meta && meta[key]) lines.push('@' + key.padEnd(13, ' ') + meta[key]);
    }
    for (const variable of variables || []) {
      const label = '"' + escapeCssString(variable.label || variable.name) + '"';
      if (variable.options && variable.options.length) {
        const opts = variable.options.map(option => {
          const selected = option.value === variable.default ? '*' : '';
          return '"' + escapeCssString(option.value + ':' + option.label + selected) + '"';
        }).join(', ');
        lines.push('@var ' + variable.type + ' ' + variable.name + ' ' + label + ' [' + opts + ']');
      } else {
        const value = variable.type === 'checkbox' ? (variable.default ? '1' : '0') : JSON.stringify(String(variable.default == null ? '' : variable.default));
        lines.push('@var ' + variable.type + ' ' + variable.name + ' ' + label + ' ' + value);
      }
    }
    lines.push('==/UserStyle== */');
    return lines.join('\n');
  }

  function resolveForUrl(source, pageUrl, pageDomain, matcher, valuesOverride) {
    const parsed = parse(source);
    const css = applyVariables(source, parsed, valuesOverride);
    if (!/@(?:-moz-)?document\b/i.test(css)) return css;
    const matchApi = matcher || global.StyleCraftMatcher;
    const blocks = findDocumentBlocks(css);
    let out = '';
    let lastEnd = 0;
    for (const block of blocks) {
      const plain = css.slice(lastEnd, block.start).trim();
      if (plain) out += (out ? '\n\n' : '') + plain;
      const matches = matchApi && typeof matchApi.documentConditionsMatch === 'function'
        ? matchApi.documentConditionsMatch(block.conditions, pageUrl, pageDomain)
        : true;
      if (matches && block.body) out += (out ? '\n\n' : '') + block.body;
      lastEnd = block.end;
    }
    const trail = css.slice(lastEnd).trim();
    if (trail) out += (out ? '\n\n' : '') + trail;
    return out;
  }

  global.StyleCraftUserCSS = {
    extractMetaBlock,
    stripMeta,
    parse,
    parseMetadata,
    parseAppliesTo,
    findDocumentBlocks,
    mergeValues,
    applyVariables,
    metadataToBlock,
    resolveForUrl
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
