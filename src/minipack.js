const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const {transformFromAst} = require('babel-core');

let ID = 0;

/**
 * 根据文件路径解析文件
 * @param {string} filename 文件路径
 * @returns {Asset} {
 *  id: number, 文件对应id
 *  filename: string, 文件路径
 *  dependencies: Array<string>, 所有依赖路径
 *  code: string, 解析后代码
 * }
 */
function createAsset(filename) {
  // \n 是换行，\r是回车
  // crlf: "\r\n", windows系统的换行方式
  // lf  : "\n",   Linux系统的换行方式
  // 得到该路径文件的内容 回车根据LF or CRLF 转码为 \n or \r\n
  const content = fs.readFileSync(filename, 'utf-8');

  // 构建该路径文件的抽象语法树：包含每个关键词的名称以及开始结束位置
  const ast = babylon.parse(content, {
    sourceType: 'module',
  });

  // 依赖路径字符串数组
  const dependencies = [];

  // 根据语法树获得依赖路径字符串
  traverse(ast, {
    ImportDeclaration: ({node}) => {
      dependencies.push(node.source.value); // 路径
    },
  });

  // console.log(dependencies);

  // counter ID 表示依赖文件唯一性
  // 这里并没有对解析过的依赖作处理
  const id = ID++;

  // 通过 Babel 把语法树生成可执行代码的形式
  // 对于模块导出 并判断是不是 export default
  const {code} = transformFromAst(ast, null, {
    presets: ['env'],
  });

  // console.log(code, '\n');

  // 返回该模块的所有信息
  return {
    id,
    filename,
    dependencies,
    code,
  };
}

/**
 * 从入口文件开始，构建整个应用的依赖关系图
 * @param {string} entry  入口文件路径
 * @returns {Array<Asset>} 所有依赖及其关系
 */
function createGraph(entry) {
  // Start by parsing the entry file.
  const mainAsset = createAsset(entry);

  // 队列数组包装
  const queue = [mainAsset];

  // for of 迭代 Asset对象 数组
  for (const asset of queue) {
    // 初始依赖映射关系
    asset.mapping = {};

    // 获取文件所在目录
    const dirname = path.dirname(asset.filename);

    // 迭代查询依赖
    asset.dependencies.forEach(relativePath => {

      // 根据 模块路径 和 import路径 生成其依赖模块的绝对路径
      const absolutePath = path.join(dirname, relativePath);

      // console.log(dirname, relativePath, absolutePath);

      // 对依赖模块解析
      const child = createAsset(absolutePath);

      // 标记依赖的ID，即 key 值
      asset.mapping[relativePath] = child.id;

      // 孩子入队 继续迭代 直到队列处理完（无新增Asset）
      // 即处理完应用的所有依赖关系
      queue.push(child);
    });
  }
  // 返回所有解析过的依赖模块，数组形式包含相互依赖关系
  return queue;
}

/**
 * 根据依赖关系打包生成该应用的可执行代码
 * @param {Array<Asset>} graph  所有依赖及其关系图
 */
function bundle(graph) {
  let modules = '';

  graph.forEach(mod => {
    // 对每个模块函数式封装，避免污染
    // 并注入依赖
    modules += `
      ${mod.id}: [
        function (require, module, exports) {
          ${mod.code}
        },
        ${JSON.stringify(mod.mapping)},
      ],`
    ;
  });

  const result = `
    (function(modules) {
      function require(id) {
        // 提取对应依赖的 function 和 mapping 如上
        const [fn, mapping] = modules[id];

        function localRequire(name) {
          // 依赖解析
          return require(mapping[name]);
        }

        // 默认导出 为空对象
        const module = { exports : {} };

        // 递归require，依次得到依赖的exports结果
        fn(localRequire, module, module.exports);

        // 返回exports 通过递归最终会返回模块所有结果
        return module.exports;
      }

      // 从入口开始 id: 0
      require(0);
    })({${modules}})
  `; // 打包

  return result;
}

/**
 * readFile
 * @param {*} fd  文件标识符
 * @param {*} data
 */
function writeData(fd, data) {
  fs.writeFile(fd, data, 'utf8', err => {
    if (err) throw err;
    console.log('minipack is OK! saved in "root/dist/dist.js"');
    console.log('you can run it!  Expected Output:');
    console.log('\nhello world!\nworld');
  });
}

/**
 * 将result 写入到 dist/dist.js 文件
 * @param {string} data
 */
function writeDist(data) {
  // 路径有文件夹不存在，不能自动创建该文件夹吗？必须手动mkdir
  // 我不确定是否有对应的API  nodejs v8.11.0
  fs.mkdir('./dist', err => {
    if (err) {
      if (err.code !== 'EEXIST') {
        console.log(err);
        return;
      }
    }

    // test in Windows  覆盖写入
    fs.open('./dist/dist.js', 'w+', 0o777, (err, fd) => {
      if (err) {
        console.log(err);
        return;
      }

      writeData(fd, data);
    });
  });
}

const graph = createGraph('./example/entry.js');
const result = bundle(graph);

console.log(result);

writeDist(result);
