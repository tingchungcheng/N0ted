/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'NotedWidget',
  displayName: 'Nōted',
  deploymentTarget: '17.0',
  colors: {
    $widgetBackground: '#6F8597',
    $accent: '#F3EFE7',
  },
  images: {
    bg_calm: '../../assets/bg/bg_calm.jpg',
    bg_historical: '../../assets/bg/bg_historical.jpg',
    bg_inspiring: '../../assets/bg/bg_inspiring.jpg',
    bg_love: '../../assets/bg/bg_love.jpg',
    bg_wit: '../../assets/bg/bg_wit.jpg',
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
