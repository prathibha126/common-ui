module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "amd": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        "no-eval" : "error",
        "no-implied-eval" : "error",
        "curly" : "error",
        "eqeqeq" : "error",
        "no-extend-native" : "error",
        "radix" : "error",
        "semi" : "error",
        "no-unused-expressions" : "error",
        "no-unmodified-loop-condition" : "error",
        "no-self-compare" : "error",
        "no-script-url" : "error",
        "no-undef-init" : "error",
        "no-use-before-define" : "error",
        "no-loop-func" : "error",
        "no-new" : "error",
        "no-new-func" : "error",
        "no-lone-blocks" : "error",
        "no-eq-null" : "error",
        "no-implicit-globals" : "error",
        "no-caller" : "error",
        "no-iterator" : "error",
        "no-proto" : "error",
        "no-sequences" : "error",
        "no-unused-expressions" : "error",
        "no-shadow-restricted-names" : "error",
        "no-lone-blocks" : "error",
        "comma-dangle" : "error",
        "no-restricted-globals": ["error", "event"],
        "max-lines-per-function" : ["warn", {"max": 500, "skipBlankLines": true}],
        "no-useless-escape" : "warn",
        "no-shadow" : "warn",
        "no-extra-bind" : "warn",
        "dot-notation" : "warn",
        "block-scoped-var" : "warn",
        "no-unused-vars": ["warn", {"args" : "none"}],
        "no-console": "off",
        "no-mixed-spaces-and-tabs": "off",
        "no-irregular-whitespace": "off"
    },
    "globals": {
        "Modernizr" : true
    }
};