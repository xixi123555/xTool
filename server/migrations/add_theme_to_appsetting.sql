-- 为 appsetting 表添加 theme 字段
-- 执行此 SQL 以添加主题配置支持

ALTER TABLE appsetting 
ADD COLUMN theme VARCHAR(20) DEFAULT 'light' COMMENT '主题配置：light(现有风格)、dark(暗色风格)、colorful(多彩风格)' 
AFTER use_local_data;

