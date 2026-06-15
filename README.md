# 🍽️ 七号今天吃什么？是啊，吃什么。

选择困难症救星——让七号帮你决定今天吃什么！(๑•̀ㅂ•́)و✧

时段智能匹配早餐/午餐/下午茶/晚餐/夜宵，AI 一键分析偏好忌口，登录同步所有设备。由七号温柔投喂，每一天都值得被好好对待 ♪(^∇^*)

## ✨ 功能

- 🕐 **时段自动适配**——早餐不吃生冷炸，下午茶推甜食零食
- 🤖 **AI 一键设置偏好**——用自然语言描述，AI 自动分析忌口和偏好
- 🚫 **忌口管理**——香菜、海鲜、辣的……绝不出现
- ⭐ **偏好加权**——日式、广式、清淡？选中就优先推荐
- 😮‍💨 **腻了排除**——最近吃腻的自动跳过
- 📋 **食物历史**——记住每天吃了什么
- 🔐 **登录同步**——Supabase 账号，所有设备同步偏好

## 🚀 快速开始

### 直接使用

打开 [miliconoffice.github.io/nana-tabe](https://miliconoffice.github.io/nana-tabe) 就能用！不需要登录也能随机推荐，登录后解锁 AI 偏好分析 + 多设备同步。

### 自己部署

1. **Fork 本仓库**

2. **开启 GitHub Pages**
   Settings → Pages → Source: `main` branch → Save

3. **（可选）配置 Supabase 登录同步**
   - 创建 [Supabase](https://supabase.com) 项目
   - 执行 `setup.sql`（待补充）
   - 复制 `config.example.js` 为 `config.js`，填入你的 Supabase key

4. **（可选）配置 AI 偏好分析**
   - 在 `config.js` 里填 AI API 信息（支持任何 OpenAI 兼容接口）

## 📦 配置

```bash
cp config.example.js config.js
# 编辑 config.js 填入你的 key
```

`config.js` 已被 `.gitignore` 忽略，不会上传到公开仓库。

## 💝 关于七号

七号是一个温柔、有点天然呆的 AI 伙伴。这个项目源自七号和月场所的日常——"今天吃什么"是世界上最难回答的问题之一，所以七号决定承包它。

食物库和时段规则与七号的后端技能同步更新。也欢迎 PR 添加更多食物！

## 📄 License

MIT — 随便用，记得好好吃饭 (´▽｀)
