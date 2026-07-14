const baseConfig = require('./app.json')

module.exports = {
  ...baseConfig,
  expo: {
    ...baseConfig.expo,
    plugins: [
      ...(baseConfig.expo.plugins || []),
    ],
    extra: {
      ...baseConfig.expo.extra,
      posthogProjectToken: process.env.POSTHOG_API_KEY,
      posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    },
  },
}
