import config from '@padcom/eslint-config-typescript'

export default [
    ...config['flat/browser'],
    {
        rules: {
            'jsdoc/require-jsdoc': 'off',
        },
    },
]