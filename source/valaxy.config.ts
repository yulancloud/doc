import { defineValaxyConfig } from 'valaxy'
import type { ThemePressConfig } from 'valaxy-theme-press'

export default defineValaxyConfig<ThemePressConfig>({
  siteConfig: {
    title: '欲蓝财务',
    description: '欲蓝财务商城官方文档教程',
    url: 'https://doc.yulancloud.us.ci',
    lang: 'zh-CN',
  },
  vite: {
    base: '/',
  },
  theme: 'valaxy-theme-press',
  themeConfig: {
    nav: [
      { text: '部署指南', link: '/deploy' },
      { text: '后台使用', link: '/admin' },
      { text: '欲蓝财务魔方', link: '/yulan' },
      { text: 'Windows APP', link: '/windows-app' },
      { text: '故障排查', link: '/troubleshoot' },
      { text: '开发者', link: '/developer' },
      { text: '常见问题', link: '/faq' },
    ],
    sidebar: {
      '/': [
        {
          text: '开始',
          collapsed: false,
          items: [
            { text: '首页', link: '/' },
            { text: '部署总览', link: '/deploy' },
            { text: '部署前准备', link: '/deploy/prepare' },
            { text: '版本更新', link: '/changelog' },
          ],
        },
        {
          text: '部署指南（按 Web 服务器分）',
          collapsed: false,
          items: [
            { text: 'Nginx 部署 · 需伪静态', link: '/deploy/nginx' },
            { text: 'Apache 部署 · 免伪静态', link: '/deploy/apache' },
            { text: 'PHP 内置服务器 · 本地测试', link: '/deploy/builtin' },
            { text: '安装与升级迁移', link: '/deploy/install' },
            { text: '上线自检清单', link: '/deploy/checklist' },
          ],
        },
        {
          text: '后台使用教程',
          collapsed: false,
          items: [
            { text: '后台总览', link: '/admin' },
            { text: '商品管理', link: '/admin/products' },
            { text: '订单与发货', link: '/admin/orders' },
            { text: '支付配置（易支付）', link: '/admin/payment' },
            { text: '站点设置与其他', link: '/admin/settings' },
          ],
        },
        {
          text: '功能与配套',
          collapsed: false,
          items: [
            { text: '欲蓝财务魔方', link: '/yulan' },
            { text: 'Windows APP', link: '/windows-app' },
            { text: '常见问题', link: '/faq' },
          ],
        },
        {
          text: '开发者 · 定制与配置',
          collapsed: false,
          items: [
            { text: '开发者总览', link: '/developer' },
            { text: '主题定制设置', link: '/developer/theme' },
            { text: 'PHP 配置与文案默认值', link: '/developer/config' },
            { text: '功能自定义 · 学习路线', link: '/developer/custom' },
          ],
        },
        {
          text: '功能自定义教程 · 基础（01–04）',
          collapsed: false,
          items: [
            { text: '01 入门与本地环境', link: '/developer/custom/start' },
            { text: '02 框架结构与请求生命周期', link: '/developer/custom/architecture' },
            { text: '03 基础 API', link: '/developer/custom/api' },
            { text: '04 数据库与迁移', link: '/developer/custom/database' },
          ],
        },
        {
          text: '功能自定义教程 · 实战与进阶（05–09）',
          collapsed: false,
          items: [
            { text: '05 实战：从零做一个功能', link: '/developer/custom/first-feature' },
            { text: '06 后台管理扩展', link: '/developer/custom/admin' },
            { text: '07 前台数据流与交互', link: '/developer/custom/frontend' },
            { text: '08 支付 / 发货 / 商品类型', link: '/developer/custom/payment' },
            { text: '09 安全规范与发布检查', link: '/developer/custom/security' },
          ],
        },
        {
          text: '故障排查',
          collapsed: false,
          items: [
            { text: '排查总览 · 症状速查', link: '/troubleshoot' },
            { text: '部署与迁移故障', link: '/troubleshoot/deploy' },
            { text: '后台与业务故障', link: '/troubleshoot/backend' },
            { text: 'Windows APP 故障', link: '/troubleshoot/app' },
            { text: '域名 / HTTPS / 文档站', link: '/troubleshoot/domain' },
          ],
        },
      ],
    },
    editLink: {
      pattern: 'https://github.com/yulancloud/doc/edit/main/source/:path',
      text: '编辑本页',
    },
    socialLinks: [
      { icon: 'i-ri-github-line', link: 'https://github.com/yulancloud/yulancloud', name: '主仓库' },
      { icon: 'i-ri-github-line', link: 'https://github.com/yulancloud/yulancloudRubik-Windows', name: 'Windows APP' },
    ],
    footer: {
      message: '欲蓝财务 · 文档教程',
      copyright: '由 GitHub Pages 托管',
    },
  },
})
