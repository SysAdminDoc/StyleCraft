/* StyleCraft v1.24.0 - shared import and storage data guard */
(function(global) {
  if (global.StyleCraftData) return;

  const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
  const APPLY_TYPES = new Set(['domain', 'url', 'url-prefix', 'regexp', 'wildcard']);
  const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function byteLength(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value || '');
    try { return new TextEncoder().encode(text).length; } catch { return text.length; }
  }

  function cleanKey(value) {
    const key = String(value || '').trim();
    if (!key || BLOCKED_KEYS.has(key)) return '';
    return key;
  }

  function addRejected(rejected, path, reason) {
    rejected.push({ path, reason });
  }

  function addTrustWarning(warnings, code, message, severity) {
    warnings.push({ code, message, severity: severity || 'warning' });
  }

  function analyzeCssTrust(css) {
    const text = String(css || '');
    const warnings = [];
    if (/url\(\s*(['"]?)\s*(?:javascript|vbscript):/i.test(text) || /@import\s+(?:url\()?\s*(['"]?)\s*(?:javascript|vbscript):/i.test(text)) {
      addTrustWarning(warnings, 'blocked-scheme', 'Blocked javascript/vbscript URL in CSS.', 'block');
    }
    if (/url\(\s*(['"]?)\s*(?:https?:)?\/\//i.test(text)) {
      addTrustWarning(warnings, 'remote-url', 'Remote url() fetch can disclose visited pages to a third party.');
    }
    if (/@import\s+(?:url\()?\s*(['"]?)\s*(?:https?:)?\/\//i.test(text)) {
      addTrustWarning(warnings, 'remote-import', 'Remote @import fetch can load third-party CSS.');
    }
    if (/(?:input\s*\[[^\]]*type\s*=\s*['"]?password|textarea|select)\b/i.test(text)) {
      addTrustWarning(warnings, 'sensitive-selector', 'Selector targets sensitive form controls.');
    }
    if (/position\s*:\s*fixed/i.test(text) && (/(?:z-index\s*:\s*(?:999|[1-9]\d{3,})|inset\s*:\s*0\b)/i.test(text) || /(?:top|left|right|bottom)\s*:\s*0\b/i.test(text))) {
      addTrustWarning(warnings, 'overlay-risk', 'Fixed full-page overlay pattern can be deceptive.');
    }
    const blocked = warnings.some(item => item.severity === 'block');
    return {
      status: blocked ? 'blocked' : (warnings.length ? 'review' : 'trusted'),
      warnings,
      checkedAt: new Date().toISOString()
    };
  }

  function trustSummary(trust) {
    return (trust && trust.warnings && trust.warnings[0] && trust.warnings[0].message) || 'CSS trust check failed.';
  }

  function assertCssAllowed(css) {
    const trust = analyzeCssTrust(css);
    if (trust.status === 'blocked') throw new Error('Blocked CSS: ' + trustSummary(trust));
    return trust;
  }

  function sanitizeMeta(value) {
    if (!isPlainObject(value)) return undefined;
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (!cleanKey(key)) continue;
      if (['string', 'number', 'boolean'].includes(typeof val)) out[key] = val;
    }
    return Object.keys(out).length ? out : undefined;
  }

  function sanitizePreprocessor(value, path, rejected) {
    if (value === undefined) return undefined;
    if (!isPlainObject(value)) {
      addRejected(rejected, path, 'Preprocessor metadata must be an object.');
      return undefined;
    }
    const syntax = ['css', 'scss', 'sass'].includes(value.syntax) ? value.syntax : '';
    if (!syntax || typeof value.source !== 'string') {
      addRejected(rejected, path, 'Preprocessor metadata needs css/scss/sass syntax and string source.');
      return undefined;
    }
    return { syntax, source: value.source };
  }

  function sanitizeUserCssState(value) {
    if (!isPlainObject(value)) return null;
    const out = {};
    const meta = sanitizeMeta(value.meta);
    if (meta) out.meta = meta;
    if (Array.isArray(value.variables)) {
      out.variables = value.variables.filter(item => isPlainObject(item) && typeof item.name === 'string').map(item => ({
        kind: typeof item.kind === 'string' ? item.kind : 'var',
        type: typeof item.type === 'string' ? item.type : 'text',
        name: item.name,
        label: typeof item.label === 'string' ? item.label : item.name,
        default: item.default,
        value: item.value,
        options: Array.isArray(item.options) ? item.options.filter(opt => isPlainObject(opt)).map(opt => ({
          value: String(opt.value || ''),
          label: String(opt.label || opt.value || ''),
          default: opt.default === true
        })) : []
      }));
    }
    if (isPlainObject(value.values)) out.values = cloneJson(value.values);
    if (Array.isArray(value.appliesTo)) out.appliesTo = value.appliesTo.filter(item => isPlainObject(item) && typeof item.type === 'string' && typeof item.value === 'string').map(item => ({ type: item.type, value: item.value }));
    return Object.keys(out).length ? out : null;
  }

  function parseUserCssState(css, existingState) {
    const parser = global.StyleCraftUserCSS;
    if (!parser || typeof parser.parse !== 'function') return sanitizeUserCssState(existingState);
    const parsed = parser.parse(css || '');
    if (!parsed.hasMeta && !parsed.variables.length && !parsed.appliesTo.length) return sanitizeUserCssState(existingState);
    const values = parser.mergeValues(parsed.variables, existingState && existingState.values);
    return {
      meta: parsed.meta,
      variables: parsed.variables,
      values,
      appliesTo: parsed.appliesTo
    };
  }

  function attachUserCssState(out, css, existingState) {
    const usercss = parseUserCssState(css, existingState);
    if (!usercss) return null;
    out.usercss = usercss;
    out.meta = Object.assign({}, usercss.meta || {}, out.meta || {});
    if (usercss.meta && usercss.meta.updateURL && !out.sourceUrl) out.sourceUrl = usercss.meta.updateURL;
    if (usercss.meta && usercss.meta.updateURL && out.meta && !out.meta.sourceUrl) out.meta.sourceUrl = usercss.meta.updateURL;
    if (usercss.appliesTo && usercss.appliesTo.length && !out.appliesTo) out.appliesTo = usercss.appliesTo;
    return usercss;
  }

  function sanitizeAppliesTo(value, path, rejected) {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) {
      addRejected(rejected, path, 'Applies-to rules must be an array.');
      return undefined;
    }
    const out = [];
    value.forEach((rule, index) => {
      const rulePath = path + '[' + index + ']';
      if (!isPlainObject(rule)) {
        addRejected(rejected, rulePath, 'Applies-to rule must be an object.');
        return;
      }
      const type = APPLY_TYPES.has(String(rule.type || '').trim()) ? String(rule.type).trim() : 'domain';
      const ruleValue = typeof rule.value === 'string' ? rule.value.trim() : '';
      if (!ruleValue) {
        addRejected(rejected, rulePath, 'Applies-to rule needs a value.');
        return;
      }
      if (type === 'regexp') {
        try { new RegExp(ruleValue); } catch {
          addRejected(rejected, rulePath, 'Applies-to regexp is invalid.');
          return;
        }
      }
      out.push({ type, value: ruleValue });
    });
    return out.length ? out : undefined;
  }

  function sanitizeTheme(id, theme, path, rejected) {
    if (!isPlainObject(theme)) {
      addRejected(rejected, path, 'Theme entry must be an object.');
      return null;
    }
    const rawCSS = typeof theme.rawCSS === 'string' ? theme.rawCSS : (typeof theme.css === 'string' ? theme.css : '');
    const css = typeof theme.css === 'string' ? theme.css : rawCSS;
    if (!rawCSS && !css) {
      addRejected(rejected, path, 'Theme needs rawCSS or css text.');
      return null;
    }
    const trust = analyzeCssTrust(rawCSS || css);
    if (trust.status === 'blocked') {
      addRejected(rejected, path, 'Blocked CSS: ' + trustSummary(trust));
      return null;
    }
    const out = {
      name: typeof theme.name === 'string' && theme.name.trim() ? theme.name : id,
      css,
      rawCSS,
      enabled: theme.enabled !== false,
      trust
    };
    const meta = sanitizeMeta(theme.meta);
    if (meta) out.meta = meta;
    attachUserCssState(out, rawCSS || css, theme.usercss);
    for (const key of ['source', 'installedAt', 'updatedAt', 'sourceUrl', 'updateUrl']) {
      if (typeof theme[key] === 'string') out[key] = theme[key];
    }
    const preprocessor = sanitizePreprocessor(theme.preprocessor, path + '.preprocessor', rejected);
    if (preprocessor) out.preprocessor = preprocessor;
    return out;
  }

  function sanitizeDomainEntry(domain, entry, rejected) {
    if (!isPlainObject(entry)) {
      addRejected(rejected, domain, 'Domain entry must be an object.');
      return null;
    }

    const out = { themes: {}, customCSS: '', customEnabled: entry.customEnabled !== false };
    if (entry.customCSS !== undefined) {
      if (typeof entry.customCSS === 'string') out.customCSS = entry.customCSS;
      else addRejected(rejected, domain + '.customCSS', 'Custom CSS must be a string.');
    }
    if (out.customCSS.trim()) {
      const trust = analyzeCssTrust(out.customCSS);
      if (trust.status === 'blocked') {
        addRejected(rejected, domain + '.customCSS', 'Blocked CSS: ' + trustSummary(trust));
        out.customCSS = '';
      } else {
        out.trust = trust;
      }
    }
    attachUserCssState(out, out.customCSS, entry.usercss);

    if (entry.themes !== undefined) {
      if (!isPlainObject(entry.themes)) {
        addRejected(rejected, domain + '.themes', 'Themes must be an object keyed by id.');
      } else {
        for (const [themeIdRaw, theme] of Object.entries(entry.themes)) {
          const themeId = cleanKey(themeIdRaw);
          if (!themeId) {
            addRejected(rejected, domain + '.themes.' + themeIdRaw, 'Theme id is empty or unsafe.');
            continue;
          }
          const cleanTheme = sanitizeTheme(themeId, theme, domain + '.themes.' + themeId, rejected);
          if (cleanTheme) out.themes[themeId] = cleanTheme;
        }
      }
    }

    const appliesTo = sanitizeAppliesTo(entry.appliesTo, domain + '.appliesTo', rejected);
    if (appliesTo) out.appliesTo = appliesTo;
    const meta = sanitizeMeta(entry.meta);
    if (meta) out.meta = Object.assign({}, out.meta || {}, meta);
    if (typeof entry.sourceUrl === 'string') out.sourceUrl = entry.sourceUrl;
    const preprocessor = sanitizePreprocessor(entry.preprocessor, domain + '.preprocessor', rejected);
    if (preprocessor) out.preprocessor = preprocessor;

    if (!out.customCSS.trim() && !Object.keys(out.themes).length) {
      addRejected(rejected, domain, 'Domain has no valid custom CSS or themes.');
      return null;
    }
    return out;
  }

  function normalizeStyleData(rawData) {
    if (!isPlainObject(rawData)) throw new Error('Import data must be an object keyed by domain.');
    const rejected = [];
    const data = {};
    let themeCount = 0;

    for (const [domainRaw, entry] of Object.entries(rawData)) {
      const domain = cleanKey(domainRaw);
      if (!domain) {
        addRejected(rejected, domainRaw, 'Domain key is empty or unsafe.');
        continue;
      }
      const cleanEntry = sanitizeDomainEntry(domain, entry, rejected);
      if (!cleanEntry) continue;
      themeCount += Object.keys(cleanEntry.themes || {}).length;
      data[domain] = cleanEntry;
    }

    return {
      data,
      rejected,
      accepted: Object.keys(data).length,
      themeCount
    };
  }

  function extractStyleDataPayload(raw) {
    if (isPlainObject(raw) && isPlainObject(raw.stylecraft_data)) return raw.stylecraft_data;
    if (isPlainObject(raw) && isPlainObject(raw.data)) return raw.data;
    if (isPlainObject(raw) && isPlainObject(raw.styles)) return raw.styles;
    return raw;
  }

  function summarizeMerge(existingData, incomingData, finalData, mode) {
    const beforeKeys = new Set(Object.keys(existingData || {}));
    let added = 0;
    let replaced = 0;
    for (const key of Object.keys(incomingData || {})) {
      if (beforeKeys.has(key)) replaced++;
      else added++;
    }
    return {
      mode,
      added,
      replaced,
      before: beforeKeys.size,
      after: Object.keys(finalData || {}).length
    };
  }

  function mergeStyleData(existingData, incomingData) {
    const merged = cloneJson(existingData);
    for (const [domain, entry] of Object.entries(incomingData || {})) {
      if (!merged[domain]) {
        merged[domain] = entry;
        continue;
      }
      merged[domain] = Object.assign({}, merged[domain], entry, {
        themes: Object.assign({}, merged[domain].themes || {}, entry.themes || {})
      });
    }
    return merged;
  }

  function planStyleDataImport(rawData, existingData, options) {
    const opts = Object.assign({ mode: 'replace', source: 'StyleCraft JSON' }, options || {});
    if (byteLength(rawData) > MAX_IMPORT_BYTES) throw new Error('Import is too large for local storage safety limit.');
    const normalized = normalizeStyleData(rawData);
    if (!normalized.accepted) throw new Error('No valid style entries found; existing data was left unchanged.');
    const mode = opts.mode === 'merge' ? 'merge' : 'replace';
    const finalData = mode === 'merge'
      ? mergeStyleData(existingData || {}, normalized.data)
      : normalized.data;
    if (byteLength(finalData) > MAX_IMPORT_BYTES) throw new Error('Validated import exceeds local storage safety limit.');
    return {
      data: finalData,
      incoming: normalized.data,
      quarantine: makeQuarantine(opts.source, normalized.rejected),
      summary: Object.assign(summarizeMerge(existingData || {}, normalized.data, finalData, mode), {
        accepted: normalized.accepted,
        rejected: normalized.rejected.length,
        themes: normalized.themeCount,
        source: opts.source
      })
    };
  }

  function planNativeImport(raw, existingData, options) {
    return planStyleDataImport(extractStyleDataPayload(raw), existingData, options);
  }

  function makeQuarantine(source, rejected) {
    return {
      source,
      timestamp: new Date().toISOString(),
      rejected: rejected.map(item => ({
        path: item.path,
        reason: item.reason
      }))
    };
  }

  function createPreImportBackup(data, settings, source) {
    return {
      data: cloneJson(data),
      settings: cloneJson(settings),
      timestamp: new Date().toISOString(),
      reason: 'pre-import',
      source
    };
  }

  function addBackup(backups, backup, limit) {
    const list = Array.isArray(backups) ? backups.slice() : [];
    list.unshift(backup);
    while (list.length > (limit || 3)) list.pop();
    return list;
  }

  function sanitizeSettings(value) {
    return isPlainObject(value) ? cloneJson(value) : null;
  }

  global.StyleCraftData = {
    MAX_IMPORT_BYTES,
    normalizeStyleData,
    extractStyleDataPayload,
    planStyleDataImport,
    planNativeImport,
    createPreImportBackup,
    addBackup,
    sanitizeSettings,
    analyzeCssTrust,
    assertCssAllowed
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
