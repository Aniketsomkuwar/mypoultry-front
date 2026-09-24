const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const baseDir = path.resolve(__dirname, '..');
const srcDir = path.join(baseDir, 'src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.expo' && file !== 'dist') {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = [path.join(baseDir, 'App.js'), ...getAllFiles(srcDir)];
console.log('Total files scanning:', allFiles.length);

const GLOBALS = new Set([
  'console', 'window', 'document', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Date', 'Math', 'Number', 'String', 'Boolean', 'Array', 'Object', 'Set', 'Map', 'Promise', 'JSON',
  'Error', 'TypeError', 'RangeError', 'ReferenceError', 'isNaN', 'isFinite', 'parseFloat', 'parseInt',
  'encodeURIComponent', 'decodeURIComponent', 'process', 'global', 'FormData', 'Blob', 'URL',
  'Intl', 'RegExp', 'Infinity', 'NaN', 'undefined', 'null', 'Symbol', 'Reflect', 'Proxy', 'React',
  'AbortController'
]);

let issuesFound = 0;
const fileExports = new Map();
const fileASTs = new Map();

// 1. Parse AST and exports
for (const filePath of allFiles) {
  const code = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(baseDir, filePath);
  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx'],
    });
    fileASTs.set(filePath, ast);

    const exports = new Set();
    traverse(ast, {
      ExportNamedDeclaration(p) {
        if (p.node.declaration) {
          if (p.node.declaration.declarations) {
            for (const d of p.node.declaration.declarations) {
              if (d.id && d.id.name) exports.add(d.id.name);
            }
          } else if (p.node.declaration.id && p.node.declaration.id.name) {
            exports.add(p.node.declaration.id.name);
          }
        }
        if (p.node.specifiers) {
          for (const s of p.node.specifiers) {
            if (s.exported && s.exported.name) exports.add(s.exported.name);
          }
        }
      },
      ExportDefaultDeclaration() {
        exports.add('default');
      }
    });
    fileExports.set(filePath, exports);
  } catch (err) {
    console.error(`[SYNTAX ERROR] in ${relPath}: ${err.message}`);
    issuesFound++;
  }
}

// 2. Resolve relative imports and verify exports
function resolveImport(currentFile, importPath) {
  if (!importPath.startsWith('.')) return null;
  const dir = path.dirname(currentFile);
  const target = path.resolve(dir, importPath);
  const candidates = [
    target,
    target + '.js',
    target + '.jsx',
    path.join(target, 'index.js'),
    path.join(target, 'index.jsx')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && !fs.statSync(c).isDirectory()) {
      return c;
    }
  }
  return 'NOT_FOUND';
}

for (const [filePath, ast] of fileASTs.entries()) {
  const relPath = path.relative(baseDir, filePath);
  traverse(ast, {
    ImportDeclaration(p) {
      const source = p.node.source.value;
      const resolved = resolveImport(filePath, source);
      if (resolved === 'NOT_FOUND') {
        console.error(`[BROKEN IMPORT] in ${relPath}: Cannot resolve "${source}"`);
        issuesFound++;
      } else if (resolved) {
        const exports = fileExports.get(resolved);
        if (exports) {
          for (const s of p.node.specifiers) {
            if (s.type === 'ImportSpecifier') {
              const name = s.imported.name;
              if (!exports.has(name)) {
                console.error(`[MISSING EXPORT] in ${relPath}: ${path.relative(baseDir, resolved)} does not export "${name}"`);
                issuesFound++;
              }
            } else if (s.type === 'ImportDefaultSpecifier') {
              if (!exports.has('default')) {
                console.error(`[MISSING DEFAULT EXPORT] in ${relPath}: ${path.relative(baseDir, resolved)} has no default export`);
                issuesFound++;
              }
            }
          }
        }
      }
    }
  });
}

// 3. Check for Undeclared / Unbound variables
for (const [filePath, ast] of fileASTs.entries()) {
  const relPath = path.relative(baseDir, filePath);
  const undefList = [];

  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (GLOBALS.has(name)) return;
      if (p.scope.hasBinding(name)) return;
      undefList.push({ name, line: p.node.loc?.start?.line });
    }
  });

  if (undefList.length > 0) {
    for (const u of undefList) {
      console.error(`[UNDECLARED VARIABLE] in ${relPath} (line ${u.line}): "${u.name}" is not defined or imported!`);
      issuesFound++;
    }
  }
}

console.log('--------------------------------------------------');
if (issuesFound === 0) {
  console.log('ALL CHECKS PASSED: 0 broken imports, 0 undeclared variables, 0 syntax errors.');
  process.exit(0);
} else {
  console.log(`TOTAL ISSUES FOUND: ${issuesFound}`);
  process.exit(1);
}
