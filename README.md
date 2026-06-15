# 七号今天吃什么 🍽️

群友也能用的「今天吃什么」决策助手。登录后记录忌口、偏好、吃腻了的食物，时段自动适配。

## 快速部署

### 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com)，注册/登录
2. 创建新项目（Free tier 即可）
3. 项目创建后，进入 **SQL Editor**，执行以下 SQL：

```sql
-- 用户偏好表
CREATE TABLE preferences (
  user_id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  忌口 TEXT[] DEFAULT '{}',
  偏好_tags JSONB DEFAULT '{}',
  腻了 TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 食物历史表
CREATE TABLE food_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('pick', 'skip', 'nile', 'keep')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_history_user ON food_history(user_id, created_at DESC);

-- RLS 策略：用户只能读写自己的数据
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences" ON preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own preferences" ON preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own preferences" ON preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own history" ON food_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON food_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2. 启用认证

在 Supabase Dashboard → **Authentication** → **Providers**：
- ✅ 启用 **GitHub**（创建 OAuth App: https://github.com/settings/developers）
- ✅ 启用 **Email**（勾选 Email OTP）

### 3. 配置前端

编辑 `config.js`，填入你的 Supabase 项目 URL 和 anon key（在 Settings → API 中找）。

```js
const SUPABASE_URL = "https://xxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJI...";
```

### 4. 部署到 GitHub Pages

```bash
git init
git add .
git commit -m "七号今天吃什么"
git remote add origin https://github.com/YOUR_USER/qihao-eats.git
git push -u origin main
```

然后在 GitHub 仓库 → Settings → Pages → Source: main branch → Save。

## 本地开发

直接用浏览器打开 `index.html` 即可（需要先在 Supabase 配置好 redirect URL 为 `http://localhost`）。

## 功能

- 🕐 时段自动适配（早餐不吃生冷炸，下午茶推甜食）
- 🚫 忌口管理
- ⭐ 偏好 tag 加权
- 😮‍💨 腻了排除（最近10个不重复）
- 📋 食物历史

## 与七号

食物库和时段规则与七号的后端技能 `persona/qihao-what-to-eat` 完全同步。更新食物库时两边一起改。
