module.exports = {
    apps: [{
        name: 'X5GON_platform',
        script: 'platform.js',
        cwd: './src/server/platform/',
        env: {
            NODE_ENV: 'dev',
        },
        env_production: {
            NODE_ENV: 'prod'
        },
        instances: '4',
        exec_mode: 'cluster',
        autorestart: true,
        max_restarts: 20
    }, {
        name: 'X5GON_recommender_engine',
        script: 'recsys.js',
        cwd: './src/server/recsys/',
        env: {
            NODE_ENV: 'dev',
        },
        env_production: {
            NODE_ENV: 'prod'
        },
        instances: '1',
        exec_mode: 'cluster',
        autorestart: true,
        max_restarts: 10
    }]
};
