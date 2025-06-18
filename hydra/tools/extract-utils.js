// build/extract-utils.js
import * as parser from '@babel/parser';
import * as fs from 'fs';
import * as path from 'path';
import * as t from '@babel/types';
import traverseDefault from '@babel/traverse';
import generatorDefault from '@babel/generator';
import jsBeautify from 'js-beautify';

const traverse = traverseDefault.default || traverseDefault;
const generator = generatorDefault.default || generatorDefault;
const beautify = jsBeautify.js;

const HYDRATION_MARKER = '//@hydrate';

/**
 * Scans a directory recursively for files containing the hydration marker
 * @param {string} dir - Directory to scan
 * @returns {Array} Array of file paths that contain the hydration marker
 */
export function scanForHydratedFiles(dir) {
  const hydratedFiles = [];

  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(HYDRATION_MARKER)) {
          hydratedFiles.push(fullPath);
        }
      }
    }
  }

  scanDirectory(dir);
  return hydratedFiles;
}

function convertHydrateString(inputStr) {
  const regex = /^@hydrate\({payload:\{(.*?)\}\}\)$/;
  const match = inputStr.match(regex);
  if (match && match[1] !== undefined) {
    return match[1];
  } else {
    return '';
  }
}

export function extractHandlers(outputPath, config, blocks) {
  const { entry } = config;
  const code = fs.readFileSync(entry, 'utf-8');
  let hydrationRuntime = fs.readFileSync('tools/hydration-runtime.js', 'utf-8');
  const ast = parser.parse(code, { sourceType: 'module', ranges: true, locations: true });
  const parts = entry.split('/');
  const lastTwoParts = parts.slice(-2).join('/');
  const dependencies = new Set();
  const componentHandlers = new Set();
  const importNodes = new Set();
  const hydrationCode = [];
  const extractedNodes = new Set();
  const processedDependencies = new Set();
  const globalVariables = new Set();

  const classHydrateBlocks = [];
  const nonClassHydrateBlocks = [];
  const hydratedClasses = new Map(); // key = classStartLine, value = { baseClassName, newClassName, blocks: [] }

  const classDependencies = new Set();
  const processedClassDependencies = new Set();
  const extractedClassMethods = new Set();
  const hydrateMethodNames = new Set();
  traverse(ast, {
  enter(path) {
    // 1. Gather all possible comments for this node
const comments =
  (path.node.leadingComments || [])
    .concat(
      path.node.declaration && path.node.declaration.leadingComments
        ? path.node.declaration.leadingComments
        : []
    );

// 2. Try to find the hydrate.class comment
let classComment = comments.find(c => c.value.trim().startsWith('@hydrate.class'));
let classNode = null;

// 3. If not found, check if this is a ClassDeclaration and look for unattached comments in the AST root
if (!classComment && path.isClassDeclaration() && path.parentPath && path.parentPath.parent && path.parentPath.parent.comments) {
  // Try to find a comment that ends just before this class starts
  const classStart = path.node.loc.start.line;
  classComment = path.parentPath.parent.comments.find(
    c => c.value.trim().startsWith('@hydrate.class') && c.loc.end.line === classStart - 1
  );
}

// 4. Identify the class node
if (classComment) {
  if (path.isClassDeclaration()) {
    classNode = path.node;
  } else if (
    path.isExportNamedDeclaration() &&
    path.node.declaration &&
    path.node.declaration.type === 'ClassDeclaration'
  ) {
    classNode = path.node.declaration;
  }

  if (classNode) {
    const classHydrateRegex = /^@hydrate\.class\((\w+),\s*\{[\s\S]*?className:\s*["'](\w+)["']\s*\}\)/;
    const match = classHydrateRegex.exec(classComment.value.trim());
    if (match) {
      const baseClassName = match[1];
      const newClassName = match[2];
      const classStartLine = classNode.loc.start.line;

      hydratedClasses.set(classStartLine, {
        baseClassName,
        newClassName,
        blocks: [],
      });
    }
  }
}

    //const hydrateComment = comments.find(c => c.value.trim().startsWith('@hydrate'));
    const hydrateComment = comments.find(c =>
  /^\s*@hydrate\s*\(\s*\{[\s\S]*?\}\s*\)\s*$/.test(c.value.trim())
);
    if (hydrateComment) {
      const lineNumber = path.node.loc?.start?.line || 0;
      const extractedPayload = convertHydrateString(hydrateComment.value);
      //const hydrateCode = `(${extractedPayload}) => {${generator(path.node, { comments: false }).code}}`;
//const hydrateCode = `(payload) => { payload = { ...payload, ${extractedPayload}, id: ${lineNumber} }; ${generator(path.node, { comments: false }).code} }`;
const hydrateCode = `({${extractedPayload}}) => {${generator(path.node, { comments: false }).code}}`;
      const parentClass = path.findParent(p => p.isClassBody());
      if (parentClass) {
        const classNode = parentClass.parentPath.node;
        const classStartLine = classNode.loc.start.line;
            if (hydratedClasses.has(classStartLine)) {
      const blk = { code: hydrateCode, id: lineNumber };
      //console.log(` Hydrate block added to class starting on line ${classStartLine}:`, blk);
      hydratedClasses.get(classStartLine).blocks.push(blk);
      classHydrateBlocks.push(blk); // <--- ADD THIS LINE
    }

      } else if (!path.isClassDeclaration()) {

        //nonClassHydrateBlocks.push({ code: hydrateCode, id: lineNumber });
        const blk = { code: hydrateCode, id: lineNumber };

  //console.log(`💡 Non-class hydrate block on line ${lineNumber}:`, blk);

  nonClassHydrateBlocks.push(blk);

      }

      path.traverse({
        Identifier(innerPath) {
          dependencies.add(innerPath.node.name);
        },
                  MemberExpression(innerPath) {
            if (
              t.isThisExpression(innerPath.node.object) &&
              t.isIdentifier(innerPath.node.property)
            ) {
              classDependencies.add(innerPath.node.property.name);
            }
          }
        });

        hydrateMethodNames.add(path.node.key?.name);
      }
    // Clean comments
    if (path.node.leadingComments) {
      path.node.leadingComments = path.node.leadingComments.filter(comment =>
        !/^\s*@hydrate(\.class)?/.test(comment.value) && comment.value.trim() !== '@end'
      );
    }

    if (path.node.trailingComments) {
      path.node.trailingComments = path.node.trailingComments.filter(comment =>
        !/^\s*@hydrate(\.class)?/.test(comment.value) && comment.value.trim() !== '@end'
      );
    }

    if (path.isVariableDeclarator() && path.parentPath.parentPath.isProgram()) {
      globalVariables.add(path.node.id.name);
    }

  }
});

let previousClassDepSize;
do {
  previousClassDepSize = classDependencies.size;
  const currentDeps = Array.from(classDependencies);

  currentDeps.forEach(depName => {
    if (processedClassDependencies.has(depName)) return;
    processedClassDependencies.add(depName);

    traverse(ast, {
      // ✅ Handle traditional class methods
      ClassMethod(path) {
        if (path.node.key.name === depName) {
          classDependencies.add(path.node.key.name);

          path.traverse({
            Identifier(innerPath) {
              dependencies.add(innerPath.node.name);
            },
            MemberExpression(innerPath) {
              if (
                t.isThisExpression(innerPath.node.object) &&
                t.isIdentifier(innerPath.node.property)
              ) {
                classDependencies.add(innerPath.node.property.name);
              }
            }
          });

          extractedClassMethods.add(path.node);
        }
      },

      // ✅ Handle arrow functions assigned as class properties
      ClassProperty(path) {
        if (
          t.isIdentifier(path.node.key) &&
          path.node.key.name === depName &&
          t.isArrowFunctionExpression(path.node.value)
        ) {
          classDependencies.add(path.node.key.name);

          path.traverse({
            Identifier(innerPath) {
              dependencies.add(innerPath.node.name);
            },
            MemberExpression(innerPath) {
              if (
                t.isThisExpression(innerPath.node.object) &&
                t.isIdentifier(innerPath.node.property)
              ) {
                classDependencies.add(innerPath.node.property.name);
              }
            }
          });

          extractedClassMethods.add(path.node); // or extractedClassProperties
        }
      }
    });
  });
} while (classDependencies.size > previousClassDepSize);

  let previousSize;
  do {
    previousSize = dependencies.size;
    const currentDeps = Array.from(dependencies);

    currentDeps.forEach(depName => {
      if (processedDependencies.has(depName)) return;
      processedDependencies.add(depName);

      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id.name === depName) {
            path.traverse({
              Identifier(innerPath) {
                dependencies.add(innerPath.node.name);
              }
            });
          }
        },

        VariableDeclarator(path) {
          if (
            path.node.id.name === depName &&
            path.parentPath.parentPath.isProgram() && path.node.init &&
            (path.node.init.type === 'FunctionExpression' ||
              path.node.init.type === 'ArrowFunctionExpression')
          ) {
            path.traverse({
              Identifier(innerPath) {
                dependencies.add(innerPath.node.name);
              }
            });
          }
        }
      });
    });
  } while (dependencies.size > previousSize);

  traverse(ast, {
    ImportDeclaration(path) {
  if (path.node.specifiers.some(spec => dependencies.has(spec.local.name))) {
    const sourcePath = path.node.source.value;
    if (sourcePath.startsWith('./')) {
      // Rewrite import path from './abc/xyz.js' to '../global-navigation/abc/xyz.js'
      const transformedPath = sourcePath.replace(/^\.\//, `../${lastTwoParts.split('/')[0]}/`);
      path.node.source.value = transformedPath;
    }
    importNodes.add(path.node);
  }
}
,
    FunctionDeclaration(path) {
      if (dependencies.has(path.node.id.name)) {
        extractedNodes.add(path.node);
      }
    },
    VariableDeclaration(path) {
      path.node.declarations.forEach(declaration => {
        if (
          t.isIdentifier(declaration.id) &&
          dependencies.has(declaration.id.name) &&
          globalVariables.has(declaration.id.name)
        ) {
          extractedNodes.add(path.node);
        }
      });
    },
  });




// Merge hydrate blocks
const hydrateBlocks = [...classHydrateBlocks, ...nonClassHydrateBlocks];
blocks[lastTwoParts] = blocks[lastTwoParts] || [];
blocks[lastTwoParts].push(...hydrateBlocks);

// Map of function IDs to code
const classBlockIds = new Set();
const classCustomSnippets = {
  Gnav: `const x = document.querySelector('header').getAttribute('data-feds');`,
  Footer: `const x = document.querySelector('footer');`,
  // Add more mappings here if needed
};

// ⬇️ Inject customParseWithDomAndClasses if class hydration exists
const runtimeInjectionMap = {};
// --- CLASS BLOCK HANDLING ---
for (const { baseClassName, newClassName, blocks } of hydratedClasses.values()) {
  runtimeInjectionMap[baseClassName] = newClassName;
  const seen = new Set();
  const methodBlocks = blocks
    .filter(blk => {
      if (seen.has(blk.id)) return false;
      seen.add(blk.id);
      classBlockIds.add(blk.id);
      return !blk.code.includes('class ');
    })
    .map(blk => {
      const functionMatch = blk.code.match(/^function\s+(\w+)\((.*?)\)\s*\{([\s\S]*)\}$/);
      if (functionMatch) {
        const [_, name, args, body] = functionMatch;
        return `${name}(${args}) {\n  ${body.replace(/\n/g, '\n  ')}\n}`;
      }

      const arrowMatch = blk.code.match(/^\(\{?(.*?)\}?\)\s*=>\s*\{([\s\S]*)\}$/);
      if (arrowMatch) {
        const [_, args, body] = arrowMatch;
        return `_${blk.id}({${args.trim()}}) {\n  ${body.replace(/\n/g, '\n  ')}\n}`;
      }

      return '';
    })
    .filter(Boolean);

  const extraClassMethods = Array.from(extractedClassMethods).filter(
    method => !hydrateMethodNames.has(method.key.name)
  );

  const methodASTNodes = methodBlocks.map(m =>
    parser.parseExpression(`class X { ${m} }`).body.body[0]
  );

  const hydratedClass = t.classDeclaration(
    t.identifier(newClassName),
    t.identifier(baseClassName),
    t.classBody([...methodASTNodes, ...extraClassMethods]),
    []
  );
 const injectedSnippet = classCustomSnippets[baseClassName] || '';
  const classCode = `
import {${baseClassName}} from '../${lastTwoParts}';
${injectedSnippet}
${generator(hydratedClass).code}
`;

  hydrationCode.push(beautify(classCode, { indent_size: 2 }) + '\n');
}

// --- NON-CLASS BLOCK HANDLING ---
const filteredNonClassHydrateBlocks = nonClassHydrateBlocks.filter(blk => !classBlockIds.has(blk.id));
//console.log("Filtered Non-Class Hydrate Blocks:", filteredNonClassHydrateBlocks.length);
function injectRuntimeInitialization(runtimeCode, classMap) {
  const injectionLines = Object.entries(classMap).map(([base, derived]) => {
    return `  "${base}": {\n    type: ${base},\n    inh: ${derived}\n  }`;
  });
  if (injectionLines.length === 0) return runtimeCode;
  const injectionCode = `const obj = window.customParseWithDomAndClasses(x, {\n${injectionLines.join(',\n')}\n});\n`;
  const match = runtimeCode.match(/export function hydrateDynamically\s*\([^)]*\)\s*\{/);
  if (!match) {
    console.error("hydrateDynamically function signature not found!");
    return runtimeCode;
  }

  const insertIndex = match.index + match[0].length;

  // Insert the injection code right after the function declaration's opening brace
  return (
    runtimeCode.slice(0, insertIndex) +
    '\n' +
    injectionCode +
    runtimeCode.slice(insertIndex)
  );
}
hydrationRuntime = injectRuntimeInitialization(hydrationRuntime, runtimeInjectionMap);

if (filteredNonClassHydrateBlocks.length > 0) {
  const hydrateFunctionNames = new Set();
  filteredNonClassHydrateBlocks.forEach(blk => {
    const match = blk.code.match(/function\s+(\w+)/);
    if (match) hydrateFunctionNames.add(match[1]);
  });

  const filteredExtractedNodes = Array.from(extractedNodes).filter(node => {
    if (t.isFunctionDeclaration(node)) {
      return !hydrateFunctionNames.has(node.id.name);
    }
    return true;
  });

  //const nonClassfnsArr = filteredNonClassHydrateBlocks.map(blk => `_${blk.id}: ${blk.code}`);
const nonClassfnsArr = filteredNonClassHydrateBlocks.map(blk => {
  const containsAwait = blk.code.includes('await');
  const updatedCode = containsAwait
    ? blk.code.replace(/^(\s*)\(\s*\{/, '$1async ({') // Insert async before arrow function if needed
    : blk.code;
  return `_${blk.id}: ${updatedCode}`;
});


  const nonClassCode = `
${generator(t.program([...importNodes, ...filteredExtractedNodes])).code}
const hydrationToken = "${lastTwoParts}";
const hydrationBlocks = {
  ${nonClassfnsArr.join(',\n  ')}
};
${hydrationRuntime}
;`;

  hydrationCode.push(beautify(nonClassCode, { indent_size: 2 }));
} else {
  const extractedCode = generator(t.program([...importNodes, ...extractedNodes])).code;
  hydrationCode.push(
    beautify(
`${extractedCode}
const hydrationToken = "${lastTwoParts}";
${hydrationRuntime}
`, { indent_size: 2 })
  );
}

// --- CLEANING FINAL OUTPUT ---
const cleanedOutput = hydrationCode.join('\n')
  .replace(/\/\/\s*@hydrate(\.class)?\([^)]*\)\n?/g, '')
  .replace(/\/\/\s*@end\n?/g, '');

fs.writeFileSync(outputPath, beautify(cleanedOutput, { indent_size: 2 }));
}

/**
 * Process all hydrated files in a directory
 * @param {string} sourceDir - Directory containing files to process
 * @param {string} outputDir - Directory to output processed files
 * @param {object} blocks - Storage for block data
 */
export function processHydratedFiles(sourceDir, outputDir, blocks) {
    const hydratedFiles = scanForHydratedFiles(sourceDir);
    console.log(`Found ${hydratedFiles.length} files with hydration markers`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    hydratedFiles.forEach(file => {
        const relativePath = path.relative(sourceDir, file);
        const outputPath = path.join(outputDir, `${path.basename(file, '.js')}-hydrate.js`);
        extractHandlers(outputPath, { entry: file }, blocks);
        console.log(`Processed: ${relativePath}`);
    });
}