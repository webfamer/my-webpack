const path = require("path");
const fs = require("fs");
const {getAST,getDependencies,transform} = require("./parser")
module.exports = class Compiler{
    // 接收通过lib/index.js new Compiler(options).run()传入的参数，对应`forestpack.config.js`的配置
    constructor(options){
        const {entry,output} = options;
        this.entry = entry;
        this.output = output;
        this.modules = []
    }
    //开启编译
    run(){
        const entryModule = this.buildModule(this.entry,true);
        this.modules.push(entryModule)
        this.modules.map((_module)=>{
            _module.dependencies.map((dependency)=>{
                this.modules.push(this.buildModule(dependency));
            })
        })
        //console.log(this.modules);
        this.emitFiles();
    }
    //构建模块相关
    buildModule(filename,isEntry){
        //filename:文件名称
        //isEntry:是否是入口文件
        let ast;
        if(isEntry){
            ast = getAST(filename)
        }else{
            const absolutePath = path.join(process.cwd(),"./src",filename);
            ast = getAST(absolutePath)
        }
        return {
            filename,//文件名称
            dependencies:getDependencies(ast),//依赖列表
            transformCode:transform(ast),//转化后的代码
        }
    }
    //输出文件
    emitFiles(){
        const outputPath = path.join(this.output.path,this.output.filename);
        let modules = "";
        this.modules.map((_module)=>{
            modules +=`'${_module.filename}':function(require,module,exports) {${_module.transformCode}},`
        })

        const bundle = `
        (function(modules){
            function require(fileName){
                const fn = modules[fileName];
                const module = {exports:{}};
                fn(require,module,module.exports)
                return module.exports
            }
            require('${this.entry}')
        })({${modules}})`;
        fs.writeFileSync(outputPath,bundle,"utf-8")
    }
}