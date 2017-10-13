module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "globals": {
        "inputParameters": true,
        "require": true,
        "ConfigParams": true,
        "BUILD_VERSION": true,
        "BUILD_TIME": true,
        "define": true,
        "module": true,
        "process": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 8,
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true,
            "experimentalObjectRestSpread": true
        }
    },
    "plugins": [
        "react"
    ],
    "rules": {
        "react/jsx-uses-react": [
            "error"
        ],
        "react/jsx-uses-vars": [
            "error"
        ],
        "no-redeclare": [
            "error"
        ],
        "no-unused-vars": [
            "error"
        ],
        "no-console": [
            "off"
        ],
        "no-unreachable": [
            "error"
        ],
        "no-empty": [
            "error"
        ],
        "indent": [ // два пробела
            "error",
            2,
            { "SwitchCase": 1, "MemberExpression": 1 }
        ],
        "quotes": [ // одиночные кавычки
            "error",
            "single"
        ],
        "semi": [ // всегда точка с запятой
            "error",
            "always"
        ],
        "curly": [ // if for и тд, всегда в фигурных скобках
            "error",
            "all"
        ],
        "brace-style": [ // открывающая скобка блока на той же строке, что и if for и тд
            "error",
            "1tbs"
        ],
        "no-multi-spaces": [ // только 1 пробел в выражениях
            "error"
        ],
        "space-before-blocks": [ // любое выражение всегда разделает пробел
            "error",
            "always"
        ],
        "space-before-function-paren": [
            "error",
            "never"
        ],
        "space-infix-ops": [
            "error"
        ],
        "space-unary-ops": [
            "error"
        ],
        "comma-spacing": [
            "error",
            { "before": false, "after": true }
        ],
        "key-spacing": [
            "error", { "afterColon": true }
        ],
        "keyword-spacing": [
            "error",
            { "before": true }
        ],
        "arrow-spacing": [
            "error",
            { "before": true, "after": true }
        ],
        "eqeqeq": [ // только строгое сравнение
            "error"
        ],
        "prefer-const": [ // предпочтительнее использовать const
            "error"
        ],
        "no-var": [ // запрещен var
            "error"
        ],
        "guard-for-in": [ // всегда hasOwnProperty
            "error"
        ]
        /*"newline-per-chained-call": [ // цепочки вызовов начинаются с новой строки
            "warn",
            { "ignoreChainWithDepth": 1 }
        ]*/
    }
};
