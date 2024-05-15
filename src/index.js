import {App} from "./App.js";
import {tokenize} from "../framework/internal/tokenizer.js";
import {parseComponentChild} from "../framework/internal/component-parser.js";

// const root = document.getElementById('root');
// Serianilla.render(root, App);

const {imports, template, attach} = App();
const tokens = tokenize(template);
console.log('tokens:', tokens);

const ast = parseComponentChild(tokens)
console.log('ast:', ast);